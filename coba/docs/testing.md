# COBA Testing Strategy

**Date:** 2026-04-12  
**Status:** Implemented — 16 backend test files (165 tests) + 1 frontend test file (19 tests) + 5 E2E test files (27 tests), all passing

---

## 0. Current State

All tests are implemented and passing.

- **Backend:** Vitest, 15 test files in `backend/src/__tests__/` (165 tests across `types/`, `schemas/`, and `services/`), plus `setup.ts`
- **Frontend:** Vitest + jsdom + React Testing Library, 1 test file `frontend/src/__tests__/utils/format.test.ts` (19 tests)
- **E2E:** Playwright, 5 spec files in `e2e/tests/` (27 tests)
- Both `tsc --noEmit` checks are clean

**Backend tsconfig note:** The main `tsconfig.json` excludes `src/__tests__/` (Vitest 4.x requires `moduleResolution: bundler` which conflicts with the production `node10` setting). A `tsconfig.test.json` extends the main config with bundler resolution for test type-checking. The production build is unaffected.

### Architecture After Refactor

The codebase is fully layered. Key structural layers:

**Backend:**
- `backend/src/types/<domain>.ts` — `Raw*` types (snake_case DB rows) and `map*()` pure functions. Pure functions with no side effects — ideal for unit tests.
- `backend/src/schemas/<domain>.ts` — Zod schemas and domain constants (e.g. `CreateProjectSchema`, `ProjectStatusSchema`). Validation edge cases testable in isolation.
- `backend/src/services/<domain>.ts` — all business logic and DB queries. The real logic layer; primary unit test target.
- `backend/src/db/client.ts`, `db/schema.ts`, `db/statements/<domain>.ts`, `db/index.ts` — split DB layer.
- `backend/src/router/<domain>.ts` — thin tRPC procedures only; delegate immediately to services.

**Frontend:**
- `frontend/src/api/<domain>.ts` — custom React Query hooks per domain. Primary frontend unit test target (via `renderHook`).
- `frontend/src/constants/` — `projects.ts`, `geo.ts`, `structures.ts`, `tasks.ts` — pure lookup objects.
- `frontend/src/utils/format.ts` — `fmt`, `fmtDate`, `fmtDim`, `initials` — pure functions, easy to unit test.
- `frontend/src/utils/download.ts` — `downloadCv` — side-effect function; test with mocked `URL.createObjectURL`.
- `frontend/src/types/pages.ts` — `Page` union type, `pageToPath()`, `pathToPage()`.
- `frontend/src/types/suggestions.ts` — `Suggestion` type.
- `frontend/src/components/shared/` — `GeoSection`, `StructureSection`, `Field` — shared UI components.
- Views in `frontend/src/views/` are slim wrappers that import from `api/`, `constants/`, `utils/`, and `components/shared/`.

---

## 1. Stack & Tooling

### 1.1 Backend — Vitest

**Framework:** Vitest v2.x

Rationale: matches TypeScript natively without a Babel transform, supports ESM, has first-class mocking via `vi.mock()` / `vi.spyOn()`, and runs in the same process as `tsx` watch mode.

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

**`backend/package.json` scripts:**
```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage"
```

### 1.2 Frontend — Vitest + React Testing Library

**Frameworks:** Vitest + React Testing Library + `jsdom`

**`frontend/vite.config.ts` — `test` block:**
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/__tests__/setup.ts'],
  coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
}
```

### 1.3 E2E — Playwright

**Config:** `playwright.config.ts` at repo root. Test directory: `e2e/tests/`. Base URL: `http://localhost:5173`. Runs Chromium only. `webServer` runs `npm run dev` (backend on `:3000`, frontend on `:5173`).

### 1.4 Database Strategy for Tests

The backend uses an **in-memory SQLite** database. The `db` singleton is initialised in `backend/src/db/client.ts`; schema DDL is applied in `backend/src/db/schema.ts`; prepared statements live in `backend/src/db/statements/<domain>.ts`.

Each test module gets the same `db` singleton. Tests reset state between cases via the `resetDb` helper in `backend/src/__tests__/setup.ts`, which runs `DELETE FROM <table>` for every table in FK-safe order (children before parents) via `beforeEach`. Because seed scripts run at server startup (not at DB import), tests get a blank database unless they explicitly seed it.

**Test fixtures** (`backend/src/__tests__/fixtures.ts`) call prepared statements directly from `backend/src/db/statements/<domain>` to avoid testing through the service layer in setup code.

---

## 2. Backend Unit Tests

### 2.1 Types / map\*() Functions (`backend/src/types/<domain>.ts`)

Pure functions with no dependencies — zero DB setup, runs in milliseconds.

| File | Functions |
|------|-----------|
| `types/projects.ts` | `mapProject(rawRow)` — snake_case → camelCase, null passthrough, numeric coercion |
| `types/team.ts` | `mapMember()`, `mapHistory()`, `mapHistoryGeo()`, `mapHistoryStructure()`, `mapHistoryFeature()` |
| `types/tasks.ts` | `mapTask()`, `mapComment()` |
| `types/geo.ts` | `mapGeoEntry()` — nullable lat/lng handled correctly |
| `types/structures.ts` | `mapStructure()` — nullable geo coords |
| `types/features.ts` | `mapFeature()` |
| `types/requirements.ts` | `mapBook()`, `mapRequirement()` |

### 2.2 Zod Schemas (`backend/src/schemas/<domain>.ts`)

Test validation edge cases: required fields, enum values, defaults, coercion.

| Schema | Key cases |
|--------|-----------|
| `CreateProjectSchema` | Missing `refCode` throws; invalid `category` enum throws; `status` defaults to `'planning'` |
| `ProjectStatusSchema` | Accepts all 5 valid statuses; rejects unknown string |
| `CreateTaskSchema` | `priority` defaults to `'medium'`; `dueDate` accepts ISO string or undefined |
| `CreateMemberSchema` | `bio` optional; `email` format validated if present |
| Geo/structure schemas | Nullable lat/lng accepted as `undefined`; depth accepts float |

### 2.3 Services (`backend/src/services/<domain>.ts`)

Primary unit test target — all business logic and DB queries. Services are called with plain arguments and return plain data; no tRPC wiring.

#### `projects` Service

| Function | Key Test Cases |
|----------|----------------|
| `listProjects` | Empty list returns `[]`; search by name; search by geo soil_type (JOIN); filter by status; filter by category; sort by `budget` (null last); sort by `newest`; default `relevance` sort (active first) |
| `getProjectById` | Returns mapped project; returns `null` for unknown id |
| `createProject` | Inserts row, returns camelCase object; duplicate `refCode` throws SQLite unique constraint |
| `updateProject` | PATCH-style: only supplied fields change; `updated_at` advances |
| `getProjectStats` | Correct counts for `total`, `byStatus`, `byCategory`, `byCountry`, `byYear`, `totalBudget` (EUR only) |
| `getMyProjects` | Returns only projects where `memberId` is in `project_team` |
| `getRiskSummary` | Correct `overdueCount` and `blockedCount` per project |

#### `team` Service

| Function | Key Test Cases |
|----------|----------------|
| `listMembers` | Returns all members with `projectCount`; ordered `name ASC` |
| `getMemberById` | Returns member with `taggedProjects`, `history` (nested sub-entries), `cvs`; null for missing |
| `createMember` | With and without CV; returns `mapMember` shape |
| `updateMember` | Updates fields; `updated_at` advances |
| `getMembersByProject` | Returns only members tagged to that project; includes `roleOnProject` |
| `tagMemberToProject` | Inserts to `project_team`; idempotent via `INSERT OR REPLACE` |
| `untagMemberFromProject` | Removes from `project_team`; no-op on non-existent tag |
| `addMemberHistory` | Transaction: inserts `member_history` + sub-entry tables atomically |
| `updateMemberHistory` | Deletes old sub-entries and re-inserts; verifies count changes |
| `deleteMemberHistory` | Cascades to `member_history_geo/structures/features` |
| `createMemberWithHistory` | Full transaction: member + CV + history + sub-entries |

**Key assertion:** `member_history_features` sub-entries are inserted correctly.

#### `tasks` Service

| Function | Key Test Cases |
|----------|----------------|
| `getOverdueTasks` | Only tasks with `due_date < today` AND `status != 'done'`; includes `assignees` + `commentCount` |
| `getNearDeadlineTasks` | Returns tasks in `[today, today+3days]` window; excludes `done` |
| `getBlockedTasks` | Returns tasks with `status = 'blocked'` |
| `getMyOverdueTasks` / `getMyNearDeadlineTasks` | Filtered to specific `memberId` |
| `getTasksByProject` | Sorted by priority (high→medium→low), then `created_at DESC` |
| `getTaskById` | Returns full task with `assignees` + `comments`; null for missing |
| `createTask` / `updateTask` / `deleteTask` | CRUD with cascade on delete |
| `assignTask` / `unassignTask` | `INSERT OR IGNORE` makes double-assign a no-op |
| `addTaskComment` / `deleteTaskComment` | Comment lifecycle |

#### `geo`, `structures`, `features` Services

Structurally identical (byProject/create/delete). Test: empty array for project with no entries; nullable fields stored as `null` not `undefined`; FK cascade on parent delete.

#### `requirements` Service

| Function | Key Test Cases |
|----------|----------------|
| `listBooks` | Returns all books with `requirementCount` and linked project fields |
| `getBookById` | Returns book + nested `requirements` + linked `project`; null for missing |
| `createBook` / `updateBook` / `deleteBook` | CRUD; delete cascades to `requirements` |
| `createRequirement` / `updateRequirement` / `deleteRequirement` | CRUD; nullable `yearsExperience` |

#### `matching` Service (`backend/src/services/matching.ts`)

| Function | Key Test Cases |
|----------|----------------|
| `suggestMembersLocal` | Discipline keyword scoring; history category match; level/certification match; returns top-N sorted by score |
| `matchMembersLocal` | Category (+3), country (+3), region (+2), structure type (+2) matches; returns top-N sorted |
| `extractVerbatimEvidence` | Returns evidence strings; empty array for member with no matching history |

### 2.4 AI Library Mocking Strategy

Files: `backend/src/lib/parseCv.ts`, `backend/src/lib/parseProject.ts`, `backend/src/lib/parseRequirements.ts`, `backend/src/lib/suggestMembersAi.ts`.

Mock via `vi.mock('@anthropic-ai/sdk')` to replace `Anthropic` with a factory returning a mock client. The lib directory also includes `backend/src/lib/mocks/` with pre-built mock implementations.

**Key test cases for each AI lib:**
- Success: mock returns valid JSON; output schema parses correctly
- No API key: `process.env.ANTHROPIC_API_KEY` not set → throws `TRPCError(INTERNAL_SERVER_ERROR)`
- Malformed JSON from AI: mock returns non-JSON text → throws `TRPCError`
- Markdown-wrapped JSON: mock returns `` ```json {...} ``` `` → fences stripped, parses correctly

### 2.5 `generateCv.ts` Testing Approach

Smoke test: call `generateCvPdf(member)` with a minimal object; assert the returned `Buffer` is non-empty and its first bytes are `%PDF`. Test edge cases: no history, no bio, long names.

---

## 3. Frontend Unit Tests

### 3.1 Component Testing Approach

Use React Testing Library with Vitest. Render components in a provider wrapper that supplies `QueryClientProvider` (fresh `QueryClient` per test) and `LanguageProvider` (set to `'pt'`).

Provider wrapper pattern (`frontend/src/__tests__/utils.tsx`):
```ts
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

Primary frontend test target. Use `renderHook` from React Testing Library with `msw` (Mock Service Worker) to intercept `POST /trpc/<domain>.*` requests.

Hooks to test per domain:

| File | Hooks |
|------|-------|
| `api/projects.ts` | `useProjectsList` (filter params), `useProjectById`, `useProjectStats`, `useMyProjects`, `useRiskSummary`, `useCreateProject`, `useUpdateProject` |
| `api/team.ts` | `useTeamList`, `useMemberById`, `useTeamByProject`, `useCreateMember`, `useUpdateMember`, `useTagProject`, `useUntagProject`, `useAddHistory`, `useDeleteHistory`, `useAttachCv`, `useSuggestMembers` |
| `api/tasks.ts` | `useTasksByProject`, `useTaskById`, `useOverdueTasks`, `useNearDeadlineTasks`, `useBlockedTasks`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useAssignTask`, `useAddComment`, `useDeleteComment` |
| `api/requirements.ts` | `useListBooks`, `useBookById`, `useCreateBook`, `useUpdateBook`, `useDeleteBook`, `useCreateRequirement`, `useDeleteRequirement`, `useMatchMembers` |
| `api/geo.ts` | `useGeoByProject`, `useCreateGeo`, `useDeleteGeo` |
| `api/structures.ts` | `useStructuresByProject`, `useCreateStructure`, `useDeleteStructure` |
| `api/features.ts` | `useFeaturesByProject`, `useCreateFeature`, `useDeleteFeature` |

### 3.3 Pure Utility Functions (`frontend/src/utils/format.ts`)

No React dependencies — test with plain Vitest. **Currently implemented** in `frontend/src/__tests__/utils/format.test.ts` (19 tests).

Functions: `fmt()` (currency), `fmtDate()`, `fmtDim()`, `initials()`.

### 3.4 Routing Logic Tests (`frontend/src/types/pages.ts`)

`pageToPath` and `pathToPage` are pure functions — easy to unit test with no React setup.

### 3.5 i18n Context Mock

```ts
vi.mock('../../i18n/context', () => ({
  useTranslation: () => ({ t: (key: string) => key, lang: 'pt', setLang: vi.fn() }),
}))
```

This makes assertions language-neutral (test against i18n keys rather than translated strings).

### 3.6 Priority Components/Views

**Tier 1 — Core data flows:**
1. `SearchProjects` — filter + navigation
2. `ProjectDetail` — edit flow + section mutations
3. `TaskDetail` — status change + comment flow

**Tier 2 — Shared components:**
4. `GeoSection`, `StructureSection`, `Field`

**Tier 3 — Team and Requirements:**
5. `TeamMembers`, `TeamMemberDetail`, `Requirements`

**Tier 4 — Reports and Home:**
6. `Reports`, `Home` (`UserHome` / `OversightHome`)

### 3.7 Auth Layer Tests (`frontend/src/auth/index.ts`)

Pure localStorage logic — test round-trip, null on empty, `signOut` clears stored user.

---

## 4. Playwright E2E Tests

All E2E tests live in `e2e/tests/` at the repo root. The dev server serves backend on `:3000` and frontend on `:5173`. The Vite proxy forwards `/trpc` to the backend.

**Current test files:**
- `e2e/tests/navigation.spec.ts` (7 tests) — page navigation and routing
- `e2e/tests/projects.spec.ts` (6 tests) — project CRUD flows
- `e2e/tests/team.spec.ts` (5 tests) — team member flows
- `e2e/tests/tasks.spec.ts` (4 tests) — task lifecycle
- `e2e/tests/requirements.spec.ts` (5 tests) — requirement books and member matching

**Fixtures:** `e2e/fixtures/` contains shared test fixtures (e.g. sample PDF for CV upload tests).

**Key journeys covered:**
1. Create a project (with geo entries and structures)
2. Add team member + assign to project
3. Create and update a task (status changes, comments, due dates)
4. User switcher and role-based home page (UserHome vs OversightHome)
5. Reports tabs (tasks/summary/stats)
6. CV upload flow
7. Requirement book + local member matching

**Note:** The UserSwitcher is only rendered in DEV mode (`import.meta.env.DEV`). E2E tests run against the Vite dev server.

**AI procedures in E2E:** AI-dependent procedures (`parseCv`, `suggestMembersAi`, `parseRequirements`) are not exercised in E2E (they require a real key and incur cost). The `ANTHROPIC_API_KEY` placeholder in CI is sufficient for non-AI paths. Mock implementations exist in `backend/src/lib/mocks/`.

---

## 5. Test Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| `types/<domain>.ts` map\*() functions | 100% | Pure functions, trivial to cover |
| `schemas/<domain>.ts` Zod schemas | 90% | Small, pure validation logic |
| `services/<domain>.ts` (unit) | 90% | Primary logic layer; in-memory DB makes coverage easy |
| AI lib functions (unit + mocked) | 85% | Mock Anthropic; test all error branches |
| `generateCv.ts` | 70% | Integration-style smoke test covers most paths |
| Frontend api hooks (`api/`) | 80% | Hook behaviour is the primary unit test target |
| Frontend utils (`utils/format.ts`) | 100% | Pure functions, trivial |
| Routing logic (`types/pages.ts`) | 100% | Pure functions |
| Frontend components (RTL) | 70% | Focus on user interactions not render details |
| Auth layer (`auth/index.ts`) | 95% | Small, pure localStorage logic |
| E2E journeys | 7 critical journeys | Cover every user-visible feature |

**Hard gates for CI:** Service layer coverage must be ≥ 85% or the build fails. Frontend coverage is soft (warning only) until Tier 1 hooks and components are fully tested.

---

## 6. CI Integration

**File:** `.github/workflows/ci.yml`

Jobs: `backend-test`, `frontend-test`, `lint` (ESLint on frontend), `e2e` (depends on unit test jobs). Playwright artifacts uploaded on failure.

**Notes:**
- E2E job runs `npm run dev` via `webServer` in `playwright.config.ts`
- Backend `.env` is created at runtime in CI (never committed); `ANTHROPIC_API_KEY=test_key_placeholder` is sufficient for non-AI E2E paths
- E2E job gates on backend + frontend unit tests passing first

---

## 7. Priority Order

### Phase 1 — Pure Layer Tests (highest ROI per hour)
1. Types `map*()` functions — all 7 domains; pure functions, no DB needed
2. Zod schemas — all 7 domains; edge cases and enum enforcement
3. `utils/format.ts` and `types/pages.ts` — zero setup needed

### Phase 2 — Backend Service Layer
4. `services/projects.ts` — highest-traffic; data backbone
5. `services/tasks.ts` — business-critical; overdue logic is date-sensitive
6. `services/team.ts` — complex; history sub-entry insertion
7. `services/matching.ts` — scoring logic

### Phase 3 — Backend Secondary + AI Libs
8. `services/requirements.ts` — books CRUD, local scoring
9. `services/geo.ts`, `services/structures.ts`, `services/features.ts` — FK cascade coverage
10. AI library mocks — `parseCv`, `parseProject`, `parseRequirements`, `suggestMembersAi` (all error branches)
11. `generateCv` — smoke test buffer output

### Phase 4 — Frontend API Hooks
12. Auth layer (`auth/index.ts`)
13. `api/projects.ts`, `api/tasks.ts`, `api/team.ts`, `api/requirements.ts` hooks

### Phase 5 — Frontend Views + Shared Components
14. Tier 1 views: `SearchProjects`, `ProjectDetail`, `TaskDetail`
15. Shared components: `GeoSection`, `StructureSection`, `Field`

### Phase 6 — E2E Critical Paths (currently implemented)
16. All 27 tests across 5 spec files in `e2e/tests/`

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
| `backend/src/router/projects.ts` | `projectsRouter` — thin tRPC procedures |
| `backend/src/router/team.ts` | `teamRouter` — thin tRPC procedures |
| `backend/src/router/tasks.ts` | `tasksRouter` — thin tRPC procedures |
| `backend/src/router/geo.ts` | `geoRouter` — thin tRPC procedures |
| `backend/src/router/structures.ts` | `structuresRouter` — thin tRPC procedures |
| `backend/src/router/features.ts` | `featuresRouter` — thin tRPC procedures |
| `backend/src/router/requirements.ts` | `requirementsRouter` — thin tRPC procedures |
| `backend/src/lib/parseCv.ts` | Claude API CV extraction |
| `backend/src/lib/parseProject.ts` | Claude API project extraction |
| `backend/src/lib/parseRequirements.ts` | Claude API requirements extraction from documents |
| `backend/src/lib/generateCv.ts` | pdfkit PDF generation |
| `backend/src/lib/suggestMembersAi.ts` | Claude API member matching |
| `backend/src/lib/mocks/` | Mock implementations of AI libs for CI/testing |

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
| `frontend/src/views/` | 9 view components (slim wrappers) |
| `frontend/src/components/Layout.tsx` | Nav + breadcrumb |
| `frontend/src/components/UserSwitcher.tsx` | Dev-only role switcher |
