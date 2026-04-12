# COBA Internal Portal

[![CI](https://github.com/alexbtwbtw/code/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alexbtwbtw/code/actions/workflows/ci.yml)
[![Backend](https://github.com/alexbtwbtw/code/actions/workflows/ci.yml/badge.svg?branch=main&job=backend)](https://github.com/alexbtwbtw/code/actions/workflows/ci.yml)
[![Frontend](https://github.com/alexbtwbtw/code/actions/workflows/ci.yml/badge.svg?branch=main&job=frontend)](https://github.com/alexbtwbtw/code/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%E2%89%A525-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-184%20passing-brightgreen)](https://github.com/alexbtwbtw/code/actions/workflows/ci.yml)

A bilingual (PT/EN) project management web app for civil engineering and geotechnical work. Tracks projects, geological investigation data, built structures, team members, staffing requirements, and tasks — with AI-powered CV parsing and requirements extraction.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Features](#features)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [AI Features](#ai-features)
7. [Electron Desktop App](#electron-desktop-app)
8. [Internationalisation](#internationalisation)
9. [Seed Data](#seed-data)

---

## Getting Started

**Requirements:** Node ≥ 25 (see `.nvmrc`)

```bash
# Install all dependencies
make install
# or manually:
npm install && npm --prefix backend install && npm --prefix frontend install

# Configure the Anthropic API key
make env
# then edit backend/.env and set ANTHROPIC_API_KEY

# Start both dev servers
make dev
```

| Server   | URL                              |
|----------|----------------------------------|
| Backend  | http://localhost:3000            |
| Frontend | http://localhost:5173            |
| Health   | http://localhost:3000/api/health |

### All commands

```bash
make dev              # Backend + frontend dev servers
make build            # Production build (backend tsc + Vite)
make lint             # Lint frontend
make typecheck        # Type-check backend + frontend
make clean            # Remove all build artefacts
make electron-build   # Build Electron desktop app → dist-electron/
make electron-dev     # Dev mode with Electron window
make help             # Full command reference
```

> **Note:** The database is in-memory SQLite — data resets on every backend restart and is re-seeded automatically at startup.

---

## Architecture Overview

```
coba/
├── backend/
│   └── src/
│       ├── server.ts          # Entry point — env, seeds, starts Hono on :3000
│       ├── index.ts           # Hono app: CORS, logger, tRPC, health, static serving
│       ├── trpc.ts            # tRPC init
│       ├── db/                # SQLite schema DDL + prepared statements
│       ├── router/
│       │   ├── projects.ts    # list, byId, create, update, stats, riskSummary
│       │   ├── geo.ts         # byProject, create, delete
│       │   ├── structures.ts  # byProject, create, delete
│       │   ├── features.ts    # byProject, create, delete
│       │   ├── team.ts        # list, byId, create, update, byProject, tag/untag,
│       │   │                  # addHistory, updateHistory, deleteHistory,
│       │   │                  # createWithHistory, parseCv, getCvData, generateCv
│       │   ├── requirements.ts# books CRUD, requirements CRUD, assignments,
│       │   │                  # suggestMembers, parseFromPdf
│       │   └── tasks.ts       # byProject, create, update, delete, getTask,
│       │                      # addAssignment, removeAssignment, addComment
│       ├── lib/
│       │   ├── parseCv.ts          # Claude API: PDF CV → structured member data
│       │   ├── parseProject.ts     # Claude API: parse project detail from CV text
│       │   ├── generateCv.ts       # pdfkit: generate PDF CV from member data
│       │   ├── parseRequirements.ts# Claude API: PDF/DOCX → requirement book
│       │   └── suggestMembersAi.ts # Claude API: match members to requirements
│       └── seed/
│           ├── projects.ts    # 34 real COBA projects with geo + structures
│           ├── team.ts        # 4 team members with history + generated CVs
│           ├── requirements.ts# Sample requirement books
│           └── tasks.ts       # 89 tasks across projects
│
├── frontend/
│   └── src/
│       ├── App.tsx            # Page union type + History API router
│       ├── views/
│       │   ├── SearchProjects.tsx    # Project list, search, filter
│       │   ├── AddProject.tsx        # Create project with geo + structures
│       │   ├── ProjectDetail.tsx     # View/edit project, team, tasks
│       │   ├── Reports.tsx           # Stats dashboard + priority/risk reports
│       │   ├── TeamMembers.tsx       # Roster + CV import flow
│       │   ├── TeamMemberDetail.tsx  # Profile, history, CV upload/download
│       │   ├── Requirements.tsx      # Requirement books, staffing requirements,
│       │   │                         # member assignments, PDF/Word import
│       │   └── TaskDetail.tsx        # Task view, assignments, comments
│       ├── i18n/              # EN/PT translation context (~330 keys)
│       └── components/
│           └── Layout.tsx     # Top nav, breadcrumb, language toggle
│
├── electron/
│   └── main.ts               # Electron main process
├── scripts/
│   └── assemble-electron.mjs # Manual app assembler (avoids electron-builder issues)
├── Makefile
└── package.json              # Monorepo root
```

**End-to-end type safety:** The frontend imports the `AppRouter` type from the backend via a Vite `@backend` path alias — router changes are immediately reflected as TypeScript errors in the frontend.

---

## Features

### Project Management
- Create, search, and edit projects with full metadata (client, region, category, status, budget, team, tags, priority)
- Attach geological investigation records (boreholes, trial pits, core samples, field surveys)
- Attach built structures (bridges, dams, tunnels, pipelines, etc.) with dimensions and materials
- Geo features labelled per project

### Task Management
- Tasks per project with status (`todo` → `in_progress` → `review` → `blocked` → `done`) and priority (7 levels: `critical` → `minimal`)
- Assign team members to tasks
- Comments thread on each task
- Priority report in the dashboard with expandable task lists per project

### Team Management
- Team member directory with project counts and tagged projects
- Full career history with per-project geo and structural detail
- Upload, parse, and download PDF CVs
- Generate standardised CVs from member data

### Requirements / Staffing
- Requirement books linked optionally to a project
- Per-requirement: discipline, level, years experience, certifications, notes
- Assign team members to requirements with a rationale
- Compliance notes (how the team meets a requirement)
- Source evidence (literal excerpts from the source document)
- Find matching members via local scoring or Claude AI
- **Import requirement books from PDF or Word documents** using Claude AI

### Reports & Dashboard
- KPI cards: total projects, active, budget, team size
- Breakdown charts by status, category, country, and start year
- Overdue and blocked task lists
- Priority report: tasks grouped by project, expandable, with state summaries
- Risk summary

---

## Backend

### Database

`better-sqlite3` in-memory SQLite with WAL mode and foreign keys. Resets on every restart.

**Tables:** `projects`, `geo_entries`, `structures`, `project_features`, `team_members`, `member_cvs`, `project_team`, `member_history`, `member_history_geo`, `member_history_structures`, `member_history_features`, `requirement_books`, `requirements`, `requirement_assignments`, `tasks`, `task_assignments`, `task_comments`

### Routers

All procedures use Zod v4 for input validation. DB columns are `snake_case`; API responses are `camelCase`.

#### `projects`
`list` · `byId` · `create` · `update` · `stats` · `riskSummary`

#### `team`
`list` · `byId` · `create` · `update` · `byProject` · `tagProject` · `untagProject` · `addHistory` · `updateHistory` · `deleteHistory` · `createWithHistory` · `parseCv` · `getCvData` · `generateCv`

#### `requirements`
`listBooks` · `bookById` · `createBook` · `updateBook` · `deleteBook` · `createRequirement` · `updateRequirement` · `deleteRequirement` · `addAssignment` · `removeAssignment` · `suggestMembers` · `parseFromPdf`

#### `tasks`
`byProject` · `getTask` · `create` · `update` · `delete` · `addAssignment` · `removeAssignment` · `addComment` · `deleteComment`

#### `geo` / `structures` / `features`
`byProject` · `create` · `delete`

---

## Frontend

### Routing

Client-side routing via the History API. `App.tsx` holds a `page` state as a discriminated union:

```typescript
type Page =
  | { view: 'search' }
  | { view: 'add' }
  | { view: 'project'; id: number; name: string }
  | { view: 'reports' }
  | { view: 'team' }
  | { view: 'member'; id: number; name: string }
  | { view: 'requirements' }
  | { view: 'requirement-book'; id: number; title: string }
  | { view: 'task'; id: number; title: string }
```

---

## AI Features

All AI features use `claude-sonnet-4-6` via `@anthropic-ai/sdk`. The key is loaded from `backend/.env`.

### CV Import

Upload a PDF CV → Claude extracts name, title, contact info, bio, and full project history (including structures) → editable preview → one atomic DB transaction creates the member and all history.

### CV Generation

Generate a standardised PDF CV from a member's app data using `pdfkit`.

### Requirements Import (PDF / Word)

Upload a PDF or `.docx` requirements document → Claude extracts a full requirement book (title, category, description, all staffing requirements with discipline, level, experience, certifications, and **literal source excerpts** for audit trail) → review and deselect before creating.

Word documents are converted to plain text via `mammoth` before being sent to Claude.

### Member Matching

For any requirement, find the best-matching team members either by local scoring (history, tags, discipline match) or by sending member profiles to Claude for AI-ranked results with rationale.

### Configuration

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Electron Desktop App

COBA can be run as a self-contained desktop app. The Electron main process starts the Hono backend (which serves both the API and the built frontend), then opens a window at `http://localhost:3000`.

```bash
# Full build + assemble
make electron-build

# Launch app
dist-electron\win-unpacked\COBA.exe
```

Dev mode (requires dev servers already running):

```bash
make electron-dev
```

The build uses a custom assembler script (`scripts/assemble-electron.mjs`) that copies the Electron runtime from `node_modules`, drops in the compiled backend and built frontend, and excludes dev-only packages — no code signing required.

---

## Internationalisation

Defaults to **Portuguese**. Toggle to **English** via the button in the top-right nav.

```
i18n/en.ts      ← ~330 keys, const as const (source of truth)
i18n/pt.ts      ← Record<TranslationKey, string>
i18n/context.tsx← LanguageProvider + useTranslation()
```

`TranslationKey` is inferred from `typeof en` — keys missing from `pt.ts` are caught at compile time.

---

## Seed Data

34 real COBA projects are seeded at startup, covering Portugal, Angola, Mozambique, Tanzania, Nigeria, Ethiopia, and other regions — spanning water, transport, energy, environment, and planning sectors.

4 team members are seeded with full project histories and generated PDF CVs.

89 tasks are distributed across projects with realistic statuses and priorities.

Sample requirement books and task assignments are also seeded.

All narrative text (descriptions, notes, bios) is in **Portuguese**.
