# COBA Internal Portal

A bilingual (PT/EN) project management web app for civil engineering and geotechnical work. Tracks projects, geological investigation data, built structures, and team members — including their full project history imported directly from CVs via AI.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Database](#database)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Features](#features)
7. [CV Import via AI](#cv-import-via-ai)
8. [Internationalisation](#internationalisation)
9. [Seed Data](#seed-data)

---

## Getting Started

**Requirements:** Node ≥ 25 (see `.nvmrc`)

```bash
# Install all dependencies (root + backend + frontend)
npm install
npm --prefix backend install
npm --prefix frontend install

# Configure the Anthropic API key (required for CV import)
# Edit backend/.env and replace the placeholder:
echo "ANTHROPIC_API_KEY=sk-ant-..." > backend/.env

# Start both servers concurrently
npm run dev
```

| Server   | URL                       |
|----------|---------------------------|
| Backend  | http://localhost:3000     |
| Frontend | http://localhost:5173     |
| Health   | http://localhost:3000/api/health |

Other commands:

```bash
npm run dev:backend       # Backend only (tsx watch)
npm run dev:frontend      # Frontend only (Vite)
npm run build             # tsc (backend) + tsc + Vite (frontend)
npm --prefix frontend run lint
```

> **Note:** The database is in-memory SQLite — all data resets on every backend restart. The seed data is re-inserted automatically at startup.

---

## Architecture Overview

```
coba/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Entry point — loads env, runs seeds, starts Hono
│   │   ├── index.ts           # Hono app: CORS, logger, tRPC mount, health route
│   │   ├── trpc.ts            # tRPC initialisation (router + publicProcedure)
│   │   ├── db.ts              # SQLite schema DDL + exported prepared statements
│   │   ├── router/
│   │   │   ├── index.ts       # Combines sub-routers → AppRouter
│   │   │   ├── projects.ts    # list, byId, create, update, stats
│   │   │   ├── geo.ts         # byProject, create, delete
│   │   │   ├── structures.ts  # byProject, create, delete
│   │   │   └── team.ts        # list, byId, create, update, byProject,
│   │   │                      # tagProject, untagProject, addHistory,
│   │   │                      # updateHistory, deleteHistory,
│   │   │                      # createWithHistory, parseCv
│   │   └── seed/
│   │       ├── projects.ts    # 5 real COBA projects with geo + structures
│   │       └── team.ts        # 4 team members with history, geo + structures
│   └── .env                   # ANTHROPIC_API_KEY (git-ignored)
│
├── frontend/
│   └── src/
│       ├── App.tsx            # Page union type + client-side router
│       ├── trpc.ts            # tRPC + React Query client setup
│       ├── components/
│       │   └── Layout.tsx     # Top nav, breadcrumb, language toggle
│       ├── i18n/
│       │   ├── context.tsx    # LanguageProvider + useTranslation hook
│       │   ├── en.ts          # ~230 English translation keys (source of truth)
│       │   └── pt.ts          # Portuguese translations (mirrors en.ts)
│       └── views/
│           ├── SearchProjects.tsx
│           ├── AddProject.tsx        # Also exports shared GeoSection, StructureSection, Field
│           ├── ProjectDetail.tsx
│           ├── Reports.tsx
│           ├── TeamMembers.tsx       # Includes CV upload flow
│           └── TeamMemberDetail.tsx
│
└── package.json               # Monorepo: concurrently dev:backend + dev:frontend
```

**Type safety end-to-end:** The frontend imports the `AppRouter` type from `../../backend/src/router/index` via a Vite path alias (`@backend`). Any change to a backend procedure is immediately reflected as a TypeScript error in the frontend.

---

## Database

better-sqlite3 in-memory database (`:memory:`). Foreign keys and WAL mode are enabled. All data is reset on every backend restart and re-seeded from `seed/`.

### Schema

#### `projects`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `ref_code` | TEXT UNIQUE | e.g. `PT-1995-012` |
| `name` | TEXT | |
| `client` | TEXT | |
| `macro_region` | TEXT | e.g. `EMEA`, `Sub-Saharan Africa` |
| `country` | TEXT | |
| `place` | TEXT | City or region |
| `category` | TEXT | `water` · `transport` · `energy` · `environment` · `planning` · `other` |
| `status` | TEXT | `planning` · `active` · `completed` · `suspended` · `cancelled` |
| `start_date` / `end_date` | TEXT | ISO 8601 |
| `budget` | REAL | In the currency below |
| `currency` | TEXT | Default `EUR` |
| `project_manager` | TEXT | |
| `team_size` | INTEGER | |
| `description` | TEXT | |
| `tags` | TEXT | Comma-separated |

#### `geo_entries`
Geological investigation records linked to a project.

| Column | Type | Notes |
|--------|------|-------|
| `project_id` | INTEGER FK → projects | CASCADE delete |
| `point_label` | TEXT | e.g. `BH-01`, `TP-02` |
| `type` | TEXT | `borehole` · `trial_pit` · `core_sample` · `field_survey` |
| `depth` | REAL | Metres |
| `soil_type` / `rock_type` | TEXT | |
| `groundwater_depth` | REAL | Metres |
| `bearing_capacity` | REAL | kPa |
| `spt_n_value` | INTEGER | |
| `seismic_class` | TEXT | e.g. `A`–`D` |
| `latitude` / `longitude` | REAL | |
| `sampled_at` | TEXT | ISO 8601 date |
| `notes` | TEXT | |

#### `structures`
Built structures linked to a project.

| Column | Type | Notes |
|--------|------|-------|
| `project_id` | INTEGER FK → projects | CASCADE delete |
| `label` | TEXT | Name / designation |
| `type` | TEXT | `bridge` · `dam` · `tunnel` · `retaining_wall` · `embankment` · `building` · `pipeline` · `reservoir` · `culvert` · `road` · `other` |
| `material` | TEXT | e.g. `betão pré-esforçado / aço` |
| `length_m` / `height_m` / `span_m` | REAL | Metres |
| `foundation_type` | TEXT | |
| `design_load` | REAL | kN/m² |
| `latitude` / `longitude` | REAL | |
| `built_at` | TEXT | ISO 8601 date |
| `notes` | TEXT | |

#### `team_members`
| Column | Type |
|--------|------|
| `name` | TEXT |
| `title` | TEXT |
| `email` / `phone` | TEXT |
| `bio` | TEXT |

#### `project_team`
Many-to-many join between projects and team members.

| Column | Type |
|--------|------|
| `project_id` | FK → projects |
| `team_member_id` | FK → team_members |
| `role_on_project` | TEXT |

Unique constraint on `(project_id, team_member_id)`.

#### `member_history`
A team member's historical project experience (may or may not link to an app project).

| Column | Type | Notes |
|--------|------|-------|
| `team_member_id` | FK → team_members | |
| `project_id` | FK → projects (nullable) | `NULL` for external projects |
| `project_name` | TEXT | Free-text name |
| `macro_region` / `country` / `place` | TEXT | |
| `category` | TEXT | Same enum as projects |
| `notes` | TEXT | Role and activities |

#### `member_history_geo` / `member_history_structures`
Mirror the schema of `geo_entries` and `structures` respectively, but linked to `member_history` via `history_id` instead of `project_id`. Used to record the geotechnical and structural work associated with each history entry.

---

## Backend

### server.ts — entry point

1. Loads `backend/.env` via `dotenv/config`
2. Runs `seedProjects()` then `seedTeam()` (synchronous SQLite transactions)
3. Starts the Hono HTTP server on port 3000 (or `$PORT`)

### Routers

All procedures use **Zod** for input validation. DB columns are `snake_case`; API responses are `camelCase` (converted by mapper functions in each router file).

#### `projects`
| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | query | Search + filter projects. Optional `search`, `status`, `category`, `country` inputs. Joins `geo_entries` so free-text search spans geological notes. |
| `byId` | query | Single project by `id`. |
| `create` | mutation | Create new project. |
| `update` | mutation | Partial update of all project fields. |
| `stats` | query | Aggregated stats for the Reports view: counts by status, category, country, and year; total EUR budget. |

#### `geo`
| Procedure | Type | Description |
|-----------|------|-------------|
| `byProject` | query | All geo entries for a project, ordered by label. |
| `create` | mutation | Add a geo entry to a project. |
| `delete` | mutation | Delete a geo entry by `id`. |

#### `structures`
| Procedure | Type | Description |
|-----------|------|-------------|
| `byProject` | query | All structures for a project. |
| `create` | mutation | Add a structure to a project. |
| `delete` | mutation | Delete a structure by `id`. |

Also exports `STRUCTURE_TYPES` (the 11-item tuple) and `mapStructure()` for reuse in `team.ts`.

#### `team`
| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | query | All members with `projectCount`. |
| `byId` | query | Member + tagged projects + full history (with nested geo and structures per history entry). |
| `create` | mutation | Create team member. |
| `update` | mutation | Update member fields. |
| `byProject` | query | Members tagged to a given project. |
| `tagProject` | mutation | Link member to project with a role. |
| `untagProject` | mutation | Remove member–project link. |
| `addHistory` | mutation | Create history entry + geo + structures atomically. |
| `updateHistory` | mutation | Replace history entry's geo and structures (delete-all + recreate). |
| `deleteHistory` | mutation | Delete history entry (cascades to geo + structures). |
| `createWithHistory` | mutation | **Atomic transaction**: create member + N history entries each with geo/structures. Used by CV import. |
| `parseCv` | mutation | Send PDF to Claude API; parse and validate response; return structured member data. See [CV Import](#cv-import-via-ai). |

---

## Frontend

### Routing

Client-side only — no URL changes. `App.tsx` holds a `page` state of union type:

```typescript
type Page =
  | { view: 'search' }
  | { view: 'add' }
  | { view: 'detail'; id: number }
  | { view: 'reports' }
  | { view: 'team' }
  | { view: 'member'; id: number; name: string }
```

`Layout.tsx` renders the top nav and breadcrumb. Each view receives an `onNavigate` callback.

### Views

#### SearchProjects
Project listing with three filter controls (free-text, status dropdown, category dropdown, country input) and a results table. Clicking a row navigates to `ProjectDetail`.

#### AddProject
Multi-section form: project fields → dynamic geological entries section → dynamic structures section. On submit, creates the project then issues individual `geo.create` and `structures.create` calls for each entry.

This file also **exports** the shared form components used in `ProjectDetail` and `TeamMemberDetail`:
- `GeoSection` — renders the geo entries sub-form
- `StructureSection` — renders the structures sub-form
- `Field` — labelled field wrapper with error display
- `GeoFormEntry` / `StructureFormEntry` types
- `emptyGeo()` / `emptyStructure()` factory functions
- `STRUCT_TYPE_KEY` / `STRUCTURE_TYPES` constants

#### ProjectDetail
Two modes toggled by the Edit button in the project hero:

**View mode:** reads from `projects.byId`, `geo.byProject`, `structures.byProject`, and `team.byProject`. Shows metadata cards, description, tagged team members, structures table, and geo entries table.

**Edit mode:** inline form pre-populated with current data. Saving calls `projects.update`, then deletes all original geo/structure IDs and re-creates from form state.

#### Reports
Statistics dashboard fed by `projects.stats`. Displays four KPI cards and four breakdown tables (by status, category, top countries, by start year), each with a CSS bar chart.

#### TeamMembers
Team roster and member creation. Two add modes:

- **Manual:** simple form for name, title, email, phone, bio.
- **CV import:** see [CV Import via AI](#cv-import-via-ai).

#### TeamMemberDetail
Full member profile with:
- **Edit member** — inline form to update personal fields.
- **Tagged projects** — list of app projects the member is assigned to, with role. Tag/untag controls.
- **Project history** — expandable list of past projects. Each entry shows location, category, notes, and nested geo/structure sub-grids. Add, edit, and delete controls.

---

## Features

### Project Management
- Create, search, and edit projects with rich metadata (client, region, category, status, budget, team size, tags, description)
- Attach geological investigation records (boreholes, trial pits, core samples, field surveys) with full geotechnical data
- Attach built structures (bridges, dams, pipelines, etc.) with dimensions, materials, and foundation details
- Project-level stats and bar charts in the Reports view

### Team Management
- Team member directory with project counts
- Assign members to projects with a named role
- Record full career history with per-project geo and structural detail
- Import member profiles from PDF CVs using Claude AI

---

## CV Import via AI

The CV import feature lets you create a fully populated team member — including project history — by uploading a PDF CV.

### How it works

```
User selects PDF
      │
      ▼
FileReader → base64
      │
      ▼
trpc.team.parseCv ──────────────► Claude API (claude-opus-4-5)
      │                                   │
      │    ◄──────────────── Structured JSON response
      ▼
Zod validation + coercion
      │
      ▼
CV Preview UI (editable)
      │
      ▼
trpc.team.createWithHistory  ──► SQLite transaction
                                  ├── INSERT team_members
                                  └── for each history entry:
                                       ├── INSERT member_history
                                       ├── INSERT member_history_geo (×N)
                                       └── INSERT member_history_structures (×N)
```

### What Claude extracts

From the PDF the model extracts:

| Field | Notes |
|-------|-------|
| `name` | Full name |
| `title` | Primary professional role |
| `email` / `phone` | If present in the CV |
| `bio` | 3–5 sentence professional summary, written in Portuguese |
| `history[].projectName` | Name of each project |
| `history[].macroRegion` | Inferred: `EMEA`, `Sub-Saharan Africa`, `Asia`, `Americas`, `Other` |
| `history[].country` / `place` | |
| `history[].category` | Inferred: `water`, `transport`, `energy`, `environment`, `planning`, `other` |
| `history[].notes` | Member's role and activities on that project, in Portuguese |
| `history[].structures[]` | Structures mentioned in the CV with type, material, and dimensions where available |

Geo entries are not extracted from CVs (that level of detail is never present in a CV) and default to empty arrays. They can be added manually from the member detail page afterwards.

### Review and edit

After parsing, the UI shows a **CV Preview** form:
- All personal fields are editable before saving
- Each history entry is shown as a card — edit any field or click **✕** to remove the entry
- Extracted structures are shown as chips inside the entry — remove individual structures with **✕**
- Submitting saves everything in one atomic database transaction

### Configuration

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
```

The key is loaded at startup via `dotenv`. If it is missing or still set to the placeholder value, `parseCv` returns a clear error message rather than crashing.

---

## Internationalisation

The app is fully bilingual. Language defaults to **Portuguese** and can be toggled to **English** via the button in the top-right corner of the nav.

### Implementation

```
i18n/en.ts          ← ~230 keys, const as const (source of truth)
i18n/pt.ts          ← Record<TranslationKey, string>
i18n/context.tsx    ← LanguageProvider + useTranslation()
```

`TranslationKey` is inferred from `typeof en` — if a key exists in `en.ts` but is missing from `pt.ts`, TypeScript reports an error at compile time.

Usage in any component:

```tsx
const { t, lang, setLang } = useTranslation()
// t('btnSubmit') → 'Criar Projeto' (PT) or 'Create Project' (EN)
```

---

## Seed Data

Five real COBA projects are seeded at startup, spanning Portugal, Angola, Tanzania, and Mozambique:

| Ref | Project | Category | Status |
|-----|---------|----------|--------|
| PT-1995-012 | Ponte Vasco da Gama | Transport | Completed |
| AO-2014-033 | Sistema de Abastecimento de Água de Luanda Norte | Water | Completed |
| TZ-2018-007 | Expansão do Aeroporto Internacional Julius Nyerere | Transport | Active |
| PT-2009-055 | Aproveitamento Hidroelétrico do Baixo Tâmega | Energy | Completed |
| MZ-2021-018 | Reabilitação da EN1 — Maputo a Beira | Transport | Active |

Each project has 2–3 geological investigation records and 2–3 structures.

Four team members are seeded, each with:
- Assignments to one or more of the above projects
- Two historical project entries with nested geo and structure records

All narrative text in the seed data (descriptions, notes, soil/rock types, materials, foundation types) is in **Portuguese**.

Seed files live in `backend/src/seed/` and are imported by `server.ts` which calls `seedProjects()` then `seedTeam()` as synchronous SQLite transactions before the HTTP server starts.
