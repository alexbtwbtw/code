# COBA Documentation

File-level documentation for all main source files in the COBA project, plus architecture notes and agent records.

## AWS Deployment

- [Overview](aws/overview.md) — architecture, costs, EC2 vs Fargate comparison
- [Database](aws/database.md) — SQLite on EBS
- [Storage](aws/storage.md) — S3 for CV files and frontend
- [Compute & Networking](aws/compute.md) — EC2, CloudFront, networking, secrets
- [Terraform](aws/terraform.md) — full HCL for all modules
- [Deploy Pipeline](aws/pipeline.md) — GitHub Actions workflow
- [Codebase Changes](aws/codebase-changes.md) — what to change in the app
- [Rollout Order](aws/rollout.md) — step-by-step deployment sequence
- [Deployment Guide](aws/DEPLOYMENT_GUIDE.md) — step-by-step walkthrough from scratch
- [Decommission Guide](aws/decommission.md) — teardown order and resource cleanup

## Architecture & Planning

- [Testing strategy](testing.md) — Vitest unit tests + Playwright E2E, tooling, coverage targets, CI integration
- [Agents](Agents.md) — specialist agents used in this project and their responsibilities
- [Security Tools](security-tools.md) — npm audit, SAST, dependency scanning for CI
- [Security Audit](security-audit.md) — full OWASP audit findings and remediation queue

## Backend Source Docs

### Core Infrastructure

| File(s) | Doc |
|---------|-----|
| `backend/src/server.ts` + `backend/src/index.ts` | [server-and-index.md](backend/server-and-index.md) |
| `backend/src/db/` (client, schema, statements, index) | [db.md](backend/db.md) |
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
| `router/admin.ts` + `router/system.ts` + `router/companyTeams.ts` + `router/timeEntries.ts` | [router-new.md](backend/router-new.md) |

### AI / PDF Libraries (`backend/src/lib/`)

| File | Doc |
|------|-----|
| `lib/parseCv.ts` | [lib-parseCv.md](backend/lib-parseCv.md) |
| `lib/generateCv.ts` | [lib-generateCv.md](backend/lib-generateCv.md) |
| `lib/suggestMembersAi.ts` | [lib-suggestMembersAi.md](backend/lib-suggestMembersAi.md) |
| `lib/parseRequirements.ts` | [lib-parseRequirements.md](backend/lib-parseRequirements.md) |
| `lib/parseProject.ts` | Inline in router-projects.md (no separate doc) |
| `lib/s3.ts` | [lib-s3.md](backend/lib-s3.md) |

## Frontend Source Docs

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
| `views/CompanyTeams.tsx` + `views/AdminPanel.tsx` + `views/TimeReport.tsx` | [new-views.md](frontend/new-views.md) |

### Extracted Modules

After the Phase 2 architecture refactor, the following directories were extracted from views:

| Directory | Contents |
|-----------|----------|
| `frontend/src/api/` | Custom React Query hooks per domain (`projects`, `team`, `tasks`, `geo`, `structures`, `features`, `requirements`, `companyTeams`, `system`, `timeEntries`) |
| `frontend/src/constants/` | Pure lookup objects: `projects.ts`, `geo.ts`, `structures.ts`, `tasks.ts` |
| `frontend/src/types/` | `pages.ts` (Page union type + routing helpers), `suggestions.ts` (Suggestion type) |
| `frontend/src/utils/` | `format.ts` (fmt, fmtDate, fmtDim, initials), `download.ts` (downloadCv) |
| `frontend/src/components/shared/` | `GeoSection.tsx`, `StructureSection.tsx`, `Field.tsx` — shared UI form components |

These are documented inline in [testing.md](testing.md) (Appendix: Key File Paths Reference).

## Archived Plans

These documents describe work that has been completed (or is partially complete). Kept for historical context.

- [auth-plan.md](archive/auth-plan.md) — auth abstraction layer, UserSwitcher, role-based home pages *(implemented)*
- [project-layout-plan.md](archive/project-layout-plan.md) — backend/frontend layering refactor (db/, schemas/, types/, services/, api/, constants/, utils/) *(implemented)*
- [team-member-rework-plan.md](archive/team-member-rework-plan.md) — `is_user` column, `promoteToUser`, CV diff/accept flow *(partially implemented — auth layer done; is_user + CV diff pending)*
