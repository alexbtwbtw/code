# COBA Documentation

File-level documentation for all main source files in the COBA project.

See [index.md](index.md) for the full directory with links to every doc.

## AWS Deployment

- [Overview](aws/overview.md) — architecture, costs, EC2 vs Fargate comparison
- [Database](aws/database.md) — SQLite on EBS
- [Storage](aws/storage.md) — S3 for CV files and frontend
- [Compute & Networking](aws/compute.md) — EC2, CloudFront, networking, secrets
- [Terraform](aws/terraform.md) — full HCL for all modules
- [Deploy Pipeline](aws/pipeline.md) — GitHub Actions workflow
- [Codebase Changes](aws/codebase-changes.md) — what to change in the app
- [Rollout Order](aws/rollout.md) — step-by-step deployment sequence

## Quick Navigation

- [Backend entry points](backend/server-and-index.md) — server.ts + index.ts
- [Database schema](backend/db.md) — all 17 tables and prepared statements
- [tRPC setup](backend/trpc.md) — router and publicProcedure exports
- [Projects router](backend/router-projects.md)
- [Team router](backend/router-team.md)
- [Tasks router](backend/router-tasks.md)
- [Geo entries router](backend/router-geo.md)
- [Structures router](backend/router-structures.md)
- [Features router](backend/router-features.md)
- [Requirements router](backend/router-requirements.md)
- [CV parsing (AI)](backend/lib-parseCv.md)
- [CV PDF generation](backend/lib-generateCv.md)
- [Member suggestion (AI)](backend/lib-suggestMembersAi.md)
- [App routing](frontend/App.md)
- [Auth abstraction layer](frontend/auth.md)
- [Layout shell](frontend/Layout.md)
- [i18n system](frontend/i18n-context.md)
- [Home view](frontend/Home.md)
- [Search view](frontend/SearchProjects.md)
- [Project detail view](frontend/ProjectDetail.md)
- [Team member list view](frontend/TeamMembers.md)
- [Team member detail view](frontend/TeamMemberDetail.md)
- [Stats dashboard view](frontend/StatsView.md)
- [Requirements view](frontend/Requirements.md)
- [Task detail view](frontend/TaskDetail.md)
