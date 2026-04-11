# COBA Project Layout Refactoring Plan

**Date:** 2026-04-11
**Author:** Architecture & Docs Agent
**Status:** Proposed — no code changes made

---

## 1. Problems with Current Layout

### Backend

**`backend/src/router/projects.ts` (293 lines)**
- `RawProject` type defined at line 249, after it is already used at lines 92, 99, 130, 177, etc. The type lives at the bottom of the file as an afterthought.
- `CreateProjectSchema` is defined inline at lines 6–26 alongside procedure logic. Schema, types, DB calls, and business logic all live in one file.
- `mapProject` function (lines 271–293) is a DB-to-camelCase mapper — it is business-layer logic but sits inside the router file.
- `db.prepare(...)` calls appear bare inside every procedure body (list, byId, create, update, stats, myProjects, riskSummary) — 17+ inline SQL strings. No caching of prepared statements for hot paths.
- The `list` procedure builds a dynamic SQL string with conditional clauses directly inside the tRPC handler (lines 39–93). That is query-building logic, not routing.
- `stats` procedure (lines 185–213) repeats two separate branches of essentially identical SQL with a `filterStatus` conditional — could be a service function.

**`backend/src/router/team.ts` (552 lines) — the worst offender**
- Five `Raw*` types defined inline: `RawMember`, `RawHistory`, `RawHistoryGeo`, `RawHistoryStructure`, `RawHistoryFeature`, `RawCv` (lines 24–57).
- Four mapper functions: `mapMember`, `mapHistory`, `mapHistoryGeo`, `mapHistoryStructure`, `mapHistoryFeature` (lines 59–77).
- Six Zod schemas: `MemberInputSchema`, `HistoryGeoSchema`, `HistoryStructureSchema`, `HistoryFeatureSchema`, `HistoryInputSchema`, and an ad-hoc anonymous object schema inside `createWithHistory` (lines 80–147).
- Three prepared statement constants (`stmtHistoryGeo`, `stmtHistoryStructure`, `stmtHistoryFeature`, lines 150–169) defined at module level but mid-file, mixed with schemas above and router below.
- Four helper functions (`insertHistoryGeoEntries`, `insertHistoryStructures`, `insertHistoryFeatures`, `getHistoryWithSubEntries`, lines 171–215) — these are service/query layer functions embedded in the router file.
- The `suggestMembers` mutation (lines 432–551) contains a full local scoring algorithm (100+ lines), an AI-dispatch branch, multiple inline `db.prepare` calls, and a private `memberDetail` helper — a completely separate concern squeezed into a single procedure.
- `extractVerbatimEvidence` utility function duplicated here AND in `requirements.ts` (lines 11–21 and lines 88–99 respectively).

**`backend/src/router/tasks.ts` (303 lines)**
- `RawTask`, `RawAssignment`, `RawComment` types defined inline (lines 10–23).
- `mapTask`, `mapComment` mapper functions inline (lines 24–34).
- `getAssignees`, `getComments`, `getCommentCount` helper functions (lines 38–56) are query functions, not router-level code.
- Every procedure does its own `db.prepare(...).all/get/run(...)` inline — no reuse of prepared statements across the hot `getAssignees` helper.

**`backend/src/router/requirements.ts` (338 lines)**
- `DISCIPLINES`, `LEVELS`, `DISCIPLINE_KEYWORDS`, `LEVEL_KEYWORDS`, `CAT_DISCIPLINE` constants (lines 9–33) — domain constants mixed into the router file.
- `RawBook`, `RawRequirement` types and `mapBook`, `mapReq` mappers inline (lines 40–64).
- `BookInputSchema`, `RequirementInputSchema` Zod schemas inline (lines 68–84).
- `scoreRequirement` function (lines 103–142) is a 40-line scoring algorithm — pure service logic embedded in a router file.
- `extractVerbatimEvidence` duplicated again (lines 88–99), identical copy to `team.ts`.
- AI matching code (lines 277–337) constructs a multi-paragraph prompt, calls Anthropic SDK, and parses response — all inside a tRPC mutation handler.

**`backend/src/router/geo.ts` (89 lines)**
- `CreateGeoEntrySchema` and `RawGeo` type and `mapGeo` function are exported from the router file and imported by `team.ts`. Router files should not be the source of shared types/schemas.

**`backend/src/router/structures.ts` (79 lines)**
- Same pattern: `STRUCTURE_TYPES`, `RawStructure`, `mapStructure`, `CreateStructureSchema` all exported from the router file and re-imported in `team.ts`. The router is acting as a types/schema library.

**`backend/src/router/features.ts` (61 lines)**
- `RawFeature` type (unexported, private to file), `mapFeature`, `CreateFeatureSchema`, and `FeatureInput` type — all in the router file.

**`backend/src/db.ts` (322 lines)**
- First 241 lines are DDL (schema definitions): 17 `CREATE TABLE` blocks in a single `db.exec(...)` string.
- Lines 243–322 are exported prepared statements for seed scripts (`insertProject`, `insertGeo`, `insertStructure`, `insertFeature`, `insertMember`, `insertProjectTeam`, `insertHistory`, `insertHistoryGeo`, `insertHistoryStructure`, `insertHistoryFeature`, `insertTask`, `insertTaskAssignment`, `insertTaskComment`).
- DDL and prepared statements for different domains are co-located in one file. Adding a new table or modifying a statement requires editing a 322-line monolith.
- The prepared statements in `db.ts` are only used by seed scripts, but the same entities have *different* inline `db.prepare` statements inside the router files — duplication with no single source of truth.

### Frontend

**`frontend/src/views/ProjectDetail.tsx` (815 lines)**
- Manages 7 simultaneous queries and 8 simultaneous mutations (lines 109–130).
- Contains 6 separate local state groups: edit project form, tag-member panel, suggest-panel with `Suggestion` inline type, create-task form, create-feature form, plus originalGeoIds/originalStructureIds tracking.
- Defines inline constants repeated from other views: `STATUSES`, `CATEGORIES`, `STATUS_KEY`, `CAT_KEY`, `GEO_TYPE_KEY`, `TASK_STATUS_KEY`, `TASK_PRIORITY_KEY`, `TASK_STATUSES`, `TASK_PRIORITIES` (lines 17–41).
- Utility functions `fmt`, `fmtDate`, `fmtDim`, `initials` defined locally — same or similar versions exist in `TeamMemberDetail.tsx`, `TaskDetail.tsx`.
- The local `Suggestion` type (lines 81–87) is an inline anonymous type inside `useState`.
- `downloadSuggestionCv` async function (lines 89–98) calls `trpcClient` directly bypassing React Query.

**`frontend/src/views/TeamMemberDetail.tsx` (617 lines)**
- Declares `HistoryFormData` type and `emptyHistoryForm` factory inline (lines 38–50).
- Repeats `CAT_KEY`, `GEO_TYPE_KEY`, `STATUS_KEY`, `TASK_STATUS_KEY`, `TASK_PRIORITY_KEY` constants — exact duplicates from `ProjectDetail.tsx`.
- `initials` and `fmtDate` utility functions duplicated (lines 52–56).
- Imports `GeoSection`, `StructureSection`, `Field`, `STRUCT_TYPE_KEY`, `GeoFormEntry`, `StructureFormEntry` from `AddProject.tsx`, which means view files are acting as shared component/type libraries.

**`frontend/src/views/TaskDetail.tsx`**
- `TASK_STATUS_KEY`, `TASK_PRIORITY_KEY`, `TASK_STATUSES`, `TASK_PRIORITIES` constants duplicated a third time (lines 15–23).
- `initials`, `fmtDate` utility functions duplicated again (lines 25–29).

**`frontend/src/views/AddProject.tsx` (507 lines)**
- Exports `GeoSection`, `StructureSection`, `Field`, `STRUCT_TYPE_KEY`, `GeoFormEntry`, `StructureFormEntry` for consumption by other views. A view file is serving as a shared component module.

**`frontend/src/App.tsx`**
- `pageToPath` and `pathToPage` URL-mapping functions are embedded directly in `App.tsx`. These should be a separate router utility.

**General backend pattern: no separation of concerns**
- Every router file is doing four things at once: (1) schema validation, (2) type definitions, (3) DB query execution, (4) response shaping.
- There are zero service or query layer files. All business logic touches `db` directly from inside procedure handlers.
- Shared utility (`extractVerbatimEvidence`) is duplicated across two files with no shared location.

---

## 2. Proposed Backend Structure

```
backend/src/
├── db/
│   ├── client.ts              # Creates and exports the better-sqlite3 instance + pragma setup (currently the top of db.ts)
│   ├── schema.ts              # All CREATE TABLE DDL — one db.exec() call (currently lines 8–241 of db.ts)
│   ├── statements/
│   │   ├── projects.ts        # Prepared statements for projects table (insertProject, etc.)
│   │   ├── geo.ts             # Prepared statements for geo_entries and member_history_geo
│   │   ├── structures.ts      # Prepared statements for structures and member_history_structures
│   │   ├── features.ts        # Prepared statements for project_features and member_history_features
│   │   ├── team.ts            # Prepared statements for team_members, member_cvs, project_team, member_history
│   │   ├── requirements.ts    # Prepared statements for requirement_books and requirements
│   │   └── tasks.ts           # Prepared statements for tasks, task_assignments, task_comments
│   └── index.ts               # Re-exports db client + all statement modules (replaces current db.ts)
│
├── schemas/
│   ├── projects.ts            # ProjectStatusSchema, ProjectCategorySchema, CreateProjectSchema, UpdateProjectSchema
│   ├── geo.ts                 # GeoTypeSchema, CreateGeoEntrySchema, HistoryGeoSchema
│   ├── structures.ts          # CreateStructureSchema, HistoryStructureSchema; exports STRUCTURE_TYPES const
│   ├── features.ts            # CreateFeatureSchema, HistoryFeatureSchema; exports FeatureInput type
│   ├── team.ts                # MemberInputSchema, HistoryInputSchema (composed from geo/structure/feature history schemas)
│   ├── requirements.ts        # BookInputSchema, RequirementInputSchema; exports DISCIPLINES, LEVELS constants
│   └── tasks.ts               # TaskStatusSchema, TaskPrioritySchema, CreateTaskSchema, UpdateTaskSchema
│
├── types/
│   ├── projects.ts            # RawProject type, mapProject() function
│   ├── geo.ts                 # RawGeo type, mapGeo() function
│   ├── structures.ts          # RawStructure type, mapStructure() function; STRUCTURE_TYPES re-exported
│   ├── features.ts            # RawFeature type, mapFeature() function
│   ├── team.ts                # RawMember, RawHistory, RawHistoryGeo, RawHistoryStructure, RawHistoryFeature, RawCv types + all map*() functions
│   ├── requirements.ts        # RawBook, RawRequirement types + mapBook(), mapReq() functions
│   └── tasks.ts               # RawTask, RawAssignment, RawComment types + mapTask(), mapComment() functions
│
├── services/
│   ├── projects.ts            # listProjects(), getProjectById(), createProject(), updateProject(), getProjectStats(), getMyProjects(), getRiskSummary()
│   ├── geo.ts                 # getGeoByProject(), createGeoEntry(), deleteGeoEntry()
│   ├── structures.ts          # getStructuresByProject(), createStructure(), deleteStructure()
│   ├── features.ts            # getFeaturesByProject(), createFeature(), deleteFeature()
│   ├── team.ts                # listMembers(), getMemberById(), createMember(), updateMember(), getByProject(), tagProject(), untagProject(), addHistory(), updateHistory(), deleteHistory(), createWithHistory(), insertHistorySubEntries()
│   ├── requirements.ts        # listBooks(), getBookById(), createBook(), updateBook(), deleteBook(), createRequirement(), updateRequirement(), deleteRequirement(), matchMembersLocal(), DISCIPLINE_KEYWORDS, LEVEL_KEYWORDS, CAT_DISCIPLINE, scoreRequirement()
│   ├── tasks.ts               # getTasksByProject(), getTaskById(), createTask(), updateTask(), deleteTask(), getAssignees(), getComments(), getCommentCount(), assign(), unassign(), addComment(), deleteComment(), getOverdue(), getNearDeadline(), getBlocked()
│   └── matching.ts            # extractVerbatimEvidence() — shared between team and requirements matching
│
├── router/
│   ├── projects.ts            # Thin tRPC procedures: input validation → call service → return (no SQL, no types)
│   ├── geo.ts                 # Thin tRPC procedures
│   ├── structures.ts          # Thin tRPC procedures
│   ├── features.ts            # Thin tRPC procedures
│   ├── team.ts                # Thin tRPC procedures
│   ├── requirements.ts        # Thin tRPC procedures
│   ├── tasks.ts               # Thin tRPC procedures
│   └── index.ts               # Composes appRouter (unchanged)
│
├── lib/
│   ├── parseCv.ts             # (unchanged) Claude API CV parsing
│   ├── parseProject.ts        # (unchanged) Claude API project parsing
│   ├── generateCv.ts          # (unchanged) pdfkit CV generation
│   └── suggestMembersAi.ts    # (unchanged) Claude API member suggestion
│
├── seed/
│   ├── projects.ts            # (unchanged structure, now imports from db/statements/ instead of db.ts)
│   ├── team.ts                # (unchanged structure)
│   ├── requirements.ts        # (unchanged structure)
│   └── tasks.ts               # (unchanged structure)
│
├── trpc.ts                    # (unchanged — 6 lines)
├── index.ts                   # (unchanged — Hono app setup)
└── server.ts                  # (unchanged — entry point)
```

**Key rules for the proposed router layer:**

Each router procedure must be reducible to this pattern:
```ts
create: publicProcedure
  .input(CreateProjectSchema)
  .mutation(({ input }) => projectsService.createProject(input))
```

No `db.prepare`, no `Raw*` type assertions, no mapper calls, no SQL strings inside any file under `router/`.

---

## 3. Proposed Frontend Structure

```
frontend/src/
├── api/
│   ├── projects.ts            # useProjectsList(), useProjectById(), useCreateProject(), useUpdateProject(), useProjectStats() — wraps trpc.projects.* query/mutation hooks with useQuery/useMutation
│   ├── geo.ts                 # useGeoByProject(), useCreateGeo(), useDeleteGeo()
│   ├── structures.ts          # useStructuresByProject(), useCreateStructure(), useDeleteStructure()
│   ├── features.ts            # useFeaturesByProject(), useCreateFeature(), useDeleteFeature()
│   ├── team.ts                # useTeamList(), useMemberById(), useCreateMember(), useUpdateMember(), useByProject(), useTagProject(), useSuggestMembers(), etc.
│   ├── requirements.ts        # useListBooks(), useBookById(), useCreateBook(), useMatchMembers(), etc.
│   └── tasks.ts               # useTasksByProject(), useTaskById(), useCreateTask(), useUpdateTask(), useOverdueTasks(), useByMember(), etc.
│
├── components/
│   ├── shared/
│   │   ├── GeoSection.tsx     # Extracted from AddProject.tsx — reusable geo entry form section
│   │   ├── StructureSection.tsx  # Extracted from AddProject.tsx — reusable structure form section
│   │   ├── Field.tsx          # Extracted from AddProject.tsx — form field wrapper
│   │   ├── StatusBadge.tsx    # Status pill/badge with colour, used in ProjectDetail, SearchProjects, Reports
│   │   ├── PriorityBadge.tsx  # Priority indicator used in tasks views
│   │   └── MemberAvatar.tsx   # Initials avatar circle, replaces the inline `initials()` + render pattern
│   └── Layout.tsx             # (unchanged — top nav, breadcrumb, language toggle)
│
├── constants/
│   ├── projects.ts            # STATUSES, CATEGORIES, STATUS_KEY, CAT_KEY — shared across views
│   ├── geo.ts                 # GEO_TYPE_KEY — shared between ProjectDetail, AddProject, TeamMemberDetail
│   ├── structures.ts          # STRUCT_TYPE_KEY, STRUCTURE_TYPES
│   └── tasks.ts               # TASK_STATUS_KEY, TASK_PRIORITY_KEY, TASK_STATUSES, TASK_PRIORITIES — deduplicated from 3 views
│
├── utils/
│   ├── format.ts              # fmt() (currency), fmtDate(), fmtDim(), initials() — deduplicated from 3+ views
│   └── download.ts            # downloadCv() — extracted from ProjectDetail.tsx downloadSuggestionCv
│
├── types/
│   ├── pages.ts               # Page union type, pageToPath(), pathToPage() — extracted from App.tsx
│   └── suggestions.ts         # Suggestion type used in ProjectDetail and Requirements member-matching panels
│
├── views/
│   ├── Home.tsx               # (unchanged — composition only)
│   ├── SearchProjects.tsx     # Slimmed: imports from api/projects, constants/projects
│   ├── AddProject.tsx         # Slimmed: no longer exports GeoSection/StructureSection/Field (moved to components/shared)
│   ├── ProjectDetail.tsx      # Slimmed from 815 lines: imports hooks from api/, constants from constants/, components from components/shared/
│   ├── Reports.tsx            # (unchanged structure, imports hooks from api/)
│   ├── TeamMembers.tsx        # Imports from api/team
│   ├── TeamMemberDetail.tsx   # Slimmed from 617 lines: imports shared constants, utils, hooks
│   ├── Requirements.tsx       # Imports from api/requirements, constants/
│   └── TaskDetail.tsx         # Slimmed: imports from api/tasks, constants/tasks, utils/format
│
├── i18n/
│   ├── context.tsx            # (unchanged)
│   ├── en.ts                  # (unchanged)
│   └── pt.ts                  # (unchanged)
│
├── auth/
│   └── index.ts               # (unchanged)
│
├── App.tsx                    # Simplified: imports Page type + navigation utils from types/pages.ts
├── trpc.ts                    # (unchanged — 20 lines)
├── main.tsx                   # (unchanged)
└── index.css                  # (unchanged)
```

**Key rules for the proposed view layer:**

- No view file imports from another view file (the current `AddProject.tsx`-as-shared-library pattern is eliminated).
- No view file defines `Raw*` types or calls `trpcClient` directly.
- Duplicate constant objects (`STATUS_KEY`, `TASK_STATUS_KEY`, etc.) exist in exactly one place in `constants/`.
- Utility functions (`initials`, `fmtDate`, `fmt`) exist in exactly one place in `utils/format.ts`.
- Each `api/` hook file re-exports `useQueryClient` invalidation helpers so views do not manually call `qc.invalidateQueries`.

---

## 4. Migration Strategy

The goal is to arrive at the proposed structure without ever breaking the running app. The approach is a series of small, independently-verifiable steps — no big-bang rewrites.

### Phase 0: Preparation (no functional change)
1. Create the empty directory stubs (`db/statements/`, `schemas/`, `services/`, `frontend/src/api/`, `frontend/src/constants/`, `frontend/src/utils/`, `frontend/src/types/`, `frontend/src/components/shared/`).
2. Ensure `npm run dev` and `npm run build` still pass after the empty directories are added.

### Phase 1: Backend — extract types and schemas (lowest risk)
Work domain by domain. For each domain (start with the smallest: `geo`, then `structures`, `features`, then `projects`, then `tasks`, then `requirements`, finally `team`):

1. Create `backend/src/types/<domain>.ts` — move `Raw*` types and `map*()` functions out of the router file. Update the router file's import.
2. Create `backend/src/schemas/<domain>.ts` — move all Zod schemas and domain constants (e.g., `STRUCTURE_TYPES`, `DISCIPLINES`) out of the router file. Update imports.
3. Verify `npm run build` passes after each domain.

This phase has zero runtime risk — it is pure file reorganisation. The router files still call `db.prepare` directly; behaviour is unchanged.

**Recommended order:** geo → structures → features → projects → tasks → requirements → team

### Phase 2: Backend — extract services
Work domain by domain in the same order:

1. Create `backend/src/services/<domain>.ts`.
2. Move all `db.prepare` calls, helper functions (e.g., `getAssignees`, `insertHistoryGeoEntries`, `scoreRequirement`), and multi-step transaction logic from the router into service functions.
3. Update the router procedures to call `service.functionName(input)`.
4. Move shared `extractVerbatimEvidence` to `services/matching.ts` and update both `team.ts` and `requirements.ts` services to import from there.
5. `npm run build` after each domain.

**team.ts is the hardest** — leave it for last within this phase due to the five `Raw*` types, multiple prepared statements at module level, and the interleaved `suggestMembers` AI logic.

### Phase 3: Backend — split db.ts
1. Create `backend/src/db/client.ts` with just the `Database` instantiation and pragma calls.
2. Create `backend/src/db/schema.ts` with the `db.exec(...)` DDL block.
3. Create one `backend/src/db/statements/<domain>.ts` per domain, each importing `db` from `client.ts` and exporting the relevant prepared statements.
4. Create `backend/src/db/index.ts` that re-exports everything (so existing `import { db } from '../db'` continues to work as `import { db } from '../db/index'` — TypeScript resolves `../db` to `../db/index.ts` automatically).
5. Update seed scripts to import from `db/statements/<domain>` instead of `db`.

### Phase 4: Frontend — extract constants and utils
1. Create `frontend/src/constants/projects.ts`, `constants/geo.ts`, `constants/structures.ts`, `constants/tasks.ts`. Copy the duplicate constant objects into them.
2. Create `frontend/src/utils/format.ts`. Copy `initials`, `fmtDate`, `fmt`, `fmtDim` into it.
3. Update all view files to import from the new locations. Delete the local copies.
4. `npm run build` (frontend lint) after each file.

### Phase 5: Frontend — extract shared components
1. Move `GeoSection`, `StructureSection`, `Field` from `AddProject.tsx` to `frontend/src/components/shared/`. Update all imports.
2. Create `StatusBadge`, `PriorityBadge`, `MemberAvatar` components from the inline JSX patterns that appear in multiple views.

### Phase 6: Frontend — extract api hooks
For each domain:
1. Create `frontend/src/api/<domain>.ts`.
2. Move `useQuery(trpc.<domain>.*...` and `useMutation(trpc.<domain>.*...)` call patterns into custom hooks that encapsulate query options and invalidation logic.
3. Update view files to call the custom hooks.

### Phase 7: Frontend — extract types and routing utils
1. Move `Page` union type, `pageToPath`, `pathToPage` from `App.tsx` to `frontend/src/types/pages.ts`.
2. Move inline `Suggestion` type from `ProjectDetail.tsx` to `frontend/src/types/suggestions.ts`.
3. Extract `downloadSuggestionCv` to `frontend/src/utils/download.ts`.

### What to avoid
- Do not rename tRPC router procedure names at any point — the frontend depends on them.
- Do not change Zod schema shapes during this refactor — only move them.
- Do not merge Phase 1 and Phase 2 for the same domain in a single commit — keep type extraction and service extraction as separate steps to isolate rollback points.

---

## 5. Per-Agent Task Breakdown

| Agent | Owns | Scope |
|-------|------|-------|
| **Architecture & Docs Agent** | Phase 1 (types/schemas), Phase 3 (db split), Phase 7 (frontend types/routing utils) | Structural moves only — no business logic changes. Works on backend types/schemas and db/ directory. Moves Page type out of App.tsx. |
| **Features Agent** | Phase 2 (backend services) | Extracts and owns all service functions. Responsible for the `services/` directory. Must not change observable behaviour of any procedure — same inputs produce same outputs. Handles `services/matching.ts` deduplication. |
| **UI Agent** | Phase 4 (frontend constants/utils), Phase 5 (shared components), Phase 6 (api hooks) | Owns the `constants/`, `utils/`, `components/shared/`, and `api/` directories. Responsible for slimming views by wiring up the new imports. |
| **Seed Data Agent** | Phase 3 step 5 only | Updates seed scripts to import from `db/statements/<domain>` after Architecture Agent creates them. Low-risk change — just import path updates. |

**Coordination point:** Architecture Agent must complete Phase 1 for a given domain before Features Agent begins Phase 2 for that domain (services need the types). Features Agent must complete Phase 2 before UI Agent can safely extract api hooks in Phase 6 (hooks call services indirectly via tRPC — but the procedure signatures must be stable first).

---

## 6. File Change Summary

| Current file | Action | New file(s) | What moves |
|---|---|---|---|
| `backend/src/db.ts` | Split | `backend/src/db/client.ts` | Database instantiation + pragma setup (lines 1–6) |
| `backend/src/db.ts` | Split | `backend/src/db/schema.ts` | DDL `db.exec(...)` block (lines 8–241) |
| `backend/src/db.ts` | Split | `backend/src/db/statements/projects.ts` | `insertProject` (lines 245–250) |
| `backend/src/db.ts` | Split | `backend/src/db/statements/geo.ts` | `insertGeo`, `insertHistoryGeo` (lines 252–295) |
| `backend/src/db.ts` | Split | `backend/src/db/statements/structures.ts` | `insertStructure`, `insertHistoryStructure` (lines 261–302) |
| `backend/src/db.ts` | Split | `backend/src/db/statements/features.ts` | `insertFeature`, `insertHistoryFeature` (lines 268–307) |
| `backend/src/db.ts` | Split | `backend/src/db/statements/team.ts` | `insertMember`, `insertProjectTeam`, `insertHistory` (lines 273–286) |
| `backend/src/db.ts` | Split | `backend/src/db/statements/tasks.ts` | `insertTask`, `insertTaskAssignment`, `insertTaskComment` (lines 309–322) |
| `backend/src/db.ts` | Replace with re-export barrel | `backend/src/db/index.ts` | — |
| `backend/src/router/projects.ts` | Extract | `backend/src/types/projects.ts` | `RawProject` type (lines 249–269), `mapProject()` (lines 271–293) |
| `backend/src/router/projects.ts` | Extract | `backend/src/schemas/projects.ts` | `ProjectStatusSchema`, `ProjectCategorySchema`, `CreateProjectSchema` (lines 6–26) |
| `backend/src/router/projects.ts` | Extract | `backend/src/services/projects.ts` | All `db.prepare(...)` SQL + filtering logic from list, byId, create, update, stats, myProjects, riskSummary procedures |
| `backend/src/router/geo.ts` | Extract | `backend/src/types/geo.ts` | `RawGeo` type (lines 68–76), `mapGeo()` (lines 78–88) |
| `backend/src/router/geo.ts` | Extract | `backend/src/schemas/geo.ts` | `GeoTypeSchema`, `CreateGeoEntrySchema` (lines 5–25) |
| `backend/src/router/geo.ts` | Extract | `backend/src/services/geo.ts` | All `db.prepare` calls in procedures |
| `backend/src/router/structures.ts` | Extract | `backend/src/types/structures.ts` | `RawStructure` type (lines 8–15), `mapStructure()` (lines 17–26), `STRUCTURE_TYPES` const (line 5) |
| `backend/src/router/structures.ts` | Extract | `backend/src/schemas/structures.ts` | `CreateStructureSchema` (lines 28–45) |
| `backend/src/router/structures.ts` | Extract | `backend/src/services/structures.ts` | All `db.prepare` calls in procedures |
| `backend/src/router/features.ts` | Extract | `backend/src/types/features.ts` | `RawFeature` type (lines 5–9), `mapFeature()` (lines 11–17) |
| `backend/src/router/features.ts` | Extract | `backend/src/schemas/features.ts` | `CreateFeatureSchema` (lines 19–29), `FeatureInput` type (line 31) |
| `backend/src/router/features.ts` | Extract | `backend/src/services/features.ts` | All `db.prepare` calls in procedures |
| `backend/src/router/tasks.ts` | Extract | `backend/src/types/tasks.ts` | `RawTask`, `RawAssignment`, `RawComment` (lines 10–23), `mapTask()`, `mapComment()` (lines 24–34) |
| `backend/src/router/tasks.ts` | Extract | `backend/src/schemas/tasks.ts` | `TaskStatusSchema`, `TaskPrioritySchema` (lines 5–6), inline create/update schemas in procedures |
| `backend/src/router/tasks.ts` | Extract | `backend/src/services/tasks.ts` | `getAssignees()`, `getComments()`, `getCommentCount()` (lines 38–56), all `db.prepare` calls |
| `backend/src/router/requirements.ts` | Extract | `backend/src/types/requirements.ts` | `RawBook`, `RawRequirement` (lines 40–49), `mapBook()`, `mapReq()` (lines 51–64) |
| `backend/src/router/requirements.ts` | Extract | `backend/src/schemas/requirements.ts` | `BookInputSchema`, `RequirementInputSchema` (lines 68–84), `DISCIPLINES`, `LEVELS` (lines 9–10) |
| `backend/src/router/requirements.ts` | Extract | `backend/src/services/requirements.ts` | `scoreRequirement()` (lines 103–142), all `db.prepare` calls, `DISCIPLINE_KEYWORDS`, `LEVEL_KEYWORDS`, `CAT_DISCIPLINE` constants (lines 15–33) |
| `backend/src/router/requirements.ts` | Deduplicate | `backend/src/services/matching.ts` | `extractVerbatimEvidence()` (lines 88–99, also line 11–21 of team.ts) |
| `backend/src/router/team.ts` | Extract | `backend/src/types/team.ts` | `RawMember`, `RawHistory`, `RawHistoryGeo`, `RawHistoryStructure`, `RawHistoryFeature`, `RawCv` (lines 24–57), all `map*()` functions (lines 59–77) |
| `backend/src/router/team.ts` | Extract | `backend/src/schemas/team.ts` | `MemberInputSchema`, `HistoryGeoSchema`, `HistoryStructureSchema`, `HistoryFeatureSchema`, `HistoryInputSchema` (lines 80–147) |
| `backend/src/router/team.ts` | Extract | `backend/src/services/team.ts` | `stmtHistoryGeo/Structure/Feature` prepared statements (lines 150–169), `insertHistoryGeoEntries()`, `insertHistoryStructures()`, `insertHistoryFeatures()`, `getHistoryWithSubEntries()` (lines 171–215), entire body of `suggestMembers` procedure logic (lines 439–551) |
| `frontend/src/App.tsx` | Extract | `frontend/src/types/pages.ts` | `Page` union type (lines 13–23), `pageToPath()` (lines 27–39), `pathToPage()` (lines 42–67) |
| `frontend/src/views/AddProject.tsx` | Extract | `frontend/src/components/shared/GeoSection.tsx` | `GeoSection` component + `GeoFormEntry` type |
| `frontend/src/views/AddProject.tsx` | Extract | `frontend/src/components/shared/StructureSection.tsx` | `StructureSection` component + `StructureFormEntry` type |
| `frontend/src/views/AddProject.tsx` | Extract | `frontend/src/components/shared/Field.tsx` | `Field` component |
| `frontend/src/views/ProjectDetail.tsx` | Extract | `frontend/src/constants/projects.ts` | `STATUSES`, `CATEGORIES`, `STATUS_KEY`, `CAT_KEY` (lines 17–27) |
| `frontend/src/views/ProjectDetail.tsx` | Extract | `frontend/src/constants/geo.ts` | `GEO_TYPE_KEY` (lines 28–31) |
| `frontend/src/views/ProjectDetail.tsx` | Extract | `frontend/src/constants/tasks.ts` | `TASK_STATUS_KEY`, `TASK_PRIORITY_KEY`, `TASK_STATUSES`, `TASK_PRIORITIES` (lines 32–41) |
| `frontend/src/views/ProjectDetail.tsx` | Extract | `frontend/src/utils/format.ts` | `fmt()`, `fmtDate()`, `fmtDim()`, `initials()` (lines 42–50) |
| `frontend/src/views/ProjectDetail.tsx` | Extract | `frontend/src/types/suggestions.ts` | `Suggestion` inline type (lines 81–87) |
| `frontend/src/views/ProjectDetail.tsx` | Extract | `frontend/src/utils/download.ts` | `downloadSuggestionCv()` (lines 89–98) |
| `frontend/src/views/ProjectDetail.tsx` | Extract | `frontend/src/api/projects.ts` | All `useQuery(trpc.projects.*...)` and `useMutation(trpc.projects.*...)` calls |
| `frontend/src/views/TeamMemberDetail.tsx` | Remove duplicates | (imports from constants/, utils/) | `CAT_KEY`, `GEO_TYPE_KEY`, `STATUS_KEY`, `TASK_STATUS_KEY`, `TASK_PRIORITY_KEY`, `initials`, `fmtDate` — use shared versions |
| `frontend/src/views/TaskDetail.tsx` | Remove duplicates | (imports from constants/, utils/) | `TASK_STATUS_KEY`, `TASK_PRIORITY_KEY`, `TASK_STATUSES`, `TASK_PRIORITIES`, `initials`, `fmtDate` — use shared versions |
| `frontend/src/views/Requirements.tsx` | Extract | `frontend/src/api/requirements.ts` | All `useQuery`/`useMutation` tRPC hook calls |

---

*This document is a plan only. No source files were modified. Implementation should follow the migration phases described in Section 4.*
