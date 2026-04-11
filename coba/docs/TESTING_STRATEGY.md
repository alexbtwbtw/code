# COBA Testing Strategy

**Date:** 2026-04-11
**Status:** Draft — no tests exist yet in the codebase

---

## 0. Current State

Zero test files exist anywhere in the monorepo. Neither `backend/package.json` nor `frontend/package.json` declares any test framework dependency. The backend has no Vitest/Jest config; the frontend has Vite (which bundles Vitest-compatible test infrastructure) but no `vitest` or `@testing-library` package. All testing tooling must be installed.

### Architecture After Refactor

The codebase has been significantly layered since this strategy was first drafted. Key structural changes:

**Backend** — four distinct layers now exist:
- `backend/src/types/<domain>.ts` — `Raw*` types (snake_case DB rows) and `map*()` pure functions (e.g. `mapProject`, `mapMember`). Pure functions with no side effects — ideal for unit tests.
- `backend/src/schemas/<domain>.ts` — Zod schemas and domain constants (e.g. `CreateProjectSchema`, `ProjectStatusSchema`). Validation edge cases testable in isolation.
- `backend/src/services/<domain>.ts` — all business logic and DB queries (e.g. `listProjects()`, `getProjectById()`). The real logic layer; primary unit test target.
- `backend/src/db/client.ts`, `db/schema.ts`, `db/statements/<domain>.ts`, `db/index.ts` — split DB layer. Prepared statements live in `db/statements/`.
- `backend/src/router/<domain>.ts` — thin tRPC procedures only; delegate immediately to services. Barely needs direct testing.

**Frontend** — also layered:
- `frontend/src/api/<domain>.ts` — custom React Query hooks per domain. Primary frontend unit test target (via `renderHook`).
- `frontend/src/constants/` — `projects.ts`, `geo.ts`, `structures.ts`, `tasks.ts` — pure lookup objects, no test needed unless logic is added.
- `frontend/src/utils/format.ts` — `fmt`, `fmtDate`, `fmtDim`, `initials` — pure functions, easy to unit test.
- `frontend/src/utils/download.ts` — `downloadCv` — side-effect function; test with mocked `URL.createObjectURL`.
- `frontend/src/types/pages.ts` — `Page` union type, `pageToPath()`, `pathToPage()`.
- `frontend/src/types/suggestions.ts` — `Suggestion` type.
- `frontend/src/components/shared/` — `GeoSection`, `StructureSection`, `Field` — shared UI components.
- Views in `frontend/src/views/` are now slim wrappers that import from `api/`, `constants/`, `utils/`, and `components/shared/`.

---

## 1. Stack & Tooling Recommendations

### 1.1 Backend — Vitest

**Recommended framework:** [Vitest](https://vitest.dev/) v2.x

Rationale: matches TypeScript natively without a Babel transform, supports ESM, has first-class mocking via `vi.mock()` / `vi.spyOn()`, and runs in the same process as `tsx` watch mode. Jest would require extra CJS/ESM shim work for the `@anthropic-ai/sdk` module.

**Installation (backend):**
```bash
cd backend
npm install --save-dev vitest @vitest/coverage-v8
```

**`backend/vitest.config.ts`:**
```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
```

**`backend/package.json` scripts to add:**
```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage"
```

### 1.2 Frontend — Vitest + React Testing Library

**Recommended frameworks:** Vitest + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) + `jsdom`

**Installation (frontend):**
```bash
cd frontend
npm install --save-dev vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom
```

**`frontend/vite.config.ts` — extend `test` block:**
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/__tests__/setup.ts'],
  coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
}
```

### 1.3 E2E — Playwright

**Installation (root):**
```bash
npm install --save-dev playwright @playwright/test
npx playwright install chromium
```

**`playwright.config.ts` at repo root:**
```ts
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

### 1.4 Database Strategy for Tests

The backend uses an **in-memory SQLite** database (`new Database(':memory:')`). The DB singleton is initialised in `backend/src/db/client.ts` and the schema DDL is applied in `backend/src/db/schema.ts`. Prepared statements live in `backend/src/db/statements/<domain>.ts`. The barrel `backend/src/db/index.ts` re-exports everything with the schema side-effect import.

Each test module imports `db` from `backend/src/db` (or `backend/src/db/client`) and the schema is created fresh at import time — but because `db` is a module singleton, tests must reset state between cases.

**Recommended reset approach:** Export a `resetDb` helper from `backend/src/__tests__/setup.ts` that runs `DELETE FROM <table>` for every table in FK-safe order (children before parents):

```ts
// backend/src/__tests__/setup.ts
import { db } from '../db'
import { beforeEach } from 'vitest'

export function resetDb() {
  // Delete in reverse dependency order
  db.exec(`
    DELETE FROM task_comments;
    DELETE FROM task_assignments;
    DELETE FROM tasks;
    DELETE FROM member_history_features;
    DELETE FROM member_history_structures;
    DELETE FROM member_history_geo;
    DELETE FROM member_history;
    DELETE FROM member_cvs;
    DELETE FROM project_team;
    DELETE FROM project_features;
    DELETE FROM structures;
    DELETE FROM geo_entries;
    DELETE FROM requirements;
    DELETE FROM requirement_books;
    DELETE FROM projects;
    DELETE FROM team_members;
  `)
}

beforeEach(() => resetDb())
```

Because the seed modules (`backend/src/seed/`) run at server startup (not at import of `db`), tests get a blank database unless they explicitly seed it. This is the correct default.

**Test fixtures** (shared helpers for creating records). Note: fixtures should call the prepared statements directly from `backend/src/db/statements/<domain>` to avoid testing through the service layer in setup code:

```ts
// backend/src/__tests__/fixtures.ts
import { db } from '../db'

export function createProject(overrides = {}) {
  const defaults = {
    ref_code: 'TEST-001', name: 'Test Project', client: 'Client A',
    macro_region: 'EMEA', country: 'Portugal', place: 'Lisbon',
    category: 'transport', status: 'active',
    start_date: '2024-01-01', end_date: null,
    budget: 100000, currency: 'EUR',
    project_manager: 'PM Name', team_size: 5,
    description: 'A test project', tags: 'test,vitest',
  }
  const r = db.prepare(`INSERT INTO projects (ref_code,name,client,macro_region,country,place,category,status,start_date,end_date,budget,currency,project_manager,team_size,description,tags) VALUES (@ref_code,@name,@client,@macro_region,@country,@place,@category,@status,@start_date,@end_date,@budget,@currency,@project_manager,@team_size,@description,@tags)`)
    .run({ ...defaults, ...overrides })
  return db.prepare(`SELECT * FROM projects WHERE id = ?`).get(r.lastInsertRowid) as { id: number; [k: string]: unknown }
}

export function createMember(overrides = {}) { /* ... */ }
export function createTask(projectId: number, overrides = {}) { /* ... */ }
export function createBook(overrides = {}) { /* ... */ }
```

---

## 2. Backend Unit Tests

### 2.1 New Layers — Independent Unit Tests

The refactored backend exposes three layers that can each be tested independently before touching the service layer.

#### 2.1a Types / map\*() Functions (`backend/src/types/<domain>.ts`)

These are pure functions with no dependencies — the easiest wins in the entire test suite.

| File | Functions to test |
|------|------------------|
| `types/projects.ts` | `mapProject(rawRow)` — verifies snake_case → camelCase, null passthrough, numeric coercion |
| `types/team.ts` | `mapMember()`, `mapHistory()`, `mapHistoryGeo()`, `mapHistoryStructure()`, `mapHistoryFeature()` |
| `types/tasks.ts` | `mapTask()`, `mapComment()` |
| `types/geo.ts` | `mapGeoEntry()` — nullable lat/lng handled correctly |
| `types/structures.ts` | `mapStructure()` — nullable geo coords |
| `types/features.ts` | `mapFeature()` |
| `types/requirements.ts` | `mapBook()`, `mapRequirement()` |

**Pattern:**
```ts
// backend/src/__tests__/types/projects.test.ts
import { mapProject } from '../../types/projects'

const rawRow = {
  id: 1, ref_code: 'P-001', name: 'Test', client: 'Client',
  macro_region: 'EMEA', country: 'Portugal', place: 'Lisbon',
  category: 'transport', status: 'active',
  start_date: '2024-01-01', end_date: null,
  budget: 150000, currency: 'EUR',
  project_manager: 'Alice', team_size: 3,
  description: 'desc', tags: 'foo',
  created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
}

it('maps snake_case DB row to camelCase', () => {
  const p = mapProject(rawRow)
  expect(p.refCode).toBe('P-001')
  expect(p.macroRegion).toBe('EMEA')
  expect(p.endDate).toBeNull()
  expect(p.budget).toBe(150000)
})
```

These tests require zero DB setup and run in milliseconds.

#### 2.1b Zod Schemas (`backend/src/schemas/<domain>.ts`)

Test validation edge cases: required fields, enum values, defaults, coercion.

| Schema | Key cases |
|--------|-----------|
| `CreateProjectSchema` | Missing `refCode` throws; invalid `category` enum throws; `status` defaults to `'planning'` |
| `ProjectStatusSchema` | Accepts all 5 valid statuses; rejects unknown string |
| `CreateTaskSchema` | `priority` defaults to `'medium'`; `dueDate` accepts ISO string or undefined |
| `CreateMemberSchema` | `bio` optional; `email` format validated if present |
| Geo/structure schemas | Nullable lat/lng accepted as `undefined`; depth accepts float |

**Pattern:**
```ts
// backend/src/__tests__/schemas/projects.test.ts
import { CreateProjectSchema } from '../../schemas/projects'

it('requires refCode', () => {
  expect(() => CreateProjectSchema.parse({ name: 'X' })).toThrow()
})
it('defaults status to planning', () => {
  const r = CreateProjectSchema.parse({ refCode: 'P-001', name: 'X' })
  expect(r.status).toBe('planning')
})
it('rejects invalid category', () => {
  expect(() => CreateProjectSchema.parse({ refCode: 'P-001', name: 'X', category: 'invalid' })).toThrow()
})
```

#### 2.1c Services (`backend/src/services/<domain>.ts`)

This is the primary unit test target — where all business logic and DB queries live. Services are called with plain arguments and return plain data; they do not involve tRPC wiring.

**Pattern: import service function + fixtures, call directly:**
```ts
// backend/src/__tests__/services/projects.test.ts
import { listProjects, getProjectById, createProject } from '../../services/projects'
import { createProject as fixtureProject } from '../fixtures'

it('returns empty array when no projects', () => {
  expect(listProjects({ search: '', status: '', category: '', country: '', sortBy: 'relevance' })).toEqual([])
})

it('creates a project and retrieves it by id', () => {
  const created = createProject({ refCode: 'P-001', name: 'My Project', ... })
  const fetched = getProjectById(created.id)
  expect(fetched?.refCode).toBe('P-001')
})
```

This approach is preferred over testing via tRPC callers because it is simpler and more direct. The tRPC layer (router) only needs smoke-testing since it is thin delegation.

### 2.2 `projects` Service (`backend/src/services/projects.ts`)

| Function | Test Cases |
|----------|-----------|
| `listProjects` | Empty list returns `[]`; search by name; search by geo soil_type (JOIN); filter by status (single + comma-separated); filter by category; sort by `budget` (null last); sort by `newest`; default `relevance` sort (active first) |
| `getProjectById` | Returns mapped project; returns `null` (or throws) for unknown id |
| `createProject` | Inserts row, returns camelCase object with correct field mapping; duplicate `refCode` throws SQLite unique constraint error |
| `updateProject` | PATCH-style: only supplied fields change; `updated_at` advances; no-op fields stay unchanged |
| `getProjectStats` | Returns correct counts for `total`, `byStatus`, `byCategory`, `byCountry`, `byYear`, `totalBudget` (EUR only); filtered-by-status variant |
| `getMyProjects` | Returns only projects where `memberId` is in `project_team` |
| `getRiskSummary` | Returns correct `overdueCount` and `blockedCount` per project; project with no risk not included in map |

**Assertions per function:** return type shape (all camelCase keys present); DB row count after mutations; error messages on invalid input.

### 2.3 `team` Service (`backend/src/services/team.ts`)

| Function | Test Cases |
|----------|-----------|
| `listMembers` | Returns all members with `projectCount`; order is `name ASC` |
| `getMemberById` | Returns member with `taggedProjects`, `history` (with nested `geoEntries`, `structures`, `features`), `cvs`; returns `null` for missing id |
| `createMember` | Without CV; with CV (verifies `member_cvs` row created); returns `mapMember` shape |
| `updateMember` | Updates name/title/email/phone/bio; `updated_at` advances |
| `getMembersByProject` | Returns only members tagged to that project; includes `roleOnProject` |
| `tagMemberToProject` | Inserts to `project_team`; idempotent (second call does not error via `INSERT OR REPLACE`) |
| `untagMemberFromProject` | Removes from `project_team`; no-op on non-existent tag |
| `addMemberHistory` | Transaction: inserts `member_history` + sub-entry tables atomically; returns history with nested entries |
| `updateMemberHistory` | Deletes old sub-entries and re-inserts; verifies count changes correctly |
| `deleteMemberHistory` | Cascades to `member_history_geo`, `member_history_structures`, `member_history_features` |
| `getCvData` | Returns `filename` + `fileData`; returns `null` for missing cv |
| `attachCv` | Inserts `member_cvs` row; returns `id`, `filename`, `fileSize` |
| `createMemberWithHistory` | Full transaction: member + CV + history + sub-entries all in one call |

**Key assertions:** `member_history_features` sub-entries are inserted correctly (this was a known bug per Architecture Agent findings). Verify cascade delete via FK when parent history deleted.

### 2.4 `tasks` Service (`backend/src/services/tasks.ts`)

| Function | Test Cases |
|----------|-----------|
| `getOverdueTasks` | Only returns tasks with `due_date < today` AND `status != 'done'`; includes `assignees` + `commentCount` + `projectName` |
| `getNearDeadlineTasks` | Returns tasks in `[today, today+3days]` window; excludes `done` |
| `getBlockedTasks` | Returns tasks with `status = 'blocked'`; includes `projectName` + `projectReference` |
| `getMyOverdueTasks` | Only tasks assigned to specific `memberId`; filters correctly |
| `getMyNearDeadlineTasks` | Only tasks assigned to specific `memberId`; correct date window |
| `getTasksByProject` | Returns tasks sorted by priority (high→medium→low), then `created_at DESC`; includes `assignees` + `commentCount` |
| `getTasksByMember` | Returns tasks where member is in `task_assignments` |
| `getTaskById` | Returns full task with `assignees` + `comments`; returns `null` for missing |
| `createTask` | Inserts task; returns with empty `assignees` + `comments` arrays |
| `updateTask` | Partial update: title only; status only; `dueDate = null` clears date |
| `updateTask` error | Throws `"Task not found"` for missing id |
| `deleteTask` | Cascades to `task_assignments` and `task_comments` |
| `assignTask` | Inserts to `task_assignments`; `INSERT OR IGNORE` means double-assign is a no-op |
| `unassignTask` | Removes from `task_assignments` |
| `addTaskComment` | Inserts comment; returns mapped comment with correct `taskId` |
| `deleteTaskComment` | Removes comment; leaves task intact |

### 2.5 `geo`, `structures`, `features` Services

These three are structurally identical (byProject/create/delete). Test cases apply to all three.

**`geo` (`backend/src/services/geo.ts`)**

| Function | Test Cases |
|----------|-----------|
| `getGeoByProject` | Returns entries ordered by `point_label ASC`; empty array for project with no entries |
| `createGeoEntry` | Inserts row with correct snake→camel mapping; nullable fields (`depth`, `latitude`, etc.) stored as `null` not `undefined` |
| `deleteGeoEntry` | Removes entry; FK check: project deletion cascades to entries |

**`structures` (`backend/src/services/structures.ts`)** — same pattern; verify `STRUCTURE_TYPES` enum enforcement (from `schemas/structures.ts`).

**`features` (`backend/src/services/features.ts`)** — same pattern; verify `project_features` table (not `geo_entries`).

### 2.6 `requirements` Service (`backend/src/services/requirements.ts`)

| Function | Test Cases |
|----------|-----------|
| `listBooks` | Returns all books with `requirementCount` and `projectName`/`projectRefCode` when linked |
| `getBookById` | Returns book + nested `requirements` array + linked `project`; returns `null` for missing |
| `createBook` | Inserts with correct field mapping; nullable `projectId` stored as `null` |
| `updateBook` | Updates all fields; `updated_at` advances |
| `deleteBook` | Cascades to `requirements` |
| `createRequirement` | Inserts; nullable `yearsExperience` stored as `null` |
| `updateRequirement` | Updates all fields |
| `deleteRequirement` | Removes row |

### 2.7 `matching` Service (`backend/src/services/matching.ts`)

The local scoring logic and `extractVerbatimEvidence()` function are now centralised here (previously duplicated between team and requirements routers).

| Function | Test Cases |
|----------|-----------|
| `suggestMembersLocal` | Discipline keyword scoring: member with matching bio keyword gets score ≥ 3; history category match adds score; level keyword match; certification word match; returns top-N sorted by score desc |
| `matchMembersLocal` | Category match (+3 each), country match (+3 each), region match (+2), structure type match (+2); returns top-N sorted by score desc |
| `extractVerbatimEvidence` | Returns array of evidence strings; empty array for member with no matching history |

**`scoreRequirement` function** (if exported from `services/requirements.ts` or `services/matching.ts`): test discipline/level/certification scoring logic in isolation.

### 2.8 AI Library Mocking Strategy

Files: `backend/src/lib/parseCv.ts`, `backend/src/lib/parseProject.ts`, `backend/src/lib/suggestMembersAi.ts`.

**Strategy:** Use Vitest's `vi.mock('@anthropic-ai/sdk')` to replace `Anthropic` with a factory that returns a mock client.

```ts
// Example pattern for parseCv tests
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockCvOutput) }],
      }),
    },
  })),
}))
```

| Test Case | What to Verify |
|-----------|---------------|
| `parseCv` — success | Mock returns valid JSON; `CvOutputSchema.parse` succeeds; output has correct shape |
| `parseCv` — no API key | `process.env.ANTHROPIC_API_KEY` not set → throws `TRPCError(INTERNAL_SERVER_ERROR)` |
| `parseCv` — malformed JSON from AI | Mock returns non-JSON text → throws `TRPCError` with "resposta inválida" |
| `parseCv` — markdown-wrapped JSON | Mock returns `` ```json {...} ``` `` → fences stripped, parses correctly |
| `suggestMembersAi` — success | Returns filtered array with correct memberId/rationale shape |
| `suggestMembersAi` — AI returns non-array | Throws `TRPCError(INTERNAL_SERVER_ERROR)` |
| `suggestMembersAi` — no API key | Throws immediately |
| `parseProject` — same patterns as parseCv | Same four cases |

### 2.9 `generateCv.ts` Testing Approach

PDF generation (`backend/src/lib/generateCv.ts`) is hard to assert visually. The pragmatic approach is:

1. **Smoke test:** Call `generateCvPdf(member)` with a minimal `CvMember` object; assert the returned `Buffer` is non-empty and its first bytes are `%PDF` (hex `25 50 44 46`).
2. **Edge cases:** Member with no history; member with no bio; history entry with no structures/geoEntries; long member name (no crash).
3. **No visual regression** at this stage — defer to E2E screenshot comparison if needed later.

```ts
it('generates a non-empty PDF buffer', async () => {
  const buf = await generateCvPdf(minimalMember)
  expect(buf.length).toBeGreaterThan(0)
  expect(buf.slice(0, 4).toString()).toBe('%PDF')
})
```

---

## 3. Frontend Unit Tests

### 3.1 Component Testing Approach

Use **React Testing Library** with Vitest. Render components in a provider wrapper that supplies:
- `QueryClientProvider` (from `@tanstack/react-query`) with a fresh `QueryClient` for each test
- `LanguageProvider` (from `frontend/src/i18n/context.tsx`) set to `'pt'` (default)
- A mock `onNavigate` function

```ts
// frontend/src/__tests__/utils.tsx
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '../i18n/context'

export function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>
  )
}
```

### 3.2 Testing API Hooks (`frontend/src/api/<domain>.ts`)

The api hooks in `frontend/src/api/` are the primary frontend test target. Each hook wraps a tRPC query or mutation; they should be tested with `renderHook` from React Testing Library.

**Recommended approach:** Mock the tRPC HTTP layer with `msw` (Mock Service Worker).

```bash
cd frontend
npm install --save-dev msw
```

Set up a server in `frontend/src/__tests__/`:
```ts
// frontend/src/__tests__/msw-server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)
```

```ts
// frontend/src/__tests__/setup.ts
import '@testing-library/jest-dom'
import { server } from './msw-server'
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**Testing a hook with `renderHook`:**
```ts
// frontend/src/__tests__/api/projects.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useProjectsList } from '../../api/projects'
import { wrapper } from '../utils'  // QueryClientProvider wrapper

it('returns project list from API', async () => {
  const { result } = renderHook(() => useProjectsList(), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toHaveLength(2)  // matches msw handler mock
})

it('returns empty array when API returns no projects', async () => {
  server.use(/* override handler to return [] */)
  const { result } = renderHook(() => useProjectsList({ status: 'completed' }), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual([])
})
```

**Hooks to test per domain:**

| File | Hooks |
|------|-------|
| `api/projects.ts` | `useProjectsList` (filter params), `useProjectById`, `useProjectStats`, `useMyProjects`, `useRiskSummary`, `useCreateProject` (mutation), `useUpdateProject` (mutation) |
| `api/team.ts` | `useTeamList`, `useMemberById`, `useTeamByProject`, `useCreateMember`, `useUpdateMember`, `useTagProject`, `useUntagProject`, `useAddHistory`, `useDeleteHistory`, `useAttachCv`, `useSuggestMembers` |
| `api/tasks.ts` | `useTasksByProject`, `useTaskById`, `useOverdueTasks`, `useNearDeadlineTasks`, `useBlockedTasks`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useAssignTask`, `useAddComment`, `useDeleteComment` |
| `api/requirements.ts` | `useListBooks`, `useBookById`, `useCreateBook`, `useUpdateBook`, `useDeleteBook`, `useCreateRequirement`, `useDeleteRequirement`, `useMatchMembers` |
| `api/geo.ts` | `useGeoByProject`, `useCreateGeo`, `useDeleteGeo` |
| `api/structures.ts` | `useStructuresByProject`, `useCreateStructure`, `useDeleteStructure` |
| `api/features.ts` | `useFeaturesByProject`, `useCreateFeature`, `useDeleteFeature` |

**Alternatively, mock at the module level** (simpler but more fragile):
```ts
vi.mock('../../api/projects', () => ({
  useProjectsList: () => ({ data: mockProjects, isLoading: false, isSuccess: true }),
  useCreateProject: () => ({ mutate: vi.fn(), isPending: false }),
}))
```
Prefer the `msw` + `renderHook` approach for hooks tests; use module mocking only for view/component tests where hooks are an implementation detail.

### 3.3 Pure Utility Functions (`frontend/src/utils/format.ts`)

These have no React dependencies — test with plain Vitest.

```ts
// frontend/src/__tests__/utils/format.test.ts
import { fmt, fmtDate, fmtDim, initials } from '../../utils/format'

it('fmt formats EUR currency', () => {
  expect(fmt(1500000, 'EUR')).toMatch(/1\.500\.000/)
})
it('fmt returns dash for null', () => {
  expect(fmt(null, 'EUR')).toBe('—')
})
it('fmtDate slices to YYYY-MM-DD', () => {
  expect(fmtDate('2024-06-15T12:00:00Z')).toBe('2024-06-15')
})
it('fmtDate returns dash for null', () => {
  expect(fmtDate(null)).toBe('—')
})
it('fmtDim returns null when value is null', () => {
  expect(fmtDim('Depth', null)).toBeNull()
})
it('initials takes first letter of first two words', () => {
  expect(initials('Ana Paula Ferreira')).toBe('AP')
})
```

### 3.4 Routing Logic Tests (`frontend/src/types/pages.ts`)

`pageToPath` and `pathToPage` are pure functions exported from `frontend/src/types/pages.ts` — easy to unit test with no React setup.

```ts
// frontend/src/__tests__/types/pages.test.ts
import { pageToPath, pathToPage } from '../../types/pages'

it('pageToPath maps home to /', () => {
  expect(pageToPath({ view: 'home' })).toBe('/')
})
it('pageToPath maps project with id', () => {
  expect(pageToPath({ view: 'project', id: 42 })).toBe('/projects/42')
})
it('pathToPage maps /projects/5 to project page', () => {
  expect(pathToPage('/projects/5')).toEqual({ view: 'project', id: 5 })
})
it('pathToPage maps unknown path to home', () => {
  expect(pathToPage('/unknown')).toEqual({ view: 'home' })
})
```

### 3.5 Mocking tRPC Queries in Component Tests

For view-level component tests (where the hook internals are an implementation detail), mock the api module:

```ts
vi.mock('../../api/projects', () => ({
  useProjectsList: () => ({ data: mockProjects, isLoading: false, isSuccess: true }),
  useCreateProject: () => ({ mutate: vi.fn(), isPending: false }),
}))
```

For tRPC batch requests via msw, intercept `POST /trpc/projects.list` etc.

### 3.6 i18n Context Mock

Since `LanguageProvider` is a simple React context, the provider wrapper approach in section 3.1 is sufficient. For a lighter mock in component unit tests:

```ts
vi.mock('../../i18n/context', () => ({
  useTranslation: () => ({ t: (key: string) => key, lang: 'pt', setLang: vi.fn() }),
}))
```

This makes assertions language-neutral (test against i18n keys rather than translated strings).

### 3.7 Priority Components/Views

Listed in order of testing value. Note: views are now slim wrappers — behaviour lives in api hooks and shared components. When a view test fails, check whether the issue is in the hook (test via `renderHook`) or the view (test via RTL `render`).

**Tier 1 — Core data flows:**

1. **`SearchProjects`** (`frontend/src/views/SearchProjects.tsx`)
   - Renders loading state while query pending
   - Renders project cards when data loads
   - Typing in search input triggers new query (debounce if present)
   - Status/category/country filter dropdowns change query params
   - Sort dropdown changes `sortBy` param
   - Clicking a card calls `onNavigate({ view: 'project', id: ... })`

2. **`ProjectDetail`** (`frontend/src/views/ProjectDetail.tsx`)
   - Displays project fields in view mode
   - Edit button switches to edit form; Save calls `useUpdateProject` mutation
   - Geo section: rendered via `GeoSection` from `components/shared/`; Add Entry form submits `useCreateGeo`; Delete calls `useDeleteGeo`
   - Structures section: rendered via `StructureSection` from `components/shared/`; same pattern
   - Features section: Add/delete via `useCreateFeature`, `useDeleteFeature`
   - Team section: tag/untag member via `useTagProject`, `useUntagProject`
   - Tasks section: task cards display; Add task form calls `useCreateTask`

3. **`TaskDetail`** (`frontend/src/views/TaskDetail.tsx`)
   - Displays task title/status/priority/dueDate
   - Status change dropdown calls `useUpdateTask` mutation
   - Assign member: calls `useAssignTask`; member appears in assignees list
   - Add comment: calls `useAddComment`; comment appears in list
   - Delete task: calls `useDeleteTask`, navigates away

**Tier 2 — Shared components:**

4. **`GeoSection`** (`frontend/src/components/shared/GeoSection.tsx`) — renders entries, submit form, delete
5. **`StructureSection`** (`frontend/src/components/shared/StructureSection.tsx`) — same pattern
6. **`Field`** (`frontend/src/components/shared/Field.tsx`) — renders label/value, edit mode toggle

**Tier 3 — Team and Requirements:**

7. **`TeamMembers`** — renders list, add member form, CSV upload flow state changes
8. **`TeamMemberDetail`** — member info editing, CV attachment UI, history section, history features sub-section
9. **`Requirements`** / `RequirementBookDetail` — book creation, requirement CRUD, match members result display

**Tier 4 — Reports and Home:**

10. **`Reports`** — tab switching renders correct section; stats data renders charts/tables
11. **`Home`** (`UserHome` / `OversightHome`) — user vs oversight role renders different sub-component; KPI stats display

### 3.8 Auth Layer Tests (`frontend/src/auth/index.ts`)

```ts
it('returns null when localStorage is empty', () => {
  localStorage.clear()
  expect(getCurrentUser()).toBeNull()
})
it('round-trips a user through localStorage', () => {
  setCurrentUser(mockUser)
  expect(getCurrentUser()).toEqual(mockUser)
})
it('signOut clears the stored user', () => {
  setCurrentUser(mockUser)
  signOut()
  expect(getCurrentUser()).toBeNull()
})
```

---

## 4. Playwright E2E Tests

All E2E tests live in `e2e/` at the repo root. The dev server (`npm run dev`) serves backend on `:3000` and frontend on `:5173`. The Vite proxy forwards `/trpc` to the backend.

### Journey 1: Create a Project

**File:** `e2e/projects/create-project.spec.ts`

| Step | Action | Assertion |
|------|--------|-----------|
| Navigate | Go to `/add` | "Novo Projeto" heading visible |
| Fill form | Enter refCode, name, client, category=transport | Form fields populated |
| Add geo entry | Click "Adicionar Entrada Geo", fill pointLabel + depth | Geo row appears inline |
| Add structure | Click "Adicionar Estrutura", fill label + type=bridge | Structure row appears |
| Submit | Click submit button | Redirects to `/projects/<id>` |
| Verify | Project detail page shows correct name and refCode | h1 and ref-code element match inputs |
| Verify geo | Geo section lists the entry | pointLabel visible |

### Journey 2: Add Team Member + Assign to Project

**File:** `e2e/team/add-member-assign.spec.ts`

| Step | Action | Assertion |
|------|--------|-----------|
| Navigate | Go to `/team` | Team list renders |
| Add member | Click "Adicionar Membro", fill name + title + email | Modal/form visible |
| Submit | Click save | New member card appears in list |
| Navigate | Click member → `/team/<id>` | Member detail page loads |
| Navigate to project | Go to `/projects/<id>` | ProjectDetail loads |
| Assign | In team section, search member name, click "Adicionar" | Member card appears in team list on project |
| Verify | member detail shows project in "Tagged Projects" section | Project name visible |

### Journey 3: Create and Update a Task

**File:** `e2e/tasks/task-lifecycle.spec.ts`

| Step | Action | Assertion |
|------|--------|-----------|
| Setup | Navigate to existing project detail | Tasks section visible |
| Create | Fill task title, set priority=high, click "Criar Tarefa" | Task card appears with red/high badge |
| Navigate | Click task card → `/projects/<id>/tasks/<tid>` | TaskDetail loads with correct title |
| Update status | Change status dropdown to `in_progress` | Status badge updates immediately |
| Add comment | Type comment text, click "Comentar" | Comment appears in list |
| Update due date | Set due date to yesterday | Task appears in overdue query (verify via Reports tab) |
| Delete | Click "Eliminar Tarefa", confirm | Redirects to project; task no longer in list |

### Journey 4: User Switcher and Role-Based Home Page

**File:** `e2e/auth/user-switcher.spec.ts`

| Step | Action | Assertion |
|------|--------|-----------|
| Open app | Navigate to `/` | UserHome renders (no user selected = fallback UserHome) |
| Open switcher | Click avatar button (top-right in DEV mode) | Dropdown/panel opens with member list |
| Select oversight user | Click "Margarida Ferreira" (role: oversight) | Panel closes; page re-renders as OversightHome |
| Verify oversight home | Risk table and portfolio KPI row visible | "Risco" column header visible |
| Switch to user | Open switcher, select regular member | Page re-renders as UserHome |
| Verify user home | "Meus Projetos" section visible | UserHome content |

*Note: UserSwitcher is only rendered in DEV mode (`import.meta.env.DEV`). E2E tests must run against the Vite dev server, not a production build.*

### Journey 5: Reports Tabs

**File:** `e2e/reports/reports-tabs.spec.ts`

| Step | Action | Assertion |
|------|--------|-----------|
| Navigate | Go to `/reports` | Tasks tab active by default (per UI Agent change) |
| Tasks tab | View is visible | "Tarefas Bloqueadas" section present |
| Overdue tasks | At least one overdue task row visible (seed data has past due dates) | Table row exists |
| Switch to Summary | Click "Resumo" tab | By-status table visible |
| Chart data | Status table has rows for active/planning/completed | Row count > 0 |
| Switch to Team | Click "Equipa" tab | "Em breve" placeholder visible |

### Journey 6: CV Upload Flow

**File:** `e2e/team/cv-upload.spec.ts`

| Step | Action | Assertion |
|------|--------|-----------|
| Navigate | Go to `/team/<id>` for an existing member | TeamMemberDetail loads |
| Upload CV | Click "Carregar CV", select a PDF file from fixtures | Upload button triggers `attachCv` mutation |
| Success | Success message appears | "CV carregado" alert visible |
| CV list | CV filename appears in CV section | `<filename>.pdf` text visible |
| Download | Click CV filename link | Download triggered (assert `href` attribute or network request) |

*Fixture: keep a minimal `e2e/fixtures/sample.pdf` (1-page blank PDF) in the repo for upload tests.*

### Journey 7: Requirement Book + Member Matching

**File:** `e2e/requirements/requirement-matching.spec.ts`

| Step | Action | Assertion |
|------|--------|-----------|
| Navigate | Go to `/requirements` | Book list renders |
| Create book | Click "Novo Livro", fill title + category=transport | Book card appears |
| Navigate | Click book → `/requirements/<id>` | BookDetail loads |
| Add requirement | Fill title=Engenheiro Geotécnico Sénior, discipline=geotechnical, level=senior | Requirement row appears |
| Match local | Click "Sugerir Membros (Local)" | Results panel opens with ranked list |
| Verify results | At least one member has a rationale string | `rationale` text visible |
| Verify score | Member with geotechnical bio ranks above others | First result name matches expected seed member |

---

## 5. Test Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| `types/<domain>.ts` map\*() functions | 100% line coverage | Pure functions with no dependencies — trivial to cover |
| `schemas/<domain>.ts` Zod schemas | 90% line coverage | Small, pure validation logic |
| `services/<domain>.ts` (unit) | 90% line coverage | Primary logic layer; in-memory DB makes coverage easy |
| AI lib functions (unit + mocked) | 85% line coverage | Mock Anthropic; test error branches |
| `generateCv.ts` | 70% line coverage | Integration-style smoke test covers most paths |
| Frontend api hooks (`api/`) | 80% line coverage | Hook behaviour is the primary unit test target |
| Frontend utils (`utils/format.ts`) | 100% line coverage | Pure functions, trivial |
| Routing logic (`types/pages.ts`) | 100% line coverage | Pure functions |
| Frontend components (RTL) | 70% line coverage | Complex JSX; focus on user interactions not render details |
| Auth layer (`auth/index.ts`) | 95% line coverage | Small, pure localStorage logic |
| E2E journeys | 7 critical journeys (above) | Cover every user-visible feature |

**Hard gates for CI:** Service layer coverage must be ≥ 85% or the build fails. Frontend coverage is soft (warning only) until Tier 1 hooks and components are fully tested.

---

## 6. CI Integration

### GitHub Actions Structure

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:

jobs:
  backend-test:
    name: Backend Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '25', cache: 'npm' }
      - run: npm ci
      - run: npm ci --prefix backend
      - run: npm --prefix backend run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: backend/coverage/lcov.info

  frontend-test:
    name: Frontend Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '25', cache: 'npm' }
      - run: npm ci
      - run: npm ci --prefix frontend
      - run: npm --prefix frontend run test:coverage

  lint:
    name: ESLint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '25', cache: 'npm' }
      - run: npm ci && npm ci --prefix frontend
      - run: npm --prefix frontend run lint

  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '25', cache: 'npm' }
      - run: npm ci && npm ci --prefix backend && npm ci --prefix frontend
      - run: npx playwright install --with-deps chromium
      - name: Create backend .env
        run: echo "ANTHROPIC_API_KEY=test_key_placeholder" > backend/.env
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**Notes:**
- E2E job runs `npm run dev` via `webServer` in `playwright.config.ts`; the `ANTHROPIC_API_KEY` placeholder is sufficient since AI procedures are not exercised in E2E (they require a real key and incur cost)
- E2E should gate on backend + frontend unit tests passing first (`needs:`)
- Playwright artifacts (trace, screenshots) uploaded on failure for debugging
- Backend `.env` must NOT be committed to the repo; CI creates it at runtime

---

## 7. Priority Order

Write tests in this order, prioritising highest risk + highest value first. The cleaner layer separation now means the first two phases yield fast, high-confidence coverage before any integration tests.

### Phase 1 — Pure Layer Tests (Week 1, highest ROI per hour)

1. **Test infrastructure setup**: Install Vitest in backend and frontend; write `resetDb` + fixture helpers; confirm one passing test in each package
2. **`types/<domain>.ts` map\*() functions** — all 7 domains; pure functions, no DB needed; fast CI wins
3. **`schemas/<domain>.ts` Zod validation** — all 7 domains; edge cases and enum enforcement
4. **`utils/format.ts`** and **`types/pages.ts`** frontend pure functions — zero setup needed

### Phase 2 — Backend Service Layer (Week 1–2)

5. **`services/projects.ts`** — `listProjects`, `getProjectById`, `createProject`, `updateProject`, `getProjectStats`, `getMyProjects`, `getRiskSummary` (highest-traffic; data backbone)
6. **`services/tasks.ts`** — `createTask`, `updateTask`, `getTasksByProject`, `getOverdueTasks`, `assignTask`/`unassignTask`, `addTaskComment` (business-critical; overdue logic is date-sensitive)
7. **`services/team.ts`** — `createMember`, `getMemberById`, `addMemberHistory`, `updateMemberHistory`, `tagMemberToProject`/`untagMemberFromProject` (complex; known bug in history features insertion)
8. **`services/matching.ts`** — `suggestMembersLocal`, `matchMembersLocal`, `extractVerbatimEvidence` scoring logic

### Phase 3 — Backend Secondary + AI Libs (Week 2)

9. **`services/requirements.ts`** — books CRUD, requirements CRUD, local scoring
10. **`services/geo.ts`, `services/structures.ts`, `services/features.ts`** — byProject/create/delete + FK cascade coverage
11. **AI library mocks** — `parseCv`, `parseProject`, `suggestMembersAi` (all error branches; no-API-key path)
12. **`generateCv`** — smoke test buffer output

### Phase 4 — Frontend API Hooks (Week 3)

13. **Auth layer** (`auth/index.ts`) — pure functions, easy wins
14. **`api/projects.ts` hooks** — `useProjectsList` filter params, `useCreateProject`, `useUpdateProject`
15. **`api/tasks.ts` hooks** — `useTasksByProject`, `useOverdueTasks`, `useCreateTask`, `useUpdateTask`
16. **`api/team.ts` hooks** — `useTeamList`, `useMemberById`, `useAddHistory`, `useAttachCv`
17. **`api/requirements.ts` hooks** — `useListBooks`, `useMatchMembers`

### Phase 5 — Frontend Views + Shared Components (Week 3–4)

18. **`SearchProjects`** component — filter + navigation (Tier 1)
19. **`ProjectDetail`** component — edit flow + section mutations (Tier 1)
20. **`TaskDetail`** component — status change + comment flow (Tier 1)
21. **`GeoSection`, `StructureSection`, `Field`** shared components — Tier 2

### Phase 6 — E2E Critical Paths (Week 4)

22. **Journey 1**: Create project (most used, most complex form)
23. **Journey 3**: Task lifecycle (end-to-end status flow)
24. **Journey 2**: Add team member + assign to project
25. **Journey 7**: Requirement matching (differentiating feature)
26. **Journey 4**: UserSwitcher + role routing
27. **Journey 5**: Reports tabs
28. **Journey 6**: CV upload

### Phase 7 — Remaining Coverage (Ongoing)

29. Tier 3–4 frontend views (`TeamMembers`, `TeamMemberDetail`, `Requirements`, `Reports`, `Home`)
30. `getProjectStats` riskSummary, `getMyOverdueTasks`/`getMyNearDeadlineTasks`, `getBlockedTasks` edge cases
31. Known bug regression tests: history features insertion (`services/team.ts` addHistory with features array), N+1 query in `getHistoryWithSubEntries`

---

## Appendix: Key File Paths Reference

### Backend

| File | Role |
|------|------|
| `backend/src/db/client.ts` | `db` singleton (better-sqlite3 instance) |
| `backend/src/db/schema.ts` | Schema DDL — table CREATE statements |
| `backend/src/db/statements/<domain>.ts` | Prepared statements per domain |
| `backend/src/db/index.ts` | Barrel re-export with schema side-effect import |
| `backend/src/types/projects.ts` | `RawProject`, `mapProject()` |
| `backend/src/types/team.ts` | `RawMember`, `mapMember()`, `mapHistory()`, etc. |
| `backend/src/types/tasks.ts` | `RawTask`, `mapTask()`, `mapComment()` |
| `backend/src/types/geo.ts` | `RawGeoEntry`, `mapGeoEntry()` |
| `backend/src/types/structures.ts` | `RawStructure`, `mapStructure()` |
| `backend/src/types/features.ts` | `RawFeature`, `mapFeature()` |
| `backend/src/types/requirements.ts` | `RawBook`, `mapBook()`, `mapRequirement()` |
| `backend/src/schemas/projects.ts` | `CreateProjectSchema`, `ProjectStatusSchema`, etc. |
| `backend/src/schemas/team.ts` | `CreateMemberSchema`, `AddHistorySchema`, etc. |
| `backend/src/schemas/tasks.ts` | `CreateTaskSchema`, `UpdateTaskSchema`, etc. |
| `backend/src/schemas/geo.ts` | `CreateGeoSchema` |
| `backend/src/schemas/structures.ts` | `CreateStructureSchema`, structure type constants |
| `backend/src/schemas/features.ts` | `CreateFeatureSchema` |
| `backend/src/schemas/requirements.ts` | `CreateBookSchema`, `CreateRequirementSchema` |
| `backend/src/services/projects.ts` | `listProjects`, `getProjectById`, `createProject`, `updateProject`, `getProjectStats`, `getMyProjects`, `getRiskSummary` |
| `backend/src/services/team.ts` | `listMembers`, `getMemberById`, `createMember`, `updateMember`, `addMemberHistory`, etc. |
| `backend/src/services/tasks.ts` | `getTasksByProject`, `createTask`, `updateTask`, `getOverdueTasks`, etc. |
| `backend/src/services/geo.ts` | `getGeoByProject`, `createGeoEntry`, `deleteGeoEntry` |
| `backend/src/services/structures.ts` | `getStructuresByProject`, `createStructure`, `deleteStructure` |
| `backend/src/services/features.ts` | `getFeaturesByProject`, `createFeature`, `deleteFeature` |
| `backend/src/services/requirements.ts` | Books/requirements CRUD, local matching |
| `backend/src/services/matching.ts` | `extractVerbatimEvidence`, local scoring functions |
| `backend/src/router/index.ts` | `appRouter` — tRPC caller factory entry point |
| `backend/src/router/projects.ts` | `projectsRouter` — thin tRPC procedures only |
| `backend/src/router/team.ts` | `teamRouter` — thin tRPC procedures only |
| `backend/src/router/tasks.ts` | `tasksRouter` — thin tRPC procedures only |
| `backend/src/router/geo.ts` | `geoRouter` — thin tRPC procedures only |
| `backend/src/router/structures.ts` | `structuresRouter` — thin tRPC procedures only |
| `backend/src/router/features.ts` | `featuresRouter` — thin tRPC procedures only |
| `backend/src/router/requirements.ts` | `requirementsRouter` — thin tRPC procedures only |
| `backend/src/lib/parseCv.ts` | Claude API CV extraction |
| `backend/src/lib/parseProject.ts` | Claude API project extraction |
| `backend/src/lib/generateCv.ts` | pdfkit PDF generation |
| `backend/src/lib/suggestMembersAi.ts` | Claude API member matching |

### Frontend

| File | Role |
|------|------|
| `frontend/src/api/projects.ts` | `useProjectsList`, `useProjectById`, `useCreateProject`, `useUpdateProject`, etc. |
| `frontend/src/api/team.ts` | `useTeamList`, `useMemberById`, `useAddHistory`, `useAttachCv`, `useSuggestMembers`, etc. |
| `frontend/src/api/tasks.ts` | `useTasksByProject`, `useOverdueTasks`, `useCreateTask`, `useAssignTask`, `useAddComment`, etc. |
| `frontend/src/api/requirements.ts` | `useListBooks`, `useBookById`, `useCreateBook`, `useMatchMembers`, etc. |
| `frontend/src/api/geo.ts` | `useGeoByProject`, `useCreateGeo`, `useDeleteGeo` |
| `frontend/src/api/structures.ts` | `useStructuresByProject`, `useCreateStructure`, `useDeleteStructure` |
| `frontend/src/api/features.ts` | `useFeaturesByProject`, `useCreateFeature`, `useDeleteFeature` |
| `frontend/src/types/pages.ts` | `Page` union type, `pageToPath()`, `pathToPage()` |
| `frontend/src/types/suggestions.ts` | `Suggestion` type |
| `frontend/src/utils/format.ts` | `fmt()`, `fmtDate()`, `fmtDim()`, `initials()` |
| `frontend/src/utils/download.ts` | `downloadCv()` |
| `frontend/src/constants/projects.ts` | `STATUSES`, `CATEGORIES`, `STATUS_KEY`, `CAT_KEY` |
| `frontend/src/constants/tasks.ts` | `TASK_STATUS_KEY`, `TASK_PRIORITY_KEY`, `TASK_STATUSES`, `TASK_PRIORITIES` |
| `frontend/src/constants/geo.ts` | `GEO_TYPE_KEY` |
| `frontend/src/constants/structures.ts` | `STRUCTURE_TYPES`, `STRUCT_TYPE_KEY` |
| `frontend/src/components/shared/GeoSection.tsx` | Shared geo entries UI section |
| `frontend/src/components/shared/StructureSection.tsx` | Shared structures UI section |
| `frontend/src/components/shared/Field.tsx` | Shared field label/value component |
| `frontend/src/trpc.ts` | tRPC client + queryClient |
| `frontend/src/i18n/context.tsx` | `LanguageProvider` + `useTranslation` |
| `frontend/src/auth/index.ts` | `getCurrentUser`, `setCurrentUser`, `signOut`, `useCurrentUser` |
| `frontend/src/views/` | 9 view components (now slim wrappers) |
| `frontend/src/components/Layout.tsx` | Nav + breadcrumb |
| `frontend/src/components/UserSwitcher.tsx` | Dev-only role switcher |
