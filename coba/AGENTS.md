# Agent Status Board

This file is the shared coordination log for all agents working on COBA.
Each agent must update their section when they start, change, or finish a task.

**Format rule:** The `Last updated` field must always include both date AND time in `YYYY-MM-DD HH:MM` format (24h). **Always get the real current time by running `date +"%Y-%m-%d %H:%M"` (bash) before writing — never guess or hardcode a time.**

**Git rules:** The `.gitignore` lives at `D:\code\.gitignore` (one level above the project root) and also at `D:\code\coba\.gitignore`. Both exclude `.env` and `backend/.env`. **Never commit any `.env` file.** Always run `git status` before committing to verify no secrets are staged.

## At a Glance

| Agent | Status | Working On | Last Updated |
|-------|--------|------------|--------------|
| Features | Idle | Admin Panel: Wipe action + redesign complete | 2026-04-13 18:46 |
| Architecture & Docs | Idle | — | 2026-04-13 18:28 |
| UI | In Progress | Implementing UI fixes (P0–P3) | 2026-04-13 |
| Seed Data | Idle | Fixed pt.member_id → pt.team_member_id in report query | 2026-04-13 18:46 |
| Reporting | Idle | Audit complete — task list ready | 2026-04-13 18:27 |
| Testing | Idle | Full test suite implemented (P0–P4 complete) | 2026-04-13 18:42 |
| AWS Migration | Idle | Decommission guide written | 2026-04-13 18:28 |
| Security | Idle | Audit complete | 2026-04-13 18:30 |

_Agents: update this table (status, working on, last updated) whenever you pick up or finish a task._

---

## Agents

### Features Agent
Adds and completes missing product features: new backend endpoints, frontend UI sections, delete flows, confirmation dialogs, and cross-cutting feature gaps.

#### Findings Summary (audited 2026-04-13 18:27)

The codebase is broadly functional but has several notable gaps:

1. **No delete endpoints for projects or team members** — `projects.ts` and `team.ts` routers have no `delete` procedure. Users can create but never remove a project or member through the UI.
2. **No update endpoints for geo entries, structures, or features** — `geo.ts`, `structures.ts`, and `features.ts` only expose `create` and `delete`. Inline editing of individual entries is impossible without re-deleting and re-creating.
3. **No update endpoint for time entries** — `timeEntries.ts` has `create` and `delete` but no `update`. Correcting a logged-hours entry requires delete + recreate.
4. **No CV delete endpoint** — `team.ts` has `attachCv` and `getCvData` but no `deleteCv`. Old or incorrect CVs accumulate with no removal path.
5. **No Generate CV endpoint exposed** — `generateCv.ts` exists in `lib/` but is only used in seeding. There is no router procedure to generate a formatted PDF CV for an existing member on demand.
6. **Reports Team tab is a stub** — `Reports.tsx` line 272 renders `reportsTeamComingSoon`. No team utilisation data is shown.
7. **sortBudget label mismatch** — In `en.ts` the sort-by-budget label says `'Most Hours'`, which is wrong; it sorts by budget (money), not hours.
8. **Time entries have no edit flow in the UI** — `ProjectDetail.tsx` and `TeamMemberDetail.tsx` show time entries as read-only rows with no inline edit.
9. **No delete CV UI** — `TeamMemberDetail.tsx` lists CVs with only a download button; no removal action exists.
10. **Task view breadcrumb missing** — `Layout.tsx` breadcrumb only handles `project`, `member`, and `requirement-book`. Opening a `TaskDetail` shows no breadcrumb and no navigational context.
11. **homeMyOpenTasks i18n key exists but is not wired up** — `tasks.byMember` exists in the API layer but is never called on the home page for the personal task list.

#### Queue

**P1 — Critical missing CRUD**

- [ ] **Delete project** — Add `projects.delete` procedure in `backend/src/router/projects.ts` + `backend/src/services/projects.ts`. Add a Delete Project button with confirmation dialog in `frontend/src/views/ProjectDetail.tsx`. Add i18n keys `btnDeleteProject` / `projectDeleteConfirm` in `frontend/src/i18n/en.ts` and `pt.ts`. Navigate back to search on success.
- [ ] **Delete team member** — Add `team.delete` procedure in `backend/src/router/team.ts` + `backend/src/services/team.ts`. Add Delete Member with confirmation in `frontend/src/views/TeamMemberDetail.tsx`. Add keys `btnDeleteMember` / `memberDeleteConfirm` in `en.ts` / `pt.ts`.
- [ ] **Delete CV** — Add `team.deleteCv` procedure in `backend/src/router/team.ts` (SQL: `DELETE FROM member_cvs WHERE id = ?`). Add a delete button next to each CV row in `frontend/src/views/TeamMemberDetail.tsx`. Add key `btnDeleteCv` in `en.ts` / `pt.ts`.

**P1 — Incorrect i18n label**

- [ ] **Fix sortBudget label** — In `frontend/src/i18n/en.ts` change `sortBudget: 'Most Hours'` to `sortBudget: 'Highest Budget'`. Mirror fix in `frontend/src/i18n/pt.ts`. The sort value is `budget` (project budget), unrelated to hours.

**P2 — Missing update flows**

- [ ] **Update time entry** — Add `timeEntries.update` procedure in `backend/src/router/timeEntries.ts` (input: `id`, `hours`, `date`, `description`). Add inline-edit affordance to each time entry row in `frontend/src/views/ProjectDetail.tsx` and `TeamMemberDetail.tsx`.
- [ ] **Update geo entry** — Add `geo.update` procedure in `backend/src/router/geo.ts` + `backend/src/services/geo.ts` (same fields as `CreateGeoEntrySchema` plus `id`). Surface an edit button on each geo-entry row in the project detail view.
- [ ] **Update structure** — Add `structures.update` in `backend/src/router/structures.ts` + `backend/src/services/structures.ts`. Same inline-edit pattern as geo entries.
- [ ] **Update feature** — Add `features.update` in `backend/src/router/features.ts` + `backend/src/services/features.ts`. Add inline edit form to the features section of `frontend/src/views/ProjectDetail.tsx`.

**P2 — Generate CV on demand**

- [ ] **Expose generateCv as endpoint** — Add `team.generateCv` mutation in `backend/src/router/team.ts` that calls `generateCvPdfOrUpload` from `backend/src/lib/generateCv.ts` for a given `memberId` and returns the PDF as base64. Add a Generate PDF CV button in `frontend/src/views/TeamMemberDetail.tsx` that triggers the download. Add keys `btnGenerateCv` / `memberCvGenerating` in `en.ts` / `pt.ts`.

**P2 — Task view breadcrumb**

- [ ] **Breadcrumb for task view** — In `frontend/src/components/Layout.tsx`, extend the `hasBreadcrumb` check and breadcrumb render block to handle `page.view === 'task'`. Show: Search Projects / {projectName} / Task. The `TaskDetail` page already receives `projectId` and `projectName` as props via the `Page` union.

**P3 — Reports Team tab**

- [ ] **Implement Reports Team tab** — Replace the stub paragraph in `frontend/src/views/Reports.tsx` (around line 272) with a real team-utilisation summary. Reuse the `timeEntries.report` data (already available via `useTimeReport` in `TimeReport.tsx`). Display: member name, total hours, project count, overdue task count (cross-reference `useOverdueTasks` assignees).

**P3 — Personal My Tasks on Home**

- [ ] **My Open Tasks list on UserHome** — In `frontend/src/views/Home.tsx` inside `UserHome`, add a call to `useTasksByMember(user.id)` (hook exists in `frontend/src/api/tasks.ts`) and render non-done tasks under the `homeMyOpenTasks` i18n heading. Each task should navigate to `TaskDetail` on click.

---

### Architecture & Docs Agent
Owns code structure, refactoring, type safety, N+1 query fixes, error handling standardisation, pagination, and developer documentation.

#### Findings Summary (audited 2026-04-13 18:28)

**Files audited:** all `docs/` files, `CLAUDE.md` (project instructions), `agents.md`, vs the current backend/frontend source tree.

**Stale or missing documentation found and fixed:**

1. **`docs/backend/db.md`** — described the old monolithic `db.ts` barrel. Rewritten to document the full layered `db/` directory structure (`client.ts`, `schema.ts`, `statements/<domain>.ts`, `index.ts`) and the updated 21-table schema (added `requirement_assignments`, `time_entries`, `company_teams`, `company_team_members` vs the 17 listed previously).

2. **`docs/backend/router-projects.md`** — was describing `RawProject`/`mapProject` as local to the router file; they were extracted to `types/projects.ts` and `services/projects.ts` in Phase 2. Updated to reflect thin-router delegation pattern.

3. **`docs/backend/router-team.md`** — was listing `suggestMembers` as a team router procedure; it was moved to `requirements` router. Updated dependencies to reference `services/team.ts` and corrected all stale notes.

4. **`docs/backend/router-requirements.md`** — added `parseRequirements` procedure (PDF/DOCX AI extraction), correct service/matching.ts delegation, and `USE_REAL_AI` dispatch pattern.

5. **`docs/frontend/App.md`** — was describing "eight view components"; now documents all 13 (added CompanyTeams, AdminPanel, TimeReport). Updated to note `Page` type is now defined in `types/pages.ts`, not inline in App.tsx.

6. **`docs/frontend/ProjectDetail.md`** — was incorrectly stating `GeoSection`/`StructureSection`/`Field` are imported from `AddProject.tsx`; they were extracted to `components/shared/`. Updated dependencies. Added time entries section.

7. **`docs/backend/lib-parseCv.md`** and **`docs/backend/lib-suggestMembersAi.md`** — updated to document the `USE_REAL_AI` mock/real dispatch pattern.

8. **`docs/backend/server-and-index.md`** — updated seed order to include `seedCompanyTeams` and `seedTimeEntries`; added note about `USE_REAL_AI` env var.

**New documentation created:**

9. **`docs/backend/router-new.md`** — covers four routers with no prior docs: `admin.ts` (reseed), `system.ts` (aiEnabled), `companyTeams.ts` (team CRUD + membership), `timeEntries.ts` (time tracking + aggregate report).

10. **`docs/backend/lib-parseRequirements.md`** — documents `parseRequirementsFromPdf`, `parseRequirementsFromDocx`, `RequirementsOutputSchema`, and the mammoth DOCX extraction path.

11. **`docs/backend/lib-s3.md`** — documents the AWS S3 helper functions (presigned URLs, upload, delete) and when they are active.

12. **`docs/frontend/new-views.md`** — covers three views with no prior docs: `CompanyTeams.tsx`, `AdminPanel.tsx`, `TimeReport.tsx`.

13. **`CLAUDE.md`** at repo root — created (was missing from repo, only existed in harness context). Reflects current 21-table schema, 11-router backend, 13-view frontend, and the full layered architecture.

14. **`docs/README.md`** — updated navigation index: added new router doc, new lib docs, new view docs, AWS Deployment Guide, AWS Decommission Guide, Security Tools doc; added table for extracted frontend modules (api/, constants/, types/, utils/, components/shared/).

15. **`docs/Agents.md`** — rewrote to reflect the 7 current agents (was listing only 4). Responsibilities now match `agents.md`.

**Redirect stubs unchanged** — `docs/AUTH_PLAN.md`, `docs/PROJECT_LAYOUT_PLAN.md`, `docs/TEAM_MEMBER_REWORK_PLAN.md`, `docs/TESTING_STRATEGY.md`, `docs/index.md` are one-line redirects pointing to the current file locations; these were left as-is.

### UI Agent
Owns all frontend CSS, component styling, i18n correctness, accessibility, UX polish, and visual consistency across views.

**Last updated:** 2026-04-13 18:27 | **Status:** Idle — audit complete

#### Findings Summary

Audited: `frontend/src/index.css` (1722 lines), all 12 views, `components/Layout.tsx`, `i18n/en.ts` + `pt.ts` (497 keys each).

Top issues found:

1. **Undefined CSS variables** — `--r-md`, `--r-lg`, `--muted`, `--card` used in ~18 rules but absent from `:root`. Silently breaks border-radius and colour on member cards, history cards, suggest panel, PM autocomplete, import panels, and `.btn-cancel`.
2. **Duplicate rules** — `.input--sm` declared at lines 906 and 1076 (different sizes); `.btn-sm` at lines 934 and 1077. First declarations are dead code.
3. **Untranslated hardcoded strings** — `SearchProjects.tsx` line 35 always renders "projeto"/"projetos" in Portuguese. `Reports.tsx` lines 10-16 uses hardcoded English `STATUS_LABELS`/`CATEGORY_LABELS` instead of `t()`.
4. **Missing home-page CSS modifiers** — `home-project-row--cancelled` and `home-project-row--completed` not defined; those rows show default grey left border.
5. **PM autocomplete contrast** — `.pm-suggestions` background is `var(--navy)` but `.pm-sug-name` uses `var(--text)` (dark #374151 on dark navy) — nearly unreadable.
6. **`.view` class has no CSS rule** — every view root uses `className="view"` but no CSS rule exists for it.
7. **No `:focus-visible` styles** — entire stylesheet has no keyboard focus indicator.
8. **TaskDetail breadcrumb missing** — `Layout.tsx` `hasBreadcrumb` excludes `task` view.
9. **`homeMyOpenTasks` i18n key defined in both files but used by no view**.
10. **`suggest-badge`/`suggest-evidence` invisible on white surfaces** — near-transparent white backgrounds and `var(--muted)` (undefined) text colour.

#### Queue

**P0 — Broken/invisible UI**

- [ ] **P0-1** `frontend/src/index.css` `:root` (lines 2-30): Add `--r-md: 10px; --r-lg: 14px; --muted: #9ca3af; --card: #ffffff;`
- [ ] **P0-2** `frontend/src/index.css` line 1542: `.pm-sug-name` — change `color: var(--text)` to `color: rgba(255,255,255,.9)`
- [ ] **P0-3** `frontend/src/index.css` line 1543: `.pm-sug-title` — change `color: var(--muted)` to `color: rgba(255,255,255,.55)`

**P1 — Functional but incorrect**

- [ ] **P1-1** `frontend/src/views/SearchProjects.tsx` line 35: Replace hardcoded "projeto"/"projetos" with `t()` (add `countSingular`/`countPlural` keys to both i18n files)
- [ ] **P1-2** `frontend/src/views/Reports.tsx` lines 10-16, 122-127: Replace `STATUS_LABELS`/`CATEGORY_LABELS` with `t(STATUS_KEY[...])` and `t(CAT_KEY[...])`
- [ ] **P1-3** `frontend/src/index.css` after line 175: Add `.home-project-row--cancelled { border-left-color: var(--red); }` and `.home-project-row--completed { border-left-color: #7c3aed; }`
- [ ] **P1-4** `frontend/src/index.css` after line 108: Add `.view { display: flex; flex-direction: column; gap: 28px; }`
- [ ] **P1-5** `frontend/src/components/Layout.tsx` line 24: Add `|| page.view === 'task'` to `hasBreadcrumb`; add task breadcrumb case (coordinate with Features Agent who also listed this)

**P2 — CSS hygiene and visual inconsistencies**

- [ ] **P2-1** `frontend/src/index.css` line 906: Remove first `.input--sm` (dead; conflicts with line 1076)
- [ ] **P2-2** `frontend/src/index.css` line 934: Remove first `.btn-sm` (dead; conflicts with line 1077)
- [ ] **P2-3** `frontend/src/index.css` line 1527: Remove `!important` from `.report-near-deadline-title`; use `var(--amber)` not hardcoded `#f59e0b` (lines 1526-1527)
- [ ] **P2-4** `frontend/src/views/TimeReport.tsx` lines 21-25: 3 KpiCard elements in a 4-column `kpi-grid` leave an empty cell — add 4th card or add `.kpi-grid--3 { grid-template-columns: repeat(3,1fr); }` CSS variant
- [ ] **P2-5** `frontend/src/index.css` lines 971, 1124: `.suggest-badge` and `.suggest-evidence` — change to `background: var(--off); color: var(--text-lt);`
- [ ] **P2-6** `frontend/src/index.css` line 534: `.btn-cancel { color: var(--muted) }` — change to `color: var(--text-md)`
- [ ] **P2-7** `frontend/src/index.css` in `@media (max-width: 768px)`: Add `.home-grid { grid-template-columns: 1fr; }` (no tablet breakpoint for `1fr 240px` grid)

**P3 — Accessibility, polish, dead code**

- [ ] **P3-1** `frontend/src/index.css` after reset block (line 38): Add `*:focus-visible { outline: 2px solid var(--orange); outline-offset: 2px; border-radius: 2px; }`
- [ ] **P3-2** `frontend/src/i18n/en.ts` + `pt.ts`: Hold on removing `homeMyOpenTasks` until Features Agent wires up My Tasks list on home page
- [ ] **P3-3** `frontend/src/index.css` lines 779-795: Add `--teal: #0f766e;` to `:root`; remove `var(--teal, #0f766e)` fallbacks from all 6 structure rules
- [ ] **P3-4** `frontend/src/views/Home.tsx` lines 150-155: Change oversight nav toggle from `className="btn-submit"` to `className="btn-secondary"`
- [ ] **P3-5** `frontend/src/components/Layout.tsx` line 21: Set active nav to `''` for `task` view (currently highlights "Search Projects" incorrectly)

### Seed Data Agent
Owns the quality and realism of all seed data across all 16 database tables. Ensures demo data exercises every feature and edge case.

#### Findings Summary (audited 2026-04-13 18:46)

**Root cause of time entry display failure:**

The bug was in `backend/src/router/timeEntries.ts` in the `report` procedure's `underreportingRows` query (line 161). It joined `project_team` with `pt.member_id = tm.id`, but the DDL column is `team_member_id` (not `member_id`). SQLite raises "no such column: pt.member_id", which caused the entire `report` tRPC procedure to throw an error. The frontend `useTimeReport()` hook received an error response, leaving `data` undefined, so all three sections (byProject, byMember, underreporting) rendered empty or showed no data.

**Fix applied:**
- `backend/src/router/timeEntries.ts` line 161: changed `pt.member_id` → `pt.team_member_id`

**Other checks — all clear:**
- `admin.ts` reseed mutation: calls `seedTimeEntries()` last, inside a try/catch that surfaces errors — correct order, no silent swallowing
- `seed/timeEntries.ts`: INSERT columns (`project_id`, `member_id`, `date`, `hours`, `description`) match DDL exactly; exported as `db.transaction()` — correct
- `db/schema.ts` `time_entries` DDL: uses `member_id` (confirmed)
- `seed/projects.ts`: 34 projects seeded (IDs 1–34); all project IDs used in timeEntries.ts (2, 3, 5, 7, 8, 10, 11, 13, 14, 17, 19, 22, 24, 26, 29) are valid
- `seed/team.ts`: 30 members seeded (IDs 1–30); all member IDs used in timeEntries.ts (max 29) are valid
- `byProject` and `byMember` router queries: correct SQL, no issues
- `frontend/src/views/TimeReport.tsx`: correctly uses `useTimeReport()`, handles empty data gracefully
- `frontend/src/api/timeEntries.ts`: hooks set up correctly
- `frontend/src/views/AdminPanel.tsx`: `qc.invalidateQueries()` invalidates all cached queries — correct

**Status:** Idle

### Reporting Agent
Owns the Reports view and all backend aggregate/stats procedures. Adds new tabs, charts, and data summaries to give project portfolio visibility.

#### Findings Summary (audited 2026-04-13 18:27)

**Files audited:**
- `frontend/src/views/Reports.tsx`
- `frontend/src/views/TimeReport.tsx`
- `backend/src/router/projects.ts`, `tasks.ts`, `timeEntries.ts`, `team.ts`
- `backend/src/services/projects.ts`, `tasks.ts`, `team.ts`
- `frontend/src/api/projects.ts`, `tasks.ts`, `timeEntries.ts`
- `frontend/src/i18n/en.ts`, `pt.ts`

**Key gaps identified:**

1. **Team tab is a stub** — `Reports.tsx` line 272 renders only `t('reportsTeamComingSoon')`. No backend procedure, no query hook, and no i18n content keys exist for team workload/utilisation data.
2. **Time Report is siloed as a standalone view** — `TimeReport.tsx` lives at `/time-report`, separate from Reports. The `useTimeReport` hook and `timeEntries.report` backend procedure are fully built but unreachable from the main Reports hub.
3. **No task aggregate stats procedure** — the tasks router has only per-project/cross-project list queries (overdue, blocked, near-deadline), no count/summary aggregates suitable for charts.
4. **No budget breakdown chart** — `getProjectStats` returns only a single `totalBudget` (EUR sum only). No `byBudgetRange`, per-category budget, or `avgBudget` breakdown exists.
5. **No geo/structure portfolio aggregate** — no procedure counts total boreholes, trial pits, or structures across all projects.
6. **Hardcoded Portuguese strings in `Reports.tsx`** — three strings bypass `t()`:
   - Line 317: `title={isExpanded ? 'Fechar tarefas' : 'Ver tarefas'}`
   - Line 332: `{project.doneTasks}/{project.totalTasks} concluídas`
   - Line 376: `Sem tarefas`
7. **Missing `reportsTabTime` tab** — no "Time" tab button in Reports; `reportsTabTime` i18n key does not exist in either locale file.
8. **`riskSummary` procedure unused in Reports** — `projects.riskSummary` exists and is used on Home but is not surfaced in the Reports Summary tab.
9. **`sortBy: 'budget'` sorts by hours, not budget** — bug in `backend/src/services/projects.ts` line 49: the budget sort case runs `ORDER BY total_hours DESC` instead of `ORDER BY p.budget DESC NULLS LAST`.
10. **`timeEntries.report` underreporting join uses wrong column** — `backend/src/router/timeEntries.ts` ~line 157: `JOIN project_team pt ON pt.member_id = tm.id` but the schema column is `team_member_id`. This silently returns zero underreporting rows.
11. **No In-Progress tasks section** — Tasks tab shows overdue, near-deadline, and blocked tasks but no in-progress summary, limiting active workload visibility.
12. **Missing i18n keys** — `reportsExpandOpen`, `reportsExpandClose`, `reportsDoneOf`, `reportsTabTime`, `reportsInProgressTitle`, `reportsInProgressEmpty`, `tableByBudget`, `reportsTeamWorkload`, `reportsTeamTaskLoad`, `reportsTeamProjectCount`, `reportsTeamHours`, `reportsTeamOverdue`.

#### Queue (prioritised)

- [ ] **P1** Fix hardcoded PT strings in `frontend/src/views/Reports.tsx` lines 317, 332, 376 — replace with `t()` calls; add keys `reportsExpandOpen`, `reportsExpandClose`, `reportsDoneOf` to `frontend/src/i18n/en.ts` and `pt.ts`.
- [ ] **P1** Fix `timeEntries.report` underreporting join in `backend/src/router/timeEntries.ts` — change `pt.member_id` to `pt.team_member_id`.
- [ ] **P1** Fix `sortBy: 'budget'` sort bug in `backend/src/services/projects.ts` line 49 — change `ORDER BY total_hours DESC` to `ORDER BY p.budget DESC NULLS LAST`.
- [ ] **P2** Implement Team tab: add `getTeamWorkload()` to `backend/src/services/team.ts` returning per-member `activeProjectCount`, `openTaskCount`, `totalHoursLogged`, `overdueTaskCount`; expose as `team.workload` in `backend/src/router/team.ts`; add `useTeamWorkload` hook in `frontend/src/api/team.ts`; render sortable table in `Reports.tsx` Team tab replacing the stub.
- [ ] **P2** Surface Time Report as a `'time'` tab inside `Reports.tsx`: add tab button with `reportsTabTime` i18n key; render `TimeReport` content inline; add `reportsTabTime` to `en.ts` (EN: "Time") and `pt.ts` (PT: "Tempo"). Keep standalone `TimeReport.tsx` for direct navigation.
- [ ] **P2** Add task aggregate stats: add `getTaskStats()` to `backend/src/services/tasks.ts` returning `{ byStatus, byPriority, totalOpen, totalDone }`; add `tasks.stats` tRPC procedure in `backend/src/router/tasks.ts`; add `useTaskStats` hook in `frontend/src/api/tasks.ts`; render KPI row in Tasks tab header of `Reports.tsx`.
- [ ] **P3** Add In-Progress tasks section to Tasks tab: add `getInProgress()` to `backend/src/services/tasks.ts` (mirrors `getBlocked()` with `status = 'in_progress'`); expose as `tasks.inProgress` tRPC procedure; add `useInProgressTasks` hook; render in Tasks tab between near-deadline and overdue sections. Add i18n keys `reportsInProgressTitle` / `reportsInProgressEmpty`.
- [ ] **P3** Add budget breakdown to Summary tab: extend `getProjectStats` in `backend/src/services/projects.ts` to return `byBudgetRange` (buckets: `<100k`, `100k–500k`, `500k–1M`, `>1M`) and average budget; add a `ReportTable` in `Reports.tsx` Summary tab; add i18n key `tableByBudget` to both locale files.
- [ ] **P3** Surface `riskSummary` in Reports Summary tab: add a "Portfolio Risk" KPI row using the existing `useRiskSummary` hook (projects with overdue tasks count, projects with blocked tasks count). No backend changes needed.
- [ ] **P4** Add geo/structure portfolio stats: add `getPortfolioGeoStats()` to `backend/src/services/projects.ts` returning total borehole, trial pit, and structure counts; expose as `projects.geoStats` tRPC procedure; render as additional KPI cards in the Summary tab.
- [ ] **P4** Add all remaining missing i18n keys to `frontend/src/i18n/en.ts` and `pt.ts`: `reportsTabTime`, `reportsExpandOpen`, `reportsExpandClose`, `reportsDoneOf`, `reportsInProgressTitle`, `reportsInProgressEmpty`, `tableByBudget`, `reportsTeamWorkload`, `reportsTeamTaskLoad`, `reportsTeamProjectCount`, `reportsTeamHours`, `reportsTeamOverdue`.

### Testing Agent
Owns backend unit tests (Vitest), frontend component tests (RTL), and E2E tests (Playwright). Responsible for CI workflow setup.

#### Findings Summary (audited 2026-04-13 18:27)

**What already exists:**
- Backend schemas: `projects`, `requirements`, `tasks` — well covered with enum, default, and rejection tests.
- Backend services: `projects`, `requirements`, `tasks`, `team`, `matching` — good unit coverage via Vitest + in-memory SQLite (`setup.ts` with `resetDb()`).
- Backend types: all seven mappers (`projects`, `geo`, `structures`, `features`, `tasks`, `requirements`, `team`) — fully covered.
- Frontend utils: `format.ts` (fmt, fmtDate, fmtDim, initials) — covered.
- E2E (Playwright): navigation, project list/detail/search, task detail/comments, team list/detail, requirements list/detail/add. Runs against full stack via webServer config.

**Critical gaps identified:**

1. **Backend setup.ts missing two tables** — `resetDb()` does not delete `time_entries` or `company_teams`/`company_team_members`. Any future service tests for those domains will have cross-test contamination.
2. **No service tests for `geo`, `features`, `structures`** — three functions each with zero coverage; nullable numeric fields are error-prone.
3. **No service or router tests for `timeEntries`** — six router procedures including complex aggregation SQL (`stats`).
4. **No service or router tests for `companyTeams`** — eight router procedures, no test file exists.
5. **No schema tests for `geo`, `features`, `structures`, `team`** — GeoTypeSchema, CreateGeoEntrySchema, CreateFeatureSchema, CreateStructureSchema, MemberInputSchema, HistoryInputSchema all untested.
6. **No frontend component tests** — `frontend/src/__tests__/` has only `utils/format.test.ts`. No RTL tests for any of the 12 views or 4 shared components.
7. **No tests for `pages.ts` routing logic** — `pageToPath()` and `pathToPage()` handle 13 routes; a bug silently breaks deep-link navigation.
8. **No tests for `download.ts` util** — two distinct code paths (base64 vs S3 presigned URL) with zero coverage.
9. **No tests for i18n context/fallback** — 498 translation keys; missing PT key silently shows raw key strings to users.
10. **E2E gaps** — No coverage for: `CompanyTeams`, `TimeReport`, `AdminPanel`, `AddProject` full submit, `Reports` dashboard, browser back-button navigation.
11. **No CI workflow** — No `.github/workflows/` config; entire test suite is manual-run only.

#### Queue

- [x] **P0 — Fix `resetDb()` to include `time_entries`, `company_teams`, `company_team_members`**
  File: `backend/src/__tests__/setup.ts`
  Done: Added three DELETE statements; all 286 backend tests pass.

- [x] **P1 — `backend/src/__tests__/services/geo.test.ts`** (new file)
  Done: 18 tests covering getGeoByProject (ordering, isolation), createGeoEntry (all nullables, all 4 types), deleteGeoEntry (idempotent).

- [x] **P1 — `backend/src/__tests__/services/features.test.ts`** (new file)
  Done: 13 tests covering getFeaturesByProject, createFeature (with/without lat/lng), deleteFeature (idempotent).

- [x] **P1 — `backend/src/__tests__/services/structures.test.ts`** (new file)
  Done: 14 tests covering getStructuresByProject, createStructure (all 11 types, all null optionals, full optionals), deleteStructure.

- [x] **P1 — `backend/src/__tests__/services/timeEntries.test.ts`** (new file)
  Done: 11 tests covering byProject, byMember, create, delete, and all three report aggregations (byProject, byMember, underreporting). Fixed schema bug: `project_team.team_member_id` not `member_id`.

- [x] **P1 — `backend/src/__tests__/services/companyTeams.test.ts`** (new file)
  Done: 20 tests covering list (ordering, memberCount), byId (throws for missing), create, update, delete (cascade), addMember (idempotent), removeMember (no-op), byMember.

- [x] **P2 — `backend/src/__tests__/schemas/geo.test.ts`** (new file)
  Done: GeoTypeSchema (4 valid types, rejects unknown), CreateGeoEntrySchema (requires projectId+pointLabel, defaults, all optionals).

- [x] **P2 — `backend/src/__tests__/schemas/features.test.ts`** (new file)
  Done: CreateFeatureSchema (requires projectId, defaults, optional lat/lng, rejects float projectId).

- [x] **P2 — `backend/src/__tests__/schemas/structures.test.ts`** (new file)
  Done: CreateStructureSchema (requires projectId, defaults to "other", all 11 types, all optionals, rejects invalid type, STRUCTURE_TYPES exports checked).

- [x] **P2 — `backend/src/__tests__/schemas/team.test.ts`** (new file)
  Done: MemberInputSchema, HistoryInputSchema (array defaults), HistoryGeoSchema (defaults + all 4 types), HistoryStructureSchema (defaults to "other"), HistoryFeatureSchema.

- [x] **P2 — `frontend/src/__tests__/utils/pages.test.ts`** (new file)
  Done: 37 tests — pageToPath for all 13 variants, pathToPage for all 13 variants + trailing slash + unknown paths, full round-trip suite.

- [x] **P2 — `frontend/src/__tests__/utils/download.test.ts`** (new file)
  Done: 5 tests — null data early return, missing fileData early return, base64 blob URL + click, S3 presigned URL + click (no blob), no revokeObjectURL in S3 mode.

- [x] **P3 — `frontend/src/__tests__/i18n.test.ts`** (new file)
  Done: key-parity (every en.ts key in pt.ts), same count, no empty PT values, useTranslation defaults to PT, t() returns PT string, setLang switches to EN, switches back to PT.

- [x] **P3 — `frontend/src/__tests__/components/Layout.test.tsx`** (new file)
  Done: 14 tests — brand logo, PT nav labels, lang toggle (EN button visible → click → EN labels), nav buttons call onNavigate, breadcrumbs for project/member/requirement-book, active tab class, no admin button for non-oversight.

- [x] **P3 — `frontend/src/__tests__/views/SearchProjects.test.tsx`** (new file)
  Done: 9 tests — loading state, empty list, project cards, ref codes, client names, card click calls onNavigate, search input, filter selects, count label.

- [x] **P3 — `frontend/src/__tests__/views/Reports.test.tsx`** (new file)
  Done: 8 tests — loading, null when no data, heading, no crash on empty data, tab buttons visible, overdue tasks section, full data no crash, tab switch.

- [x] **P4 — E2E: `e2e/tests/companyTeams.spec.ts`** (new file)
  Done: navigate to page, shows list/empty, create team, create + add member, create + delete team (with confirm dialog handling).

- [x] **P4 — E2E: `e2e/tests/timeReport.spec.ts`** (new file)
  Done: navigate by nav, direct URL, data/no-data check, KPI grid visible, section headings for by-project/by-member/underreporting, graceful seed data check, no JS errors.

- [ ] **P4 — E2E: `e2e/tests/addProject.spec.ts`** (not implemented — deferred)
- [ ] **P4 — E2E: `e2e/tests/reports.spec.ts`** (not implemented — deferred)
- [ ] **P4 — E2E: back-button navigation** (not implemented — deferred)

- [x] **P5 — CI workflow check**
  Done: Verified `D:/code/.github/workflows/ci.yml` already exists and runs `npm test` for both backend and frontend. No update needed — new test files are auto-discovered by vitest. Note: CI item in audit was incorrect (workflow DID exist).

### AWS Migration Agent
Owns the migration of COBA from local/in-memory to AWS (EC2 + EBS SQLite + S3 + CloudFront). Responsible for Terraform, deploy pipeline, and required codebase changes.

**Completed work:**
- Terraform modules: `networking`, `compute`, `storage`, `cdn`, `github_oidc`, `bootstrap`
- Deployment guide: `docs/aws/DEPLOYMENT_GUIDE.md`
- Architecture docs: `docs/aws/overview.md`, `compute.md`, `storage.md`, `database.md`, `pipeline.md`, `terraform.md`, `rollout.md`
- Decommission guide: `docs/aws/decommission.md` (written 2026-04-13) — covers full teardown order, exact AWS CLI commands, Terraform destroy approach, GitHub cleanup, and cost verification

### Security Agent
Owns security auditing of the full codebase: backend endpoints, auth layer, input validation, SQL injection, XSS, secrets handling, dependency vulnerabilities, and OWASP Top 10.

#### Findings Summary (audited 2026-04-13 18:30)

**Overall risk level: HIGH**

Full report: `docs/security-audit.md`. Tool guide: `docs/security-tools.md`.

**Key findings:**

1. **CRITICAL — No server-side auth on any tRPC procedure.** All procedures use `publicProcedure`. Any HTTP client can invoke mutations including `admin.reseed` (wipes entire DB). `createContext` returns `{}`. No session, JWT, or API key validation exists anywhere on the backend.
2. **HIGH — `admin.reseed` has no server-side role check.** Only the client-side `user.role !== 'oversight'` check gates this endpoint. Trivially bypassed.
3. **HIGH — Auth is localStorage-only, bypassable via DevTools.** The `role` field stored in localStorage can be manually changed to `'oversight'` by any user, granting access to the Admin Panel.
4. **HIGH — Live `ANTHROPIC_API_KEY` stored in plain-text `backend/.env`.** Key excluded from git but at risk of accidental commit or server compromise.
5. **HIGH — No security headers set** (no CSP, no X-Frame-Options, no X-Content-Type-Options, no HSTS).
6. **HIGH — No file type or size validation on CV/PDF uploads.** Any file type accepted; no size limit; base64 string unbounded in Zod schema.
7. **MEDIUM — UserSwitcher rendered unconditionally** — no `import.meta.env.DEV` guard. Production users can switch identity to any team member.
8. **MEDIUM — Prompt injection risk** in 4 Claude API call sites (`parseCv`, `parseProject`, `parseRequirements`, `suggestMembersAi`). Instruction prompts not separated from untrusted document content via `system` role.
9. **MEDIUM — CORS allows all `localhost:*` ports**, which is fine for dev but must be tightened before production deployment.
10. **LOW — Several Zod schema gaps:** no `.max()` on string fields, no date format regex, `z.array(z.any())` in `createWithHistory`, no `hours` upper bound.

**What is safe:**
- All SQL uses parameterised prepared statements — no SQL injection found.
- No `dangerouslySetInnerHTML` in frontend — React XSS protection intact.
- No shell execution anywhere.
- API key never logged or returned in responses.
- No hardcoded credentials in source files.

#### Queue

- [ ] **P0 — Implement server-side auth middleware** (`authedProcedure`) in `backend/src/trpc.ts`. Replace `publicProcedure` on all mutations. Update `createContext` in `backend/src/index.ts`.
- [ ] **P0 — Add server-side role check to `admin.reseed`** in `backend/src/router/admin.ts` — create `oversightProcedure`, do not rely on frontend check.
- [ ] **P1 — Rotate ANTHROPIC_API_KEY immediately.** Current key in `backend/.env` must be treated as compromised. Move to AWS Secrets Manager for production.
- [ ] **P1 — Add `secureHeaders` middleware** in `backend/src/index.ts` (Hono built-in: `hono/secure-headers`). Configure CSP, X-Frame-Options, X-Content-Type-Options, HSTS.
- [ ] **P1 — Validate file type (PDF magic bytes) and add size limit** in `backend/src/router/team.ts` and all base64 input fields.
- [ ] **P1 — Guard `UserSwitcher` with `import.meta.env.DEV`** in `frontend/src/components/Layout.tsx` line 57.
- [ ] **P2 — Move Claude instruction prompts to `system` parameter** in all 4 AI lib files to reduce prompt injection surface.
- [ ] **P2 — Lock CORS to specific allowed origins** via `process.env.ALLOWED_ORIGINS`.
- [ ] **P2 — Derive `authorName` from auth context** in `tasks.addComment` (after P0 auth work).
- [ ] **P3 — Replace `z.array(z.any())` in `createWithHistory`** with typed `HistoryGeoSchema` / `HistoryStructureSchema` / `HistoryFeatureSchema`.
- [ ] **P3 — Add `.max()` to all free-text Zod fields**, date regex validation, and `hours.max(24)` in time entries.
- [ ] **P3 — Use `TRPCError` with proper codes** instead of bare `Error` throws in `admin.ts` and `companyTeams.ts`.
- [ ] **P4 — Set up `npm audit` + Semgrep in CI** (see `docs/security-tools.md` for configs).

---

## Coordination Notes

- Agents should claim a task by updating their status and the At a Glance table.
- When two agents touch the same file, note it here to avoid conflicts.
- Shared files currently being edited: _none_
