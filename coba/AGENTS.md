# Agent Status Board

This file is the shared coordination log for all agents working on COBA.
Each agent must update their section when they start, change, or finish a task.

**Format rule:** The `Last updated` field must always include both date AND time in `YYYY-MM-DD HH:MM` format (24h). **Always get the real current time by running `date +"%Y-%m-%d %H:%M"` (bash) before writing — never guess or hardcode a time.**

## At a Glance

| Agent | Status | Working On | Last Updated |
|-------|--------|------------|--------------|
| Features | Done | Added priority field (7 levels) to projects | 2026-04-11 14:55 |
| Architecture & Docs | Done | TEAM_MEMBER_REWORK_PLAN.md written | 2026-04-11 14:43 |
| UI | Done | Project priority display and editing complete | 2026-04-11 15:00 |
| Seed Data | Working | Replacing project seed data from DGP_R37-2025_Ata.pdf | 2026-04-11 14:59 |
| Reporting | Done | Added priority list tab to Reports page | 2026-04-11 14:59 |
| Testing | Done | Updated TESTING_STRATEGY.md for refactored file layout | 2026-04-11 14:40 |

_Agents: update this table (status, working on, last updated) whenever you pick up or finish a task._

---

## Features Agent
**Status:** Done
**Last updated:** 2026-04-11 14:55

### Completed
- Initial codebase exploration — identified missing and incomplete features
- Added Project Features UI section to ProjectDetail.tsx (query, create/delete mutations, inline add form, feature cards with delete, i18n keys in en.ts and pt.ts)
- Confirmed structure lat/lng inputs already present in StructureSection (AddProject.tsx) and wired in both create paths
- Added inline delete confirmation for tasks in TaskDetail.tsx (confirmDelete state, Confirm/Cancel buttons, i18n keys)
- Confirmed requirement book edit form already has category field wired correctly — no fix needed
- Created dedicated Home page (views/Home.tsx) with hero section, KPI stats row (total/active projects, team members, budget), recent active projects list, urgent task badges (overdue + near deadline), and quick action buttons
- Wired 'home' into App.tsx: added to Page union, '/' maps to home, 'search' now maps to '/projects', fallback route goes to home
- Added "Início" nav item as first item in Layout.tsx topbar; brand button navigates home; task view activeTab fixed to 'search'
- Added 14 i18n keys to en.ts and pt.ts for all home page strings

### Findings Summary
- Project Features frontend integration missing (backend fully implemented)
- Member history features never displayed in TeamMemberDetail
- CV upload missing from existing member detail view
- No delete confirmation dialogs on tasks
- Requirement book edit form missing `category` field
- Structure lat/lng fields exist in DB — form inputs confirmed already present in AddProject.tsx StructureSection

### Currently Working On
_Nothing — AUTH_PLAN backend implementation complete_

### Queue
- [x] Add project features UI section to ProjectDetail
- [x] Add lat/lng inputs to structure forms (already implemented in StructureSection)
- [x] Add delete confirmation modals for tasks
- [x] Fix requirement book edit form (add category field) — already implemented
- [x] Add member history features display to TeamMemberDetail (done by UI Agent)
- [x] Add CV upload form to TeamMemberDetail (done by UI Agent)
- [x] Create dedicated Home page with stats, recent projects, urgent tasks, quick actions
- [x] AUTH_PLAN backend: role+password_hash columns, myProjects, riskSummary, myOverdue, myNearDeadline

---

## Architecture & Docs Agent
**Status:** Done
**Last updated:** 2026-04-11 14:43

### Completed
- Architecture and documentation review
- Wrote AUTH_PLAN.md (auth abstraction design)
- Created `frontend/src/auth/index.ts` — localStorage-backed auth layer with `CurrentUser` type, `getCurrentUser`, `setCurrentUser`, `signOut`, and `useCurrentUser` hook; three exported functions are the AWS/Cognito swap points
- Wrote file-level docs for all 24 main source files: 11 backend docs in `docs/backend/`, 13 frontend docs in `docs/frontend/`, plus `docs/README.md` and `docs/index.md` as navigation index
- **Phase 1** — Extracted Raw types and map*() functions into `backend/src/types/<domain>.ts` for all 7 domains (geo, structures, features, projects, tasks, requirements, team); extracted Zod schemas and domain constants into `backend/src/schemas/<domain>.ts`; router files now import from these new locations
- **Phase 1 (matching)** — Created `backend/src/services/matching.ts` with single canonical `extractVerbatimEvidence()` function; both `router/team.ts` and `router/requirements.ts` now import from there (no more duplication)
- **Phase 3** — Split `backend/src/db.ts` (322 lines) into: `db/client.ts` (db instantiation), `db/schema.ts` (DDL), `db/statements/{projects,geo,structures,features,team,requirements,tasks}.ts` (prepared statements), `db/index.ts` (re-export barrel with schema side-effect import); original `db.ts` replaced with re-export barrel for backward compat
- **Phase 3 (seeds)** — Updated `seed/projects.ts`, `seed/team.ts`, `seed/tasks.ts` to import statements from `db/statements/<domain>` instead of from `db`; updated `seed/requirements.ts` to use `insertBook`/`insertRequirement` from `db/statements/requirements` (removed inline `db.prepare` calls)
- **Phase 7** — Created `frontend/src/types/pages.ts` with `Page` union type, `pageToPath()`, `pathToPage()`; App.tsx now imports from there and re-exports `Page` for backward compat; created `frontend/src/types/suggestions.ts` with `Suggestion` type (moved from ProjectDetail.tsx inline); created `frontend/src/utils/download.ts` with `downloadSuggestionCv()` (moved from ProjectDetail.tsx)
- **Bug fix** — `tasks.overdue` and `tasks.nearDeadline` procedures now return `projectReference` field (via JOIN instead of lookup) to match the shape of `tasks.myOverdue` and `tasks.myNearDeadline`; fixes pre-existing TypeScript error in Home.tsx
- Build verified: `npm run build` passes with zero TypeScript errors

### Findings Summary
- CLAUDE.md does not exist (only README.md)
- Zero authentication — all procedures use `publicProcedure`
- CORS hardcoded to localhost:5173
- Bug: member history features are never inserted into DB despite schema supporting it (team.ts:144–146)
- N+1 queries in getHistoryWithSubEntries (team.ts:208–215)
- No pagination on list endpoints
- No tests anywhere in the codebase
- Error messages inconsistently in EN vs PT

### Currently Working On
_Nothing — TEAM_MEMBER_REWORK_PLAN.md complete_

### Queue
- [ ] Create CLAUDE.md with developer guide
- [ ] Fix member history features bug (team.ts:144–146)
- [ ] Document all tRPC endpoints
- [ ] Add pagination to projects.list and team.list
- [ ] Standardize error messages to Portuguese
- [x] Write docs/TEAM_MEMBER_REWORK_PLAN.md — non-user members, promote flow, CV diff/accept

---

## UI Agent
**Status:** Done
**Last updated:** 2026-04-11 15:00

### Completed
- **Phase 6** — Extracted all tRPC query/mutation calls into `frontend/src/api/` hooks layer:
  - `api/projects.ts` — useProjectsList, useProjectById, useProjectStats, useMyProjects, useRiskSummary, useUpdateProject, useCreateProject
  - `api/geo.ts` — useGeoByProject, useCreateGeo, useDeleteGeo
  - `api/structures.ts` — useStructuresByProject, useCreateStructure, useDeleteStructure
  - `api/features.ts` — useFeaturesByProject, useCreateFeature, useDeleteFeature
  - `api/team.ts` — useTeamList, useMemberById, useTeamByProject, useCreateMember, useCreateMemberWithHistory, useUpdateMember, useTagProject, useUntagProject, useAddHistory, useUpdateHistory, useDeleteHistory, useAttachCv, useSuggestMembers
  - `api/requirements.ts` — useListBooks, useBookById, useCreateBook, useUpdateBook, useDeleteBook, useCreateRequirement, useUpdateRequirement, useDeleteRequirement, useMatchMembers
  - `api/tasks.ts` — useTasksByProject, useTaskById, useTasksByMember, useOverdueTasks, useNearDeadlineTasks, useBlockedTasks, useMyOverdueTasks, useMyNearDeadlineTasks, useCreateTask, useUpdateTask, useDeleteTask, useAssignTask, useUnassignTask, useAddComment, useDeleteComment
  - Updated 8 views (SearchProjects, ProjectDetail, Reports, TeamMembers, TeamMemberDetail, Requirements, TaskDetail, Home) to use api hooks; removed direct trpc.* query/mutation calls from views
  - Direct trpcClient calls (CV download, imperative geo/structure saves) left in place as designed
  - Build verified: `npm run build` passes with zero TypeScript errors
- Full CSS and view component audit
- Added member history features display to TeamMemberDetail (historyFeaturesTitle i18n key, features sub-section after structures)
- Added CV upload form to TeamMemberDetail (hidden file input + upload button in CV section heading row, attachCv mutation, success/error alerts)
- Changed default tab in Reports.tsx from 'summary' to 'tasks' so the Tasks tab is shown on first load
- Added smart default ordering to Search Projects page: backend now sorts by status priority (active → planning → suspended → cancelled → completed) then by start_date DESC; added `sortBy` param (relevance/newest/budget) to projects.list; added sort dropdown to SearchProjects.tsx filter row; added sortRelevance/sortNewest/sortBudget i18n keys to en.ts and pt.ts
- AUTH_PLAN frontend UI: created UserSwitcher.tsx (dev-only avatar button with dropdown, auto-selects first member, full backdrop, role badges), updated Layout.tsx to render UserSwitcher in DEV mode after lang toggle, refactored Home.tsx into UserHome + OversightHome (role-based routing via useCurrentUser), added oversight portfolio risk table + KPI row + global risk sections, added CSS blocks for user switcher and oversight home, added 10 i18n keys to en.ts and pt.ts
- UserSwitcher scrollable popup: replaced fixed-size dropdown with 360px-wide, max-480px-tall floating panel; member list wrapped in `.user-switcher-scroll` div with `overflow-y: auto`; styled scrollbar; click-outside backdrop unchanged
- Due date labels on task cards across all views (Reports, ProjectDetail, Home) — prepended `{t('taskDue')}: ` using existing i18n key
- Status circle legend in ProjectDetail tasks section — compact inline legend row with coloured square dots and translated status labels, CSS added to index.css
- **Phase 4** — Extracted duplicate constants/utils into shared modules:
  - `frontend/src/constants/projects.ts` — STATUSES, CATEGORIES, STATUS_KEY, CAT_KEY
  - `frontend/src/constants/geo.ts` — GEO_TYPE_KEY
  - `frontend/src/constants/structures.ts` — STRUCTURE_TYPES, STRUCT_TYPE_KEY
  - `frontend/src/constants/tasks.ts` — TASK_STATUS_KEY, TASK_PRIORITY_KEY, TASK_STATUSES, TASK_PRIORITIES
  - `frontend/src/utils/format.ts` — fmt(), fmtDate(), fmtDim(), initials()
  - Updated all 7 view files (ProjectDetail, TeamMemberDetail, TaskDetail, AddProject, SearchProjects, Reports, Requirements) to import from new locations; removed all local duplicate definitions
- **Phase 5** — Extracted shared components from AddProject.tsx:
  - `frontend/src/components/shared/Field.tsx` — Field component
  - `frontend/src/components/shared/GeoSection.tsx` — GeoSection + GeoFormEntry type
  - `frontend/src/components/shared/StructureSection.tsx` — StructureSection + StructureFormEntry type
  - `frontend/src/components/shared/index.ts` — barrel export
  - AddProject.tsx slimmed: imports from components/shared/, no longer exports shared components
  - ProjectDetail.tsx and TeamMemberDetail.tsx redirected from AddProject.tsx imports to components/shared/

### Findings Summary
- `--muted`, `--card`, `--r-md`, `--r-lg` CSS variables used but never defined in :root
- `.btn-primary` class used in TeamMembers.tsx:233 but no CSS rule exists
- `.alert--error` used in TeamMembers.tsx:244 and AddProject.tsx:262 but only `.alert--success` is defined
- Cancel button text invisible (uses undefined `--muted`)
- PM autocomplete: dark text on dark navy (poor contrast)
- No hover state on form inputs
- `.btn-submit:disabled` missing `cursor: not-allowed`
- Missing empty states in list sections

- **Project priority** — Added 7-level priority display and editing to SearchProjects, ProjectDetail, AddProject; added priority sort option; updated backend sortBy enum + service sort logic; added 8 i18n keys (EN/PT); added priority badge CSS classes to index.css; constants in frontend/src/constants/projects.ts

### Currently Working On
_Nothing — priority display/editing complete_

### Queue
- [ ] Add missing CSS variables to :root (--muted, --card, --r-md, --r-lg)
- [ ] Add .btn-primary rule
- [ ] Add .alert--error rule
- [ ] Fix cancel button text color
- [ ] Fix PM autocomplete contrast
- [ ] Add hover state to .input
- [ ] Add cursor:not-allowed to disabled buttons
- [ ] Add empty state components to list views

---

## Seed Data Agent
**Status:** Working
**Last updated:** 2026-04-11 14:59

### Completed
- Full seed data quality review across all 16 tables
- Rewrote generateCv.ts with professional PDF layout (header, divider, profile, project history with geo/structure sub-bullets, page numbers)
- Expanded team.ts from 8 to 30 members (22 new Portuguese civil engineering professionals)
- Expanded projects.ts from 10 to 31 projects (21 new projects, varied statuses/categories/countries)
- Added requirement books for new projects (6 new books across transport/water/energy/environment categories)
- Added 26 tasks for new active/planning projects
- Tagged new members to new projects across 15+ project_team assignments

### Findings Summary
- All 16 tables are seeded (100% coverage)
- Previously: no "suspended" or "cancelled" statuses — now fixed (3 suspended, 2 cancelled)
- Previously: only 3 requirement books — now 9 books across all categories
- Previously: only 8 team members and 10 projects — now 30 members and 31 projects

### Currently Working On
_Nothing — all assigned tasks complete_

### Queue
- [x] Rewrite generateCv.ts with professional PDF format
- [x] Add 22+ more team members to team.ts
- [x] Add 20+ more projects to projects.ts
- [x] Add requirement books for new projects
- [x] Add tasks for new active/planning projects
- [x] Tag new members to new projects
- [x] Add role: 'user' explicitly to all 30 insertMember.run() calls in team.ts
- [x] Add oversight1 (Margarida Ferreira) and oversight2 (Rui Monteiro) with role: 'oversight' at end of seedTeam()

---

## Reporting Agent
**Status:** Done
**Last updated:** 2026-04-11 14:59

### Completed
- Full reporting gap analysis — Reports.tsx vs. all available backend data
- Split Reports.tsx into three tabs: Resumo (Summary), Tarefas (Tasks), Equipa (Team)
- Added `blocked` procedure to tasks.ts router (queries tasks with status='blocked', JOIN projects, camelCase mapping)
- Added "Tarefas Bloqueadas" / "Blocked Tasks" section to Tasks tab in Reports.tsx
- Added 4 new i18n keys to en.ts and pt.ts: reportsBlockedTitle, reportsBlockedEmpty, reportsTabSummary, reportsTabTasks, reportsTabTeam, reportsTeamComingSoon
- Fixed "Tarefas Bloqueadas" showing empty: seed/tasks.ts was failing due to FK violations when mid() returned null for unknown member names (Manuel Fernandes, Filipa Tavares, Ricardo Neves), rolling back the entire seedTasks transaction and leaving zero tasks in DB. Added assign() helper that skips insertTaskAssignment when member not found.
- Added `projects.priorityList` tRPC procedure (service + router) — returns active projects ordered by priority CASE, with per-project task summary counts (total, done, in_progress, blocked, overdue)
- Added `usePriorityList()` hook to frontend/src/api/projects.ts
- Added "Prioridades" tab (key: 'priority') to Reports.tsx with clickable table: priority badge, ref, name, PM, task progress bar, blocked/overdue counts
- Added 3 i18n keys (tabPriority, priorityListTitle, colTaskProgress) to en.ts and pt.ts
- Added CSS for .priority-list-table, .priority-progress-bar, .priority-count-red to index.css
- Also fixed pre-existing SearchProjects sortBy type mismatch (linter auto-added 'priority' sort to backend enum + service)
- Build verified: npm run build passes with zero errors

### Findings Summary
- Reports currently shows: project KPIs, by-status/category/country/year tables, overdue/near-deadline tasks
- 5 entire data domains have zero reporting coverage: tasks, team utilization, geo entries, structures, requirements
- Budget reporting only shows total EUR — no breakdown by category or status
- Needs 5 new backend stat endpoints and 5 new frontend sections

### Currently Working On
_Nothing — priority list tab complete_

### Queue
**Backend endpoints to add:**
- [ ] `tasks.stats()` — count by status, priority, overdue rate (tasks.ts)
- [ ] `team.utilization()` — member project counts, idle members (team.ts)
- [ ] `geo.stats()` — entries by type, soil type distribution (geo.ts)
- [ ] `structures.stats()` — by type, avg dimensions (structures.ts)
- [ ] `requirements.stats()` — by discipline/level, fulfillment gap (requirements.ts)
- [ ] Enhance `projects.stats()` with budget breakdown by category/status

**Frontend sections to add to Reports.tsx:**
- [ ] TaskStatsSection — status/priority breakdown
- [ ] TeamUtilizationSection — member load table
- [ ] GeoStatsSection — entry type + soil type charts
- [ ] StructureStatsSection — type distribution
- [ ] RequirementStatsSection — discipline/level table

**Translations:**
- [ ] Add ~25 new i18n keys to en.ts and pt.ts

---

## Testing Agent
**Status:** Done
**Last updated:** 2026-04-11 14:40

### Completed
- Explored entire codebase: all 7 routers, all AI lib files, all 9 view components, auth layer, i18n context, and both package.json files
- Wrote `docs/TESTING_STRATEGY.md` — comprehensive strategy covering tooling install, backend unit tests per router, AI mock patterns, PDF smoke testing, frontend RTL approach, tRPC mocking with msw, i18n mock, component priority tiers, 7 Playwright E2E user journeys, coverage targets by layer, full GitHub Actions CI structure, and 7-phase priority order

### Currently Working On
_Nothing — assigned tasks complete_

### Queue

**Phase 1 — Backend infrastructure + core routers**
- [ ] Install Vitest in `backend/`; write `vitest.config.ts`
- [ ] Write `backend/src/__tests__/setup.ts` (resetDb + beforeEach)
- [ ] Write `backend/src/__tests__/fixtures.ts` (createProject, createMember, createTask, createBook helpers)
- [ ] Write `backend/src/__tests__/projects.test.ts` (list, byId, create, update, stats, myProjects, riskSummary)
- [ ] Write `backend/src/__tests__/tasks.test.ts` (create, update, byProject, overdue, nearDeadline, blocked, myOverdue, myNearDeadline, assign/unassign, addComment, deleteComment)
- [ ] Write `backend/src/__tests__/team.test.ts` (create, byId, update, tagProject, untagProject, addHistory, updateHistory, deleteHistory, attachCv, createWithHistory, suggestMembers local)

**Phase 2 — Remaining backend routers + AI libs**
- [ ] Write `backend/src/__tests__/requirements.test.ts` (books CRUD, requirements CRUD, matchMembers local scoring)
- [ ] Write `backend/src/__tests__/geo.test.ts` (byProject, create, delete + FK cascade)
- [ ] Write `backend/src/__tests__/structures.test.ts`
- [ ] Write `backend/src/__tests__/features.test.ts`
- [ ] Write `backend/src/__tests__/parseCv.test.ts` (vi.mock Anthropic SDK; success, no-key, malformed JSON, markdown-wrapped JSON)
- [ ] Write `backend/src/__tests__/parseProject.test.ts` (same four cases)
- [ ] Write `backend/src/__tests__/suggestMembersAi.test.ts` (success, non-array response, no-key)
- [ ] Write `backend/src/__tests__/generateCv.test.ts` (Buffer smoke test; edge cases: empty history, no bio)

**Phase 3 — Frontend unit tests**
- [ ] Install Vitest + RTL + jsdom + msw in `frontend/`; write `vite.config.ts` test block
- [ ] Write `frontend/src/__tests__/setup.ts` (renderWithProviders + msw server setup)
- [ ] Write `frontend/src/__tests__/auth.test.ts` (getCurrentUser, setCurrentUser, signOut, useCurrentUser hook)
- [ ] Write `frontend/src/__tests__/routing.test.ts` (pageToPath, pathToPage — requires exporting from App.tsx)
- [ ] Write `frontend/src/__tests__/SearchProjects.test.tsx` (loading, render, filter, sort, navigate on card click)
- [ ] Write `frontend/src/__tests__/ProjectDetail.test.tsx` (view/edit toggle, geo/structure/feature CRUD sections, team tagging)
- [ ] Write `frontend/src/__tests__/TaskDetail.test.tsx` (status change, comment add, delete)

**Phase 4 — Playwright E2E**
- [ ] Install Playwright; write `playwright.config.ts`; add `e2e/fixtures/sample.pdf`
- [ ] Write `e2e/projects/create-project.spec.ts` (Journey 1)
- [ ] Write `e2e/tasks/task-lifecycle.spec.ts` (Journey 3)
- [ ] Write `e2e/team/add-member-assign.spec.ts` (Journey 2)
- [ ] Write `e2e/requirements/requirement-matching.spec.ts` (Journey 7)
- [ ] Write `e2e/auth/user-switcher.spec.ts` (Journey 4)
- [ ] Write `e2e/reports/reports-tabs.spec.ts` (Journey 5)
- [ ] Write `e2e/team/cv-upload.spec.ts` (Journey 6)

**Phase 5 — CI + remaining coverage**
- [ ] Write `.github/workflows/ci.yml` with backend-test, frontend-test, lint, e2e jobs
- [ ] Write `frontend/src/__tests__/TeamMembers.test.tsx`
- [ ] Write `frontend/src/__tests__/TeamMemberDetail.test.tsx`
- [ ] Write `frontend/src/__tests__/Requirements.test.tsx`
- [ ] Write `frontend/src/__tests__/Reports.test.tsx`
- [ ] Write `frontend/src/__tests__/Home.test.tsx`
- [ ] Add regression test for history features insertion bug (team.ts addHistory with features array)

---

## Coordination Notes

- Agents should claim a queue item by moving it to "Currently Working On" and updating the date.
- When two agents touch the same file, note it here to avoid conflicts.
- Shared files currently being edited: _none_
