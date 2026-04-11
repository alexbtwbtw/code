# COBA Codebase Documentation Index

This directory contains file-level documentation for the COBA project management application.

## Backend (`docs/backend/`)

### Entry Points and Infrastructure

| File | Doc |
|------|-----|
| `backend/src/server.ts` + `backend/src/index.ts` | [server-and-index.md](backend/server-and-index.md) |
| `backend/src/db.ts` | [db.md](backend/db.md) |
| `backend/src/trpc.ts` | [trpc.md](backend/trpc.md) |

### Routers (`backend/src/router/`)

| File | Doc |
|------|-----|
| `router/projects.ts` | [router-projects.md](backend/router-projects.md) |
| `router/team.ts` | [router-team.md](backend/router-team.md) |
| `router/tasks.ts` | [router-tasks.md](backend/router-tasks.md) |
| `router/geo.ts` | [router-geo.md](backend/router-geo.md) |
| `router/structures.ts` | [router-structures.md](backend/router-structures.md) |
| `router/features.ts` | [router-features.md](backend/router-features.md) |
| `router/requirements.ts` | [router-requirements.md](backend/router-requirements.md) |

### Libraries (`backend/src/lib/`)

| File | Doc |
|------|-----|
| `lib/parseCv.ts` | [lib-parseCv.md](backend/lib-parseCv.md) |
| `lib/generateCv.ts` | [lib-generateCv.md](backend/lib-generateCv.md) |
| `lib/suggestMembersAi.ts` | [lib-suggestMembersAi.md](backend/lib-suggestMembersAi.md) |

## Frontend (`docs/frontend/`)

### Core

| File | Doc |
|------|-----|
| `frontend/src/App.tsx` | [App.md](frontend/App.md) |
| `frontend/src/auth/index.ts` | [auth.md](frontend/auth.md) |
| `frontend/src/components/Layout.tsx` | [Layout.md](frontend/Layout.md) |
| `frontend/src/i18n/context.tsx` | [i18n-context.md](frontend/i18n-context.md) |

### Views (`frontend/src/views/`)

| File | Doc |
|------|-----|
| `views/Home.tsx` | [Home.md](frontend/Home.md) |
| `views/SearchProjects.tsx` | [SearchProjects.md](frontend/SearchProjects.md) |
| `views/ProjectDetail.tsx` | [ProjectDetail.md](frontend/ProjectDetail.md) |
| `views/TeamMembers.tsx` | [TeamMembers.md](frontend/TeamMembers.md) |
| `views/TeamMemberDetail.tsx` | [TeamMemberDetail.md](frontend/TeamMemberDetail.md) |
| `views/Reports.tsx` | [StatsView.md](frontend/StatsView.md) |
| `views/Requirements.tsx` | [Requirements.md](frontend/Requirements.md) |
| `views/TaskDetail.tsx` | [TaskDetail.md](frontend/TaskDetail.md) |

## Architecture Overview

COBA is a monorepo with a Hono + tRPC backend and a React 19 + Vite frontend. The backend uses an in-memory SQLite database (data resets on restart). End-to-end type safety flows from the backend `AppRouter` type through the `@backend` Vite path alias into the frontend's tRPC client.

Key design patterns:
- **Routing:** Client-side state machine in `App.tsx` (no router library); URL sync via History API
- **Auth:** Abstraction layer in `auth/index.ts` backed by localStorage; three swap points for AWS Cognito
- **AI integration:** Three Claude API call sites — CV parsing (`parseCv.ts`), project member suggestions (`suggestMembersAi.ts`), and requirement matching (inline in `router/requirements.ts`)
- **i18n:** React context with 313 EN/PT keys; default language is Portuguese
- **Data layer:** All snake_case → camelCase mapping happens in each router via local `mapX` functions
