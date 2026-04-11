# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

COBA is a bilingual (EN/PT) project management app for civil engineering / geotechnical projects. It tracks projects and their associated geological entries, civil structures, team members, requirement books, and tasks. The database is **in-memory SQLite** — data resets on every backend restart.

## Commands

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

Requires Node >= v25 (see `.nvmrc`).

## Architecture

Monorepo with two packages (`backend/`, `frontend/`) and a root `package.json` that orchestrates them via `concurrently`.

### Backend (`backend/src/`)

- **Hono** HTTP server with **tRPC** router mounted at `/trpc/*` and a health endpoint at `/api/health`
- **better-sqlite3** in-memory database (WAL pragma) with 17 tables
- **@anthropic-ai/sdk** — Claude API integration for CV parsing and team member matching
- **pdfkit** — PDF generation for team member CVs
- Entry point: `server.ts` → `index.ts` (Hono app setup)
- `db.ts` — database init and schema DDL
- `trpc.ts` — tRPC initialization

**Database tables:**
- `projects` — core project records (19 cols)
- `geo_entries` — geological entries (boreholes, trial pits, etc.), FK to projects
- `structures` — civil structures (bridges, dams, tunnels, etc.) with geo coords, FK to projects
- `project_features` — labelled geo features per project
- `team_members` — staff profiles (name, title, email, phone, bio)
- `member_cvs` — uploaded CV PDFs (binary), FK to team_members
- `project_team` — M2M join: team members tagged to projects with a role
- `member_history` — a team member's past project work history
- `member_history_geo` / `member_history_structures` / `member_history_features` — geo/structure/feature entries within history records
- `requirement_books` — collections of staffing requirements, optionally linked to a project
- `requirements` — individual requirements (discipline, level, certifications)
- `tasks` — project tasks (status: todo/in_progress/review/blocked/done; priority: low/medium/high)
- `task_assignments` — M2M: team members assigned to tasks
- `task_comments` — comments on tasks

**Routers** (`router/`):
- `projects.ts` — list (search/filter/sort), byId, create, update, stats
- `geo.ts` — byProject, create, delete
- `structures.ts` — byProject, create, delete
- `features.ts` — byProject, create, delete
- `team.ts` — list, byId, create, update, byProject, tagProject, untagProject, addHistory, updateHistory, deleteHistory, createWithHistory, parseCv (AI)
- `requirements.ts` — books CRUD, requirements CRUD, suggestMembers (local + AI matching)
- `tasks.ts` — byProject, create, update, delete, getTask, addAssignment, removeAssignment, addComment, deleteComment

**AI helpers** (`lib/`):
- `parseCv.ts` — extracts structured project history from uploaded PDF CVs via Claude API
- `parseProject.ts` — parses project detail out of CV content
- `generateCv.ts` — generates PDF CVs with pdfkit from member data
- `suggestMembersAi.ts` — matches team members to requirements using Claude API

**Seed data** (`seed/`):
- `projects.ts` — 5 COBA projects with geo entries and structures
- `team.ts` — 4 team members with history and generated PDFs (async, gates server start)
- `requirements.ts` — sample requirement books
- `tasks.ts` — sample tasks and assignments

Zod (v4) schemas validate input (camelCase) and map to snake_case for DB columns. `backend/.env` must contain `ANTHROPIC_API_KEY`.

### Frontend (`frontend/src/`)

- **React 19** + **Vite** + **TanStack React Query** + **tRPC client**
- Client-side routing via state in `App.tsx` (union type `Page`); URL ↔ page sync via `pageToPath()` / `pathToPage()` and the History API
- `views/` — 8 view components:
  - `SearchProjects` — list, search, filter by status/category/country
  - `AddProject` — create project with inline geo entries and structures
  - `ProjectDetail` — view/edit project; manage geo entries, structures, features, team tags, and tasks
  - `Reports` — stats dashboard with bar charts (by status, category, country, start year) and overdue tasks
  - `TeamMembers` — list team members, add new, CSV upload flow
  - `TeamMemberDetail` — view/edit member, tagged projects, project history, CV upload/parsing
  - `Requirements` — manage requirement books and requirements, find matching members (local + AI)
  - `TaskDetail` — view/edit task, assign team members, add comments
- `components/Layout.tsx` — top nav, breadcrumb, language toggle (EN/PT)
- `i18n/` — React context-based language toggle; 313 EN/PT keys; default language is Portuguese
- Plain CSS dark navy theme (no UI library) in `index.css`
- `vite.config.ts` proxies `/api` and `/trpc` to backend in dev; has path alias `@backend` → `../backend/src`

### Type Safety

tRPC provides end-to-end type safety. The frontend imports the `AppRouter` type from the backend via the `@backend` path alias, so router changes are immediately reflected in the frontend at compile time.
