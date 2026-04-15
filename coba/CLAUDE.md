# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

COBA is a bilingual (EN/PT) project management app for civil engineering / geotechnical projects. It tracks projects and their associated geological entries, civil structures, team members, requirement books, tasks, time entries, and company teams. The database is **in-memory SQLite** — data resets on every backend restart.

## Commands

Run from the `coba/` directory:

```bash
# Development (runs backend on :3000 + frontend on :5173 concurrently)
npm run dev

# Individual servers
npm run dev:backend      # tsx watch on backend
npm run dev:frontend     # Vite dev server

# Build
npm run build            # tsc (backend) + tsc+vite (frontend)

# Lint (frontend only)
npm --prefix frontend run lint

# Preview production frontend
npm --prefix frontend run preview
```

To run all three apps together with the reverse proxy, use `npm run dev` from the repo root (`D:\code`).

Requires Node >= v25 (see `.nvmrc`).

## Architecture

COBA is one app inside the larger monorepo. Its own `package.json` at `coba/` orchestrates `backend/` and `frontend/` via `concurrently`.

### Backend (`backend/src/`)

- **Hono** HTTP server with **tRPC** router mounted at `/trpc/*` and a health endpoint at `/api/health`
- **better-sqlite3** in-memory database (WAL pragma) with 21 tables
- **@anthropic-ai/sdk** — Claude API integration for CV parsing, project parsing, requirements extraction, and team member matching
- **pdfkit** — PDF generation for team member CVs
- **mammoth** — DOCX to plain text extraction for requirements parsing
- Entry point: `server.ts` → `index.ts` (Hono app setup)
- `db/` — split database layer (client, schema, per-domain statements, barrel index)
- `db.ts` — legacy re-export barrel pointing to `db/index.ts`
- `trpc.ts` — tRPC initialization

**Backend layers (post Phase-2 refactor):**
- `types/<domain>.ts` — `Raw*` types (snake_case DB rows) and `map*()` pure functions
- `schemas/<domain>.ts` — Zod validation schemas and domain constants
- `services/<domain>.ts` — all DB queries and business logic
- `router/<domain>.ts` — thin tRPC procedure wrappers; delegate to services

**Database tables (21 total):**
- `projects` — core project records (20 cols)
- `geo_entries` — geological entries (boreholes, trial pits, etc.), FK to projects
- `structures` — civil structures (bridges, dams, tunnels, etc.) with geo coords, FK to projects
- `project_features` — labelled geo features per project
- `team_members` — staff profiles (name, title, email, phone, bio, role, password_hash)
- `member_cvs` — uploaded CV PDFs (base64 in TEXT or S3 key), FK to team_members
- `project_team` — M2M join: team members tagged to projects with a role
- `member_history` — a team member's past project work history
- `member_history_geo` / `member_history_structures` / `member_history_features` — geo/structure/feature entries within history records
- `requirement_books` — collections of staffing requirements, optionally linked to a project
- `requirements` — individual requirements (discipline, level, certifications)
- `requirement_assignments` — M2M: team member assigned to fulfil a requirement
- `tasks` — project tasks (status: todo/in_progress/review/blocked/done; priority: low/medium/high)
- `task_assignments` — M2M: team members assigned to tasks
- `task_comments` — comments on tasks
- `time_entries` — hours logged by a member against a project on a given date
- `company_teams` — internal organisational teams (e.g. Geotecnia, Estruturas)
- `company_team_members` — M2M: member belongs to a company team

**Routers** (`router/`):
- `projects.ts` — list (search/filter/sort), byId, create, update, stats, myProjects, riskSummary, parseProject
- `geo.ts` — byProject, create, delete
- `structures.ts` — byProject, create, delete
- `features.ts` — byProject, create, delete
- `team.ts` — list, byId, create, update, byProject, tagProject, untagProject, addHistory, updateHistory, deleteHistory, createWithHistory, parseCv, getCvData, attachCv
- `requirements.ts` — books CRUD, requirements CRUD, matchMembers (local + AI), parseRequirements
- `tasks.ts` — byProject, create, update, delete, getTask, addAssignment, removeAssignment, addComment, deleteComment, overdue, nearDeadline, blocked, myOverdue, myNearDeadline, byMember
- `timeEntries.ts` — byProject, byMember, create, delete, report
- `companyTeams.ts` — list, byId, create, update, delete, addMember, removeMember, byMember
- `admin.ts` — reseed (wipes and re-seeds entire DB)
- `system.ts` — aiEnabled (reads USE_REAL_AI env var)

**AI helpers** (`lib/`):
- `parseCv.ts` — extracts structured project history from uploaded PDF CVs via Claude API
- `parseProject.ts` — parses project detail out of a PDF document
- `parseRequirements.ts` — extracts a requirement book from a PDF or DOCX document
- `generateCv.ts` — generates PDF CVs with pdfkit from member data
- `suggestMembersAi.ts` — matches team members to requirements using Claude API
- `s3.ts` — AWS S3 helpers (presigned URLs, upload, delete) for the AWS deployment
- `mocks/` — mock implementations of all AI libs; used when `USE_REAL_AI` is not set

**AI dispatch:** All AI lib functions (except `parseProject`) check `USE_REAL_AI=true` in the environment. If not set, they import from `lib/mocks/` and return deterministic mock data. This allows the app to run fully without an Anthropic API key.

**Seed data** (`seed/`):
- `projects.ts` — 5 COBA projects with geo entries and structures
- `team.ts` — 32 team members with history and generated PDFs (async, gates server start)
- `requirements.ts` — sample requirement books
- `tasks.ts` — sample tasks and assignments
- `companyTeams.ts` — internal team groupings
- `timeEntries.ts` — sample time log entries

Zod (v4) schemas validate input (camelCase) and map to snake_case for DB columns. `backend/.env` must contain `ANTHROPIC_API_KEY` (and `USE_REAL_AI=true` to enable real AI calls).

### Frontend (`frontend/src/`)

- **React 19** + **Vite** + **TanStack React Query** + **tRPC client**
- Client-side routing via state in `App.tsx`; URL ↔ page sync via `pageToPath()` / `pathToPage()` (defined in `types/pages.ts`) and the History API
- `views/` — 13 view components:
  - `Home` — role-based dashboard (UserHome / OversightHome)
  - `SearchProjects` — list, search, filter by status/category/country
  - `AddProject` — create project with inline geo entries and structures
  - `ProjectDetail` — view/edit project; manage geo entries, structures, features, team tags, time entries, and tasks
  - `Reports` — stats dashboard with bar charts (by status, category, country, start year) and overdue tasks
  - `TeamMembers` — list team members, add new, CV upload flow
  - `TeamMemberDetail` — view/edit member, tagged projects, project history, CV upload/parsing
  - `Requirements` — manage requirement books and requirements, find matching members (local + AI)
  - `TaskDetail` — view/edit task, assign team members, add comments
  - `CompanyTeams` — manage internal organisational teams and their member rosters
  - `AdminPanel` — reseed database (dev/admin tool)
  - `TimeReport` — aggregate time tracking report (by project, by member, underreporting)
- `components/Layout.tsx` — top nav, breadcrumb, language toggle (EN/PT)
- `components/UserSwitcher.tsx` — dev-only role switcher (rendered only when `import.meta.env.DEV`)
- `components/shared/` — `GeoSection`, `StructureSection`, `Field` — shared form UI components
- `i18n/` — React context-based language toggle; EN/PT keys; default language is Portuguese
- `api/` — custom React Query hooks per domain (projects, team, tasks, geo, structures, features, requirements, companyTeams, system, timeEntries)
- `constants/` — pure lookup objects: `projects.ts`, `geo.ts`, `structures.ts`, `tasks.ts`
- `types/` — `pages.ts` (Page union + routing), `suggestions.ts` (Suggestion type)
- `utils/` — `format.ts` (fmt, fmtDate, fmtDim, initials), `download.ts` (downloadCv)
- `auth/index.ts` — auth abstraction: `getCurrentUser`, `setCurrentUser`, `signOut`, `useCurrentUser`
- Plain CSS dark navy theme (no UI library) in `index.css`
- `vite.config.ts` proxies `/api` and `/trpc` to backend in dev; has path alias `@backend` → `../backend/src`; `base: '/coba/'` for production

### Type Safety

tRPC provides end-to-end type safety. The frontend imports the `AppRouter` type from the backend via the `@backend` path alias, so router changes are immediately reflected in the frontend at compile time.

## Documentation

All detailed file-level docs live in `docs/`. See `docs/README.md` for the full navigation index.
