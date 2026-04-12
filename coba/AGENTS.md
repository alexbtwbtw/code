# Agent Status Board

This file is the shared coordination log for all agents working on COBA.
Each agent must update their section when they start, change, or finish a task.

**Format rule:** The `Last updated` field must always include both date AND time in `YYYY-MM-DD HH:MM` format (24h). **Always get the real current time by running `date +"%Y-%m-%d %H:%M"` (bash) before writing — never guess or hardcode a time.**

## At a Glance

| Agent | Status | Working On | Last Updated |
|-------|--------|------------|--------------|
| Features | Done | Codebase audit — 11 new queue tasks identified | 2026-04-12 12:29 |
| Architecture & Docs | Done | Codebase review complete; 13 new queue tasks identified | 2026-04-12 12:31 |
| UI | Done | Audit complete — updated queue with new CSS/i18n/UX issues | 2026-04-12 12:31 |
| Seed Data | Done | Review complete — prioritised task list produced | 2026-04-12 12:30 |
| Reporting | Done | Queue updated with 6 prioritised reporting tasks | 2026-04-12 12:29 |
| Testing | Done | Coverage audit complete; queue updated with gaps | 2026-04-12 12:31 |
| AWS Migration | Done | Initial review of docs/aws/ complete | 2026-04-12 12:29 |

_Agents: update this table (status, working on, last updated) whenever you pick up or finish a task._

---

## Features Agent
**Status:** Done
**Last updated:** 2026-04-12 12:29

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
- Project Features frontend integration missing (backend fully implemented) — now fixed
- Member history features never displayed in TeamMemberDetail — now fixed by UI Agent
- CV upload missing from existing member detail view — now fixed by UI Agent
- No delete confirmation dialogs on tasks — now fixed
- Requirement book edit form missing `category` field — already implemented, no fix needed
- Structure lat/lng fields exist in DB — form inputs confirmed already present in AddProject.tsx StructureSection
- **New (2026-04-12):**
  - No delete member backend endpoint or frontend UI — team members cannot be deleted at all
  - No delete project backend endpoint or frontend UI — projects cannot be deleted at all
  - Destructive actions (history delete, requirement delete, feature delete, untag member) fire immediately with no confirmation — only task delete and book delete have a confirmation step
  - HistoryForm component has no features subsection — features can be persisted to DB via addHistory/updateHistory but the UI form has no way to add/edit them
  - Reports "Team" tab shows only "Coming soon" placeholder — no actual content; backend listMembers already returns projectCount per member
  - Priority progress label in Reports/priority tab is hardcoded Portuguese ("concluídas") instead of i18n key
  - "Project not found.", "Member not found.", "Task not found.", "Book not found." error strings are hardcoded English and not translated
  - generateCvPdf backend lib exists (pdfkit, professional layout) but only used in seed; no tRPC endpoint — users cannot download AI-generated CVs for members who have no uploaded PDF
  - SearchProjects has no priority filter dropdown — priority is a sort option only, not a filterable facet
  - TeamMembers list has no search/filter — flat unfiltered grid becomes unusable with 30+ members
  - Comment author field in TaskDetail requires manual name entry — should default to current user name when a user is active in UserSwitcher

### Currently Working On
_Nothing_

### Queue
- [x] Add project features UI section to ProjectDetail
- [x] Add lat/lng inputs to structure forms (already implemented in StructureSection)
- [x] Add delete confirmation modals for tasks
- [x] Fix requirement book edit form (add category field) — already implemented
- [x] Add member history features display to TeamMemberDetail (done by UI Agent)
- [x] Add CV upload form to TeamMemberDetail (done by UI Agent)
- [x] Create dedicated Home page with stats, recent projects, urgent tasks, quick actions
- [x] AUTH_PLAN backend: role+password_hash columns, myProjects, riskSummary, myOverdue, myNearDeadline
- [ ] Add features subsection to HistoryForm component so history entries can include geo features when editing/creating
- [ ] Add delete member endpoint (backend: team router + service) and delete button in TeamMemberDetail with inline confirmation
- [ ] Add delete project endpoint (backend: projects router + service) and delete button in ProjectDetail with inline confirmation
- [ ] Add inline confirmation to other destructive actions missing it: history card delete, requirement delete, feature delete, untag member from project
- [ ] Expose generateCvPdf as a tRPC endpoint (team.generateCv) so users can download a generated PDF CV for any member regardless of whether they have an uploaded CV
- [ ] Add search/filter to TeamMembers list view (search by name/title, filter by tagged project count)
- [ ] Add priority filter facet to SearchProjects (filter by priority level, complementing the existing sort)
- [ ] Pre-fill comment author field in TaskDetail with current user name via useCurrentUser hook
- [ ] Replace hardcoded "concluídas" string in Reports priority tab progress label with an i18n key
- [ ] Translate hardcoded "not found" error strings in ProjectDetail, TeamMemberDetail, TaskDetail, RequirementBookDetail to i18n keys
- [ ] Implement Reports "Team" tab content — member utilisation table showing project count per member, using listMembers data already available via backend

---

## Architecture & Docs Agent
**Status:** Done
**Last updated:** 2026-04-12 12:31

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
- Zero authentication — all procedures use `publicProcedure`; `createContext` always returns `{}`; `UserSwitcher` only renders in DEV mode — no server-side role enforcement exists at all
- CORS uses dynamic origin check (localhost origins only), acceptable for current stage
- Bug: member history features are never inserted into DB despite schema supporting it — still unfixed (team.ts addHistory/updateHistory call `insertHistoryFeatures` which now exists, but the parseCv flow does not pass features in the createWithHistory input schema)
- **N+1 queries confirmed and expanded (all in-memory SQLite so impact is low today, but will matter on AWS RDS):**
  - `getHistoryWithSubEntries` (services/team.ts:75-82): 3 queries per history row (geo, structures, features)
  - `getTasksByProject` / `getTasksByMember` (services/tasks.ts:114-140): 2 queries per task (getAssignees + getCommentCount); `getTasksByMember` also does 1 extra project name lookup per task via inline `db.prepare`
  - `suggestMembers` (services/team.ts:265-271): 2-level N+1 — 1 history query per member, then 1 member_history_structures query per history row
  - `buildMemberData` (services/requirements.ts:187-194): 4 queries per member (history cats, recent history, cv, project count)
  - `listBooks` (services/requirements.ts:78-87): 2 queries per book (requirement count + optional project lookup)
- No pagination on any list endpoint (projects.list, team.list, tasks.byProject, etc.)
- No real tests written yet — only setup/fixture scaffolding exists (`backend/src/__tests__/setup.ts`, `frontend/src/__tests__/setup.ts`)
- Error handling inconsistent: `projects.ts` and `tasks.ts` throw plain `new Error(...)` in English; AI libs and requirements service throw `TRPCError` in Portuguese — no standard approach
- **Stale import paths**: `lib/parseCv.ts` and `lib/parseProject.ts` import `STRUCTURE_TYPES` from `'../router/structures'` instead of the canonical `'../types/structures'` (Phase 1 refactor missed these two files)
- `requirement_assignments` table and service functions exist but the UI only surfaces them through the suggest-members panel — no dedicated "assign member to requirement slot" flow
- `docs/backend/` and `docs/frontend/` file-level docs were written before Phase 1-7 refactors; `docs/backend/db.md` still describes the old monolithic `db.ts`, not the new `db/` directory structure

### Currently Working On
_Nothing_

### Queue
- [ ] Create CLAUDE.md with developer guide
- [ ] Fix stale import: `lib/parseCv.ts` and `lib/parseProject.ts` should import `STRUCTURE_TYPES` from `'../types/structures'` not `'../router/structures'`
- [ ] Fix member history features bug — `createWithHistory` and `parseCv` flow do not pass `features` array; HistoryInputSchema includes it but the parseCv output schema does not extract geo entries either (geoEntries missing from CvOutputSchema history items)
- [ ] Fix N+1 in `getHistoryWithSubEntries` — batch sub-table queries with WHERE history_id IN (...) and group in JS instead of per-row queries
- [ ] Fix N+1 in `getTasksByProject` / `getTasksByMember` — use single GROUP BY + LEFT JOIN to fetch assignee names and comment counts; eliminate inline `db.prepare` project lookup in `getTasksByMember`
- [ ] Fix N+1 in `suggestMembers` — batch history and history_structures lookups with WHERE team_member_id IN (...)
- [ ] Fix N+1 in `buildMemberData` (requirements) — batch history/cv/project_count with GROUP BY queries
- [ ] Fix N+1 in `listBooks` — use LEFT JOIN + GROUP BY to count requirements and fetch project in a single query
- [ ] Standardize error handling: replace plain `throw new Error(...)` in projects.ts and tasks.ts with `TRPCError` using Portuguese messages; audit all services for consistency
- [ ] Add pagination (limit/offset) to `projects.list` and `team.list` — minimum: `limit` + `offset` params, default limit 50
- [ ] Update `docs/backend/db.md` to reflect the new `db/` directory structure (client, schema, statements)
- [ ] Update remaining `docs/backend/` and `docs/frontend/` files that predate Phase 1-7 refactors
- [ ] Document all tRPC endpoints in a single reference doc (`docs/API.md`)
- [x] Write docs/TEAM_MEMBER_REWORK_PLAN.md — non-user members, promote flow, CV diff/accept

---

## UI Agent
**Status:** Done
**Last updated:** 2026-04-12 12:31

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
**CSS variables used but not defined in :root (all cause silent rendering failures):**
- `--muted` — used in `.btn-cancel`, `.cv-row-meta`, `.suggest-badge`, `.suggest-detail-contact`, `.suggest-evidence`, `.priority-expand-btn`, `.pm-sug-title`, `.priority-task-summary`, `.priority-task-due`
- `--card` — used in `.suggest-panel`, `.req-new-form`, `.import-review-panel`
- `--r-md` — used in `.member-card`, `.tag-member-panel`, `.history-form`, `.history-card`, `.inline-form`, `.structure-card`
- `--r-lg` — used in `.member-hero`
- `--accent` — used in `.req-source-evidence`, `.req-evidence-label`, `.req-assign-name`, `.import-req-evidence`, `.import-evidence-label`, `.import-select-btns`; also inline in Home.tsx for COBA logo colour
- `--fg` — used inline in Home.tsx for "Portal" text label

**Missing CSS rules:**
- `.btn-primary` — used in TeamMembers.tsx:230, no rule defined
- `.alert--error` — used in TeamMembers.tsx:241, AddProject.tsx:214, TeamMemberDetail.tsx:252; only `.alert--success` defined
- `.view` — outer wrapper div used in all 8 view components, no CSS rule exists
- `result-row` — used in Home.tsx recent-projects list, no CSS rule exists
- `.input:hover` — no hover state on form inputs (focus state exists but hover missing)
- `cursor: not-allowed` missing on `.btn-cancel:disabled` and `.btn-add-geo:disabled` (only `.btn-submit:disabled` has it)

**i18n bugs:**
- `Reports.tsx` summary tab: hardcoded English `STATUS_LABELS` / `CATEGORY_LABELS` objects (lines 10–17) instead of `t(STATUS_KEY[...])` / `t(CAT_KEY[...])` — labels always appear in English regardless of language toggle
- `Home.tsx` line 109: status pill always renders `t('statusActive')` — should be `t(STATUS_KEY[proj.status])`
- `SearchProjects.tsx` line 39: project count reads hardcoded `'projeto'/'projetos'` (Portuguese only), bypassing i18n

**Dead i18n keys (defined in en.ts + pt.ts but never consumed):**
- `homeTotalMembers`, `homeMyOpenTasks`, `homeRiskHighlights` — added for Home page but never wired up
- `appName`, `colClient`, `colCountry`, `colStatus`, `btnViewDetails`, `btnClose`, `detailTitle` — legacy from a table-based project list view that was replaced by project cards

**UX issues:**
- Cancel button text invisible: `.btn-cancel` uses `color: var(--muted)` which is undefined
- PM autocomplete: `.pm-sug-name` uses `var(--text)` (#374151 dark) on `var(--navy)` (#0d2d5e) background — near-invisible contrast
- Empty states in TeamMemberDetail (tagged-projects, history) use plain `<p class="muted">` rather than the styled `.empty-state` card used elsewhere

### Currently Working On
_Nothing_

### Queue

**P0 — Broken / invisible UI (fix these first):**
- [ ] Add missing CSS variables to `:root`: `--muted` (#6b7280), `--card` (#ffffff), `--r-md` (10px), `--r-lg` (14px), `--accent` (alias to --orange), `--fg` (alias to --text-dk)
- [ ] Add `.btn-primary` rule (orange fill, same style as `.btn-submit`)
- [ ] Add `.alert--error` rule (red-tinted variant matching the `.alert--success` pattern)
- [ ] Fix cancel button text: change `.btn-cancel` colour from `var(--muted)` to `var(--text-md)` directly
- [ ] Add `.view` CSS rule (`display: flex; flex-direction: column; gap: 32px;`) so all view wrappers have consistent spacing
- [ ] Add `result-row` CSS rule for Home.tsx recent-projects list items

**P1 — i18n correctness:**
- [ ] Fix `Reports.tsx` summary tab: replace `STATUS_LABELS[r.status]` with `t(STATUS_KEY[r.status])` and `CATEGORY_LABELS[r.category]` with `t(CAT_KEY[r.category])`; delete the hardcoded English objects
- [ ] Fix `Home.tsx` line 109: replace `t('statusActive')` with `t(STATUS_KEY[proj.status] ?? 'statusActive')` and import `STATUS_KEY`
- [ ] Fix `SearchProjects.tsx` line 39: replace hardcoded `'projeto'/'projetos'` — add `projectSingular`/`projectPlural` keys to en.ts and pt.ts

**P2 — UX polish:**
- [ ] Fix PM autocomplete contrast: change `.pm-sug-name` colour from `var(--text)` to `var(--white)`
- [ ] Add `.input:hover` rule (e.g. `border-color: var(--navy-lt)`) for hover-before-focus feedback
- [ ] Add `cursor: not-allowed; opacity: .6;` to `.btn-cancel:disabled` and `.btn-add-geo:disabled`
- [ ] Upgrade empty states in TeamMemberDetail tagged-projects and history sections to use `.empty-state` card

**P3 — i18n hygiene:**
- [ ] Wire up dead Home keys: add `homeTotalMembers` KPI card (team member count), `homeMyOpenTasks` task count badge, `homeRiskHighlights` heading in OversightHome risk table
- [ ] Remove legacy unused keys: `appName`, `colClient`, `colCountry`, `colStatus`, `btnViewDetails`, `btnClose`, `detailTitle`

---

## Seed Data Agent
**Status:** Done
**Last updated:** 2026-04-12 12:30

### Completed
- Full seed data quality review across all 16 tables
- Rewrote generateCv.ts with professional PDF layout (header, divider, profile, project history with geo/structure sub-bullets, page numbers)
- Expanded team.ts from 8 to 30 members (22 new Portuguese civil engineering professionals)
- Expanded projects.ts from 10 to 31 projects (21 new projects, varied statuses/categories/countries); later extended to 34 projects (projects 32–34 are planning-status new contracts)
- Added requirement books for new projects (6 new books across transport/water/energy/environment categories)
- Added 89 tasks spread across all 34 projects (2–4 tasks per project)
- Tagged new members to new projects across 42 project_team assignments
- Added role: 'user' to all 30 members; added oversight1 and oversight2 with role: 'oversight'
- Second review pass — produced prioritised task list for next improvements

### Findings Summary

**Current state:** 34 projects, 32 team members (30 user + 2 oversight), 89 tasks, 42 project_team assignments, 6 requirement books, ~25 geo entries, ~20 structures. All 16 tables populated.

**Gaps identified in this review pass:**

1. **project_features table: zero rows** — insertFeature never called in any seed file; the ProjectDetail Features tab has no demo data.
2. **task_assignments: only 1 real call** — assign() helper exists but fires just once (silently skips unknown names). None of the 89 tasks are linked to team members, breaking "my tasks" views and team utilization reporting.
3. **task_comments: only 6 total** — 83 of 89 tasks have zero comments; the TaskDetail comments panel is empty on nearly all tasks.
4. **Budget null on 31 of 34 projects** — Only projects 32/33/34 have budget values. Reports budget chart and Home KPI "total budget" display near-zero.
5. **No suspended or cancelled projects** — All 34 are active (31) or planning (3). The status filter and Reports by-status chart cannot show these two statuses.
6. **Geo missing on ~15 projects and structures missing on ~19 projects** — Several active projects with significant civil works have no geo/structure records.
7. **20 of 34 projects have no team assignments** — Unassigned active projects: LAV Lote B (22), Hospital Lisboa Oriental (25), Plano Diretor EPAL (27), Diques Moçambique (28), Corumana (29), Canal Laaroussia (30), STEP Bombagem (31), Nhene (32), N'Ompombo (33).
8. **All 6 requirement books are unlinked** — They use non-existent ref codes; pid() returns null for all, so every book is an orphan with project_id null.
9. **No overdue tasks** — All due dates are null or 2026+. The overdue tasks section in Reports and Home always shows empty.
10. **Only 2 blocked tasks** — Reports "Tarefas Bloqueadas" shows only 2 rows.
11. **Priority scale partially unused** — `emergency` and `minimal` levels have zero projects across all 34.
12. **member_history_features: sparse** — Only 12 insertHistoryFeature.run calls total; most history records lack features entries.

### Currently Working On
_Nothing — review complete_

### Queue
- [x] Rewrite generateCv.ts with professional PDF format
- [x] Add 22+ more team members to team.ts
- [x] Add 20+ more projects to projects.ts
- [x] Add requirement books for new projects
- [x] Add tasks for new active/planning projects
- [x] Tag new members to new projects
- [x] Add role: 'user' explicitly to all 30 insertMember.run() calls in team.ts
- [x] Add oversight1 (Margarida Ferreira) and oversight2 (Rui Monteiro) with role: 'oversight' at end of seedTeam()
- [ ] **P1** Seed project_features — add 2–3 named geo features per project for 8–10 active projects; unblocks ProjectDetail Features tab
- [ ] **P1** Add task assignments — assign 1–2 team members to each of the 89 tasks using the assign() helper with real seeded member names; unblocks "my tasks" view and team utilization reporting
- [ ] **P1** Add budget values to all 34 projects — realistic EUR/USD figures based on project type and scale; unblocks Reports budget chart and Home KPI total budget
- [ ] **P1** Add 3–5 overdue tasks — due_date before 2026-04-12 with status not 'done'; unblocks overdue tasks section in Reports and Home
- [ ] **P2** Add 2 suspended and 2 cancelled projects — exercises the status filter and adds missing bars to the Reports by-status chart
- [ ] **P2** Fix requirement books — update pid() lookup ref codes in requirements.ts to use actual seeded ref codes (e.g. '40690-BITA', '40815-LAPE'); add 4–5 new books linked to current active projects
- [ ] **P2** Add geo entries for projects 5, 12, 22 (active transport projects with no boreholes) and structure entries for projects 11, 13, 25 (active projects with civil works but no structure records)
- [ ] **P2** Add team assignments for projects 22, 25, 27, 28, 29, 32, 33 — active projects with tasks but no tagged team members
- [ ] **P3** Add more task comments — 2–3 comments on at least 10 additional in_progress/review tasks
- [ ] **P3** Add 3–5 more blocked tasks with realistic blockers across different categories
- [ ] **P3** Add budget to completed Project 1 and 2 older projects for historical budget data
- [ ] **P4** Add one `emergency` priority project and one `minimal` priority project to exercise full 7-level priority scale
- [ ] **P4** Add more member_history_features entries — 1–2 features per history record for first 5–6 members

---

## Reporting Agent
**Status:** Done
**Last updated:** 2026-04-12 12:29

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
- Reports.tsx has 4 tabs: Summary (project KPIs + by-status/category/country/year tables), Tasks (near-deadline, overdue, blocked task lists), Team (placeholder only — shows `reportsTeamComingSoon` text), Priority (priority-ordered active project table with task progress + blocked/overdue counts)
- The Team tab is entirely unimplemented — `team.ts` router has no utilization or load procedure; `listMembers()` does not include project-count metadata
- No backend stats aggregate procedures exist for: tasks (counts by status/priority), team utilization, geo entries, structures, or requirements
- Budget reporting in Summary tab only shows one total EUR sum — no breakdown by category, status, or currency; `projects.stats()` service already computes `totalBudget` but no further breakdown
- `tasks.ts` router has overdue/nearDeadline/blocked list procedures but no aggregate stats procedure
- `geo.ts` and `structures.ts` services have only per-project CRUD — no global aggregate queries
- `requirements.ts` service has `scoreRequirement` / `matchMembersLocal` but no stats (fulfillment gap, by-discipline counts)
- The Summary tab `activeOnly` filter toggle renders inside the same `.report-filter-bar` div class as the tab bar, which is visually confusing
- The Summary tab status/category labels are hardcoded English strings (STATUS_LABELS, CATEGORY_LABELS objects) rather than i18n keys — breaks PT mode

### Currently Working On
_Nothing_

### Queue

**Priority 1 — Fill the Team tab (highest visibility gap)**
- [ ] Add `team.utilization()` backend service function + router procedure: return each member's name, title, role, active project count, total project count, idle flag; query via LEFT JOIN project_team + projects GROUP BY team_member_id
- [ ] Add `useTeamUtilization()` hook to `frontend/src/api/team.ts`
- [ ] Replace Team tab placeholder in Reports.tsx with TeamUtilizationSection: sortable table (name, title, role badge, active projects, total projects, idle indicator); clicking a row navigates to TeamMemberDetail
- [ ] Add ~6 i18n keys: reportsTeamUtilTitle, colMember, colActiveProjects, colTotalProjects, colIdle, labelIdle

**Priority 2 — Task aggregate stats (Tasks tab currently only lists tasks, no summary)**
- [ ] Add `tasks.stats()` backend service function + router procedure: total count, count by status, count by priority, overdue count, unassigned count; single SQL query with conditional SUMs
- [ ] Add `useTaskStats()` hook to `frontend/src/api/tasks.ts`
- [ ] Add TaskStatsSection at the top of the Tasks tab in Reports.tsx: KPI row (total, overdue, blocked, unassigned) + two small breakdown tables (by status, by priority) using existing ReportTable component
- [ ] Add ~8 i18n keys: reportsTaskStatsTitle, statTotalTasks, statUnassigned, tableByTaskStatus, tableByTaskPriority

**Priority 3 — Fix i18n in Summary tab + filter UX**
- [ ] Replace hardcoded English STATUS_LABELS and CATEGORY_LABELS objects in Reports.tsx with `t(STATUS_KEY[r.status])` and `t(CAT_KEY[r.category])` using existing constants; delete the local objects
- [ ] Move the `activeOnly` filter toggle out of the tab bar row into its own secondary filter row so it does not visually conflict with the tab buttons

**Priority 4 — Budget breakdown in Summary tab**
- [ ] Enhance `projects.stats()` service to also return `budgetByCategory` (array of {category, total}) and `budgetByStatus` (array of {status, total}), EUR-only; include in existing return object
- [ ] Add two budget breakdown ReportTables to the Summary tab below the existing four tables, rendered only when values are non-zero
- [ ] Add ~4 i18n keys: tableBudgetByCategory, tableBudgetByStatus, colBudget, labelEurOnly

**Priority 5 — Requirements stats (staffing planning visibility)**
- [ ] Add `requirements.stats()` backend service function + router procedure: total books, total requirements, count by discipline, count by level, fulfilled count (>=1 req_assignment) vs unfulfilled gap; queries from `requirement_books`, `requirements`, `req_assignments`
- [ ] Add `useRequirementsStats()` hook to `frontend/src/api/requirements.ts`
- [ ] Add a new "Requisitos" tab (key: 'requirements') to Reports.tsx tab bar with RequirementsStatsSection: KPI row (books, requirements, fulfilled, gap) + two breakdown tables (by discipline, by level)
- [ ] Add ~10 i18n keys: reportsTabRequirements, reportsReqStatsTitle, statBooks, statRequirements, statFulfilled, statGap, tableByDiscipline, tableByLevel

**Priority 6 — Geo and Structures stats**
- [ ] Add `getGeoStats()` function to `backend/src/services/geo.ts`: total entries, count by type, top-10 soil types, top-10 rock types
- [ ] Add `getStructuresStats()` function to `backend/src/services/structures.ts`: total structures, count by type
- [ ] Expose both as `geo.stats` and `structures.stats` router procedures in geo.ts and structures.ts routers
- [ ] Add `useGeoStats()` and `useStructuresStats()` hooks to respective api files
- [ ] Add a new "Geotecnia" tab (key: 'geo') to Reports.tsx with GeoStatsSection (entry type table, soil-type table) and StructureStatsSection (structure type table)
- [ ] Add ~12 i18n keys: reportsTabGeo, reportsGeoTitle, reportsStructuresTitle, tableByGeoType, tableBySoilType, tableByRockType, tableByStructureType

---

## Testing Agent
**Status:** Done
**Last updated:** 2026-04-12 12:31

### Completed
- Explored entire codebase: all 7 routers, all AI lib files, all 9 view components, auth layer, i18n context, and both package.json files
- Wrote `docs/TESTING_STRATEGY.md` — comprehensive strategy covering tooling install, backend unit tests per router, AI mock patterns, PDF smoke testing, frontend RTL approach, tRPC mocking with msw, i18n mock, component priority tiers, 7 Playwright E2E user journeys, coverage targets by layer, full GitHub Actions CI structure, and 7-phase priority order
- Updated `docs/testing.md` with current implementation status (16 backend + 1 frontend + 5 E2E spec files); `docs/TESTING_STRATEGY.md` now redirects to `docs/testing.md`

### Findings Summary

**What is currently implemented (all passing):**
- **Backend infrastructure:** Vitest installed; `backend/src/__tests__/setup.ts` (resetDb + beforeEach); test scripts in both `backend/package.json` and `frontend/package.json`
- **Backend types (7/7 files):** `types/features`, `types/geo`, `types/projects`, `types/requirements`, `types/structures`, `types/tasks`, `types/team` — all map*() functions covered
- **Backend schemas (3/7 files):** `schemas/projects`, `schemas/requirements`, `schemas/tasks` — **missing: schemas/geo, schemas/structures, schemas/features, schemas/team**
- **Backend services (5/8 files):** `services/matching`, `services/projects` (not `getRiskSummary`/`getPriorityList`), `services/requirements`, `services/tasks` (not `getMyOverdue`/`getMyNearDeadline`), `services/team` — **missing: services/geo, services/structures, services/features**
- **Backend AI libs (0/5):** No tests for `parseCv`, `parseProject`, `parseRequirements`, `suggestMembersAi`, `generateCv`
- **Frontend:** `frontend/src/__tests__/setup.ts` present; Vitest + RTL + jsdom installed; only `utils/format.test.ts` (19 tests) written — no auth/routing/API hook/view tests
- **E2E:** Playwright installed; `playwright.config.ts` present; 5 spec files in `e2e/tests/` (navigation 7, projects 6, team 5, tasks 4, requirements 5) = 27 tests total; `e2e/fixtures/dummy.pdf` present; all 7 journeys covered
- **CI:** `.github/workflows/ci.yml` does NOT exist

**Key gaps by priority:**
1. Backend schemas for 4 domains (geo, structures, features, team) — trivial to add
2. Backend service gaps: `getRiskSummary` and `getPriorityList` (added by Reporting Agent); `getMyOverdue`/`getMyNearDeadline` (added by AUTH_PLAN backend)
3. Backend services geo, structures, features — zero coverage
4. All 5 AI lib files (`parseCv`, `parseProject`, `parseRequirements`, `suggestMembersAi`, `generateCv`) — zero coverage
5. Frontend: no auth layer, routing, API hook, or component/view tests beyond `utils/format.test.ts`
6. CI workflow missing entirely

### Currently Working On
_Nothing_

### Queue

**Phase 1 — Backend schemas (4 missing domains)**
- [x] `backend/src/__tests__/setup.ts` — done
- [x] `backend/src/__tests__/schemas/projects.test.ts` — done (status, category, priority enums; CreateProjectSchema)
- [x] `backend/src/__tests__/schemas/requirements.test.ts` — done
- [x] `backend/src/__tests__/schemas/tasks.test.ts` — done
- [ ] Write `backend/src/__tests__/schemas/geo.test.ts` (CreateGeoSchema: nullable lat/lng, depth float, required projectId)
- [ ] Write `backend/src/__tests__/schemas/structures.test.ts` (CreateStructureSchema: type enum, nullable geo coords)
- [ ] Write `backend/src/__tests__/schemas/features.test.ts` (CreateFeatureSchema: required label and projectId)
- [ ] Write `backend/src/__tests__/schemas/team.test.ts` (CreateMemberSchema: optional bio/email; AddHistorySchema; role enum)

**Phase 2 — Backend service gaps**
- [x] `backend/src/__tests__/services/projects.test.ts` — done (list/filter/sort/byId/create/update/stats/myProjects)
- [x] `backend/src/__tests__/services/tasks.test.ts` — done (create/update/delete/byProject/overdue/nearDeadline/blocked/assign/comment)
- [x] `backend/src/__tests__/services/team.test.ts` — done
- [x] `backend/src/__tests__/services/requirements.test.ts` — done
- [x] `backend/src/__tests__/services/matching.test.ts` — done
- [ ] Add `getRiskSummary` tests to `services/projects.test.ts` (correct overdueCount + blockedCount per project; zero when no tasks)
- [ ] Add `getPriorityList` tests to `services/projects.test.ts` (active-only filter; priority sort order CASE; task count aggregates match expected values)
- [ ] Add `getMyOverdue` and `getMyNearDeadline` tests to `services/tasks.test.ts` (filtered by memberId; excludes done tasks; empty for member with no tasks)
- [ ] Write `backend/src/__tests__/services/geo.test.ts` (byProject empty/populated; create with nullable lat/lng; delete; FK cascade on project delete)
- [ ] Write `backend/src/__tests__/services/structures.test.ts` (same pattern; nullable geo coords stored as null not undefined)
- [ ] Write `backend/src/__tests__/services/features.test.ts` (same pattern; FK cascade)

**Phase 3 — AI library tests**
- [ ] Write `backend/src/__tests__/lib/parseCv.test.ts` (vi.mock Anthropic SDK; success, no-key, malformed JSON, markdown-wrapped JSON)
- [ ] Write `backend/src/__tests__/lib/parseProject.test.ts` (same four cases)
- [ ] Write `backend/src/__tests__/lib/parseRequirements.test.ts` (same four cases — lib added since original queue was written)
- [ ] Write `backend/src/__tests__/lib/suggestMembersAi.test.ts` (success, non-array response, no-key)
- [ ] Write `backend/src/__tests__/lib/generateCv.test.ts` (Buffer smoke test; first bytes are %PDF; edge cases: empty history, no bio, long name)

**Phase 4 — Frontend unit tests**
- [x] `frontend/src/__tests__/setup.ts` — done (jest-dom import)
- [x] `frontend/src/__tests__/utils/format.test.ts` — done (19 tests: fmt, fmtDate, fmtDim, initials)
- [ ] Write `frontend/src/__tests__/auth.test.ts` (getCurrentUser, setCurrentUser, signOut, useCurrentUser hook — round-trip, null on empty, clears on signOut)
- [ ] Write `frontend/src/__tests__/routing.test.ts` (pageToPath and pathToPage pure functions; all Page union values round-trip correctly)
- [ ] Write `frontend/src/__tests__/api/projects.test.ts` (useProjectsList filter params, useProjectStats, useMyProjects, useRiskSummary, usePriorityList — msw handlers)
- [ ] Write `frontend/src/__tests__/api/tasks.test.ts` (useOverdueTasks, useNearDeadlineTasks, useBlockedTasks, useMyOverdueTasks, useMyNearDeadlineTasks, useCreateTask)
- [ ] Write `frontend/src/__tests__/api/team.test.ts` (useTeamList, useMemberById, useTagProject, useUntagProject, useAddHistory, useAttachCv)
- [ ] Write `frontend/src/__tests__/api/requirements.test.ts` (useListBooks, useMatchMembers — local + AI paths)

**Phase 5 — CI + frontend view tests**
- [x] `e2e/tests/navigation.spec.ts` — done (7 tests)
- [x] `e2e/tests/projects.spec.ts` — done (6 tests)
- [x] `e2e/tests/team.spec.ts` — done (5 tests)
- [x] `e2e/tests/tasks.spec.ts` — done (4 tests)
- [x] `e2e/tests/requirements.spec.ts` — done (5 tests)
- [ ] Write `.github/workflows/ci.yml` (backend-test, frontend-test, lint, e2e jobs; e2e gates on unit tests; ANTHROPIC_API_KEY placeholder secret)
- [ ] Write `frontend/src/__tests__/SearchProjects.test.tsx` (render cards, filter by status/category, sort dropdown, card click navigation)
- [ ] Write `frontend/src/__tests__/ProjectDetail.test.tsx` (view/edit toggle, geo/structure/feature CRUD sections, team tag/untag)
- [ ] Write `frontend/src/__tests__/TaskDetail.test.tsx` (status change, comment add, delete confirmation)
- [ ] Write `frontend/src/__tests__/Home.test.tsx` (UserHome KPI row + recent projects; OversightHome risk table — role-gated via useCurrentUser mock)
- [ ] Write `frontend/src/__tests__/Reports.test.tsx` (tab switching: summary/tasks/team/priority; priority list table renders)
- [ ] Write `frontend/src/__tests__/TeamMembers.test.tsx`
- [ ] Write `frontend/src/__tests__/TeamMemberDetail.test.tsx` (CV upload section; member history features sub-section display)
- [ ] Write `frontend/src/__tests__/Requirements.test.tsx`
- [ ] Add regression test to `services/team.test.ts`: history features sub-entries inserted correctly (guards against the member_history_features insertion bug)

---

## AWS Migration Agent
**Status:** Done
**Last updated:** 2026-04-12 12:29

### Completed
- Read and summarised all 8 docs/aws/ files (overview, compute, database, storage, pipeline, terraform, rollout, codebase-changes)
- Identified gaps and missing decisions in the migration plan

### Findings Summary

#### Migration Plan Summary

The plan deploys COBA to AWS at ~$12/month using a minimalist POC-grade stack:

- **Compute:** EC2 t3.micro (Amazon Linux 2023) with Node.js 22 and pm2 for process management. The instance sits in a single public subnet (eu-west-1a) with an Elastic IP. No ALB, no NAT Gateway.
- **Database:** SQLite on a 30 GB gp2 EBS volume at `/data/coba.db`. One line of code in `backend/src/db.ts` makes the path configurable via `DB_PATH` env var; all existing queries/transactions stay unchanged.
- **File Storage:** Two private S3 buckets — `coba-files` (CV PDFs and generated CVs, accessed via presigned URLs) and `coba-frontend` (Vite SPA build, served by CloudFront OAC). The `member_cvs` table schema changes: `file_data TEXT` is replaced by `s3_key TEXT`. CV uploads become a two-step presigned PUT flow; pdfkit-generated CVs are uploaded to S3 and returned as presigned GET URLs.
- **CDN:** CloudFront distribution with two origins: EC2 (HTTP port 3000) for `/api/*` and `/trpc/*`, and S3 for `/*`. TLS terminates at CloudFront; no HTTPS between CloudFront and EC2 for the POC. SPA routing handled via custom 403/404 → `index.html` error responses.
- **Secrets:** SSM Parameter Store (free Standard tier) stores `ANTHROPIC_API_KEY`, `DB_PATH`, and `S3_FILES_BUCKET`. EC2 IAM role fetches them at deploy time and injects into pm2.
- **Deploy Pipeline:** GitHub Actions workflow on push to `main` — builds TypeScript backend, zips `dist/` + `node_modules/`, scp-copies to EC2, SSHs in, extracts, fetches SSM secrets, writes pm2 ecosystem file, reloads pm2. Frontend is built and synced to S3 with long-cache headers for hashed assets; CloudFront invalidation on `index.html`.
- **Terraform:** Four modules (networking, compute, storage, cdn) under `environments/poc/`. State stored in a manually pre-created S3 bucket with DynamoDB lock table.
- **Rollout Order:** 9 ordered steps: (1) db.ts change, (2) S3 CV flow, (3) Terraform bootstrap, (4) networking+compute, (5) storage, (6) CDN, (7) domain+ACM, (8) GitHub Actions pipeline, (9) optional hardening (CloudWatch, health check alarm, EBS snapshots).

#### Required Codebase Changes (from codebase-changes.md)

Four files need editing: `backend/src/db.ts` (trivial), `backend/src/router/team.ts` (medium — presigned URL flow), `backend/src/lib/generateCv.ts` (small — S3 upload), `backend/src/lib/parseCv.ts` (small — read from S3 key). A new `backend/src/lib/s3.ts` helper must be created, and `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` installed.

#### Gaps and Unanswered Questions

1. **Node.js version mismatch:** `compute.md` says "Install Node.js 22 LTS" but CLAUDE.md and `.nvmrc` require Node >= 25. The Terraform `user_data` script installs Node 22 via NodeSource. This will fail or produce a broken build if the backend uses any Node 25-specific features. Needs resolution before Step 4.
2. **Instance type inconsistency:** `overview.md` recommends t3.micro throughout, but `compute.md` and the Terraform HCL both provision `t2.micro`. t2 uses burst credits that can be depleted; t3 is newer and cheaper. The two docs disagree.
3. **EBS volume type inconsistency:** `overview.md` uses `gp3` in the cost table ($0.08/GB/month), but `compute.md` and the Terraform HCL create a `gp2` volume. gp3 is ~20% cheaper and faster — one of them is wrong.
4. **`better-sqlite3` native module on EC2:** The package includes a compiled `.node` binary. If the backend is built on the GitHub Actions runner (Ubuntu) and scp'd to EC2 (Amazon Linux 2023), the `better-sqlite3` binary may be incompatible (different glibc version, different architecture). The pipeline currently copies `node_modules/` built on the runner — this is likely to break. No plan addresses this.
5. **SSH CIDR for GitHub Actions:** The security group allows SSH on port 22 from `var.deploy_ssh_cidr`. GitHub Actions runners use a dynamic IP range — the docs mention restricting to "your office IP or 0.0.0.0/0" but do not provide a concrete solution for the CI use case (e.g., using GitHub's published IP ranges or temporarily opening 0.0.0.0/0).
6. **Database migration for existing `member_cvs` rows:** The S3 storage plan says to `ALTER TABLE member_cvs ADD COLUMN s3_key` and then later drop `file_data`. Because the DB is in-memory today, a migration script is not needed for the first deploy. However, once the EBS-based DB is live, any future change to this column requires a SQLite table-rebuild (no `DROP COLUMN` in older SQLite). The docs describe the steps but no migration script exists.
7. **`parseCv.ts` reads from S3 but the interface is not fully specified:** `codebase-changes.md` says "Read CV content from S3 by `s3_key` instead of from DB blob" but gives no code sample (unlike the other three files). The exact change to `parseCv.ts` is not documented.
8. **No Terraform `variables.tf` or `outputs.tf` content provided:** The `terraform.md` file lists the module structure and all `main.tf` HCL for each module, but provides no content for `variables.tf`, `outputs.tf`, or `environments/poc/main.tf` (the module instantiation with variable wiring). These files must be written from scratch.
9. **No frontend env var for S3 CORS origin:** The S3 CORS rule in `storage.md` uses `https://${var.domain_name}` as the allowed origin. The domain name is not yet decided — it is a Terraform variable placeholder. This needs a concrete value before the Terraform `storage` module can be applied.
10. **Terraform state bucket bootstrapping is manual:** Step 3 of the rollout requires manually creating the S3 state bucket and DynamoDB lock table before `terraform init`. This is documented but there is no script or Makefile target to automate it.
11. **No CloudWatch Logs agent configuration provided:** Step 9 (optional hardening) mentions enabling the CloudWatch Logs agent to ship pm2 logs, but no configuration file or Terraform resource for the agent is provided.
12. **`SERVE_STATIC` environment variable not defined in codebase:** The pm2 ecosystem file sets `SERVE_STATIC: 'false'`, implying the backend can optionally serve the frontend SPA directly. This env var does not appear to be implemented in the current `server.ts`. It may be a planned-but-not-yet-coded feature, or a no-op.

### Currently Working On
_Nothing — initial review complete_

### Queue

- [ ] **Resolve Node.js version:** Decide whether EC2 should run Node 22 or Node 25 (check if any Node 25 features are used in the codebase; update Terraform user_data and pipeline accordingly).
- [ ] **Fix instance/volume type inconsistencies:** Standardise on `t3.micro` (not t2) and `gp3` (not gp2) throughout all Terraform HCL and docs to match the cost table in overview.md.
- [ ] **Fix `better-sqlite3` native module portability:** Change the GitHub Actions pipeline to build `node_modules/` on an Amazon Linux 2023 container (or use `npm ci --omit=dev` on the EC2 instance itself post-scp), so the `.node` binary matches the EC2 environment.
- [ ] **Write missing Terraform files:** Create `terraform/modules/networking/variables.tf`, `modules/compute/variables.tf`, `modules/storage/variables.tf`, `modules/cdn/variables.tf`, all corresponding `outputs.tf` files, and `environments/poc/main.tf` + `variables.tf` + `outputs.tf`.
- [ ] **Implement Step 1 codebase change (`db.ts`):** Change `new Database(':memory:')` to `new Database(process.env.DB_PATH ?? ':memory:')` — the single required infrastructure-forced code change.
- [ ] **Implement Step 2 codebase changes (S3 CV flow):** Create `backend/src/lib/s3.ts`, update `router/team.ts` to use presigned upload URLs, update `lib/generateCv.ts` to upload to S3 and return presigned download URL, update `lib/parseCv.ts` to read from S3 by `s3_key`.
- [ ] **Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`:** Install in the backend package; verify the build still passes.
- [ ] **Decide and document the SSH deploy strategy:** Either (a) use OIDC + AWS SSM Session Manager (no SSH key needed), (b) use a stable deploy bastion, or (c) accept 0.0.0.0/0 SSH and document the risk. Update the security group Terraform resource accordingly.
- [ ] **Write a Terraform bootstrap script:** Add a `scripts/bootstrap-tf-state.sh` that creates the S3 state bucket and DynamoDB lock table, replacing the manual Step 3 commands.
- [ ] **Document `parseCv.ts` change fully:** Add a code sample to `codebase-changes.md` showing how `parseCv.ts` reads CV content from S3 by `s3_key` (analogous to the samples already given for the other three files).
- [ ] **Verify or remove `SERVE_STATIC` env var:** Check if `server.ts` uses `SERVE_STATIC`; if not, remove it from the pm2 ecosystem file to avoid confusion.

---

## Coordination Notes

- Agents should claim a queue item by moving it to "Currently Working On" and updating the date.
- When two agents touch the same file, note it here to avoid conflicts.
- Shared files currently being edited: _none_
