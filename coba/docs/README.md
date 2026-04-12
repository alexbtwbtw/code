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

## Architecture & Planning

- [Testing strategy](testing.md) — Vitest unit tests (184 tests) + Playwright E2E (27 tests), tooling, coverage targets, CI integration
- [Agents](Agents.md) — specialist agents used in this project and their responsibilities

## Backend Source Docs

| File | Doc |
|------|-----|
| `backend/src/server.ts` + `backend/src/index.ts` | [server-and-index.md](backend/server-and-index.md) |
| `backend/src/db.ts` (legacy barrel) / `db/` | [db.md](backend/db.md) |
| `backend/src/trpc.ts` | [trpc.md](backend/trpc.md) |
| `router/projects.ts` | [router-projects.md](backend/router-projects.md) |
| `router/team.ts` | [router-team.md](backend/router-team.md) |
| `router/tasks.ts` | [router-tasks.md](backend/router-tasks.md) |
| `router/geo.ts` | [router-geo.md](backend/router-geo.md) |
| `router/structures.ts` | [router-structures.md](backend/router-structures.md) |
| `router/features.ts` | [router-features.md](backend/router-features.md) |
| `router/requirements.ts` | [router-requirements.md](backend/router-requirements.md) |
| `lib/parseCv.ts` | [lib-parseCv.md](backend/lib-parseCv.md) |
| `lib/generateCv.ts` | [lib-generateCv.md](backend/lib-generateCv.md) |
| `lib/suggestMembersAi.ts` | [lib-suggestMembersAi.md](backend/lib-suggestMembersAi.md) |

## Frontend Source Docs

| File | Doc |
|------|-----|
| `frontend/src/App.tsx` | [App.md](frontend/App.md) |
| `frontend/src/auth/index.ts` | [auth.md](frontend/auth.md) |
| `frontend/src/components/Layout.tsx` | [Layout.md](frontend/Layout.md) |
| `frontend/src/i18n/context.tsx` | [i18n-context.md](frontend/i18n-context.md) |
| `views/Home.tsx` | [Home.md](frontend/Home.md) |
| `views/SearchProjects.tsx` | [SearchProjects.md](frontend/SearchProjects.md) |
| `views/ProjectDetail.tsx` | [ProjectDetail.md](frontend/ProjectDetail.md) |
| `views/TeamMembers.tsx` | [TeamMembers.md](frontend/TeamMembers.md) |
| `views/TeamMemberDetail.tsx` | [TeamMemberDetail.md](frontend/TeamMemberDetail.md) |
| `views/Reports.tsx` | [StatsView.md](frontend/StatsView.md) |
| `views/Requirements.tsx` | [Requirements.md](frontend/Requirements.md) |
| `views/TaskDetail.tsx` | [TaskDetail.md](frontend/TaskDetail.md) |

## Archived Plans

These documents describe work that has been completed (or is partially complete). They are kept for historical context.

- [auth-plan.md](archive/auth-plan.md) — auth abstraction layer, UserSwitcher, role-based home pages *(implemented)*
- [project-layout-plan.md](archive/project-layout-plan.md) — backend/frontend layering refactor (db/, schemas/, types/, services/, api/, constants/, utils/) *(implemented)*
- [team-member-rework-plan.md](archive/team-member-rework-plan.md) — `is_user` column, `promoteToUser`, CV diff/accept flow *(partially implemented — auth layer done; is_user + CV diff pending)*
