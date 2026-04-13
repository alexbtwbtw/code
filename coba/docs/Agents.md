# COBA Agents

Specialist agents used in this project and what they do.
The canonical status board is `agents.md` at the repo root.

## Architecture & Docs Agent

**Purpose:** Owns code structure, refactoring, type safety, N+1 query fixes, error handling standardisation, pagination, and developer documentation.

**Responsibilities:**
- Audit and update all files in `docs/`
- Keep `CLAUDE.md` accurate vs the current codebase
- Identify stale, missing, or redundant documentation
- Maintain consistent naming conventions across doc files

**Output:** `docs/` directory — backend, frontend, AWS, archive, and testing docs.

## Features Agent

**Purpose:** Adds and completes missing product features across the full stack.

**Responsibilities:**
- Backend service and router procedures (business logic, DB queries)
- Frontend view components and API hooks
- Auth abstraction layer and role-based home pages
- AI-powered features (CV parsing flow, requirements matching, member suggestions)

## UI Agent

**Purpose:** Owns all frontend CSS, component styling, i18n correctness, accessibility, and visual consistency.

**Responsibilities:**
- Plain CSS dark navy theme in `index.css`
- Responsive layouts and card/table styling
- i18n key coverage in `en.ts` / `pt.ts`
- UX polish and accessibility

## Seed Data Agent

**Purpose:** Populates the in-memory database with realistic seed data for development and testing.

**Responsibilities:**
- Team member profiles with rich project histories, geo entries, structures, and features
- Generated CV PDFs attached to each member via `generateCvPdf`
- Project, requirement book, task, company team, and time entry seed data

**Seed files:** `backend/src/seed/` — `projects.ts`, `team.ts`, `requirements.ts`, `tasks.ts`, `companyTeams.ts`, `timeEntries.ts`.

**Most recent work:** Expanded the team from 4 to 32 members; added company team and time entry seeding.

## Reporting Agent

**Purpose:** Owns the Reports view and all backend aggregate/stats procedures.

**Responsibilities:**
- Reports view tabs (summary, tasks, team)
- TimeReport view (hours by project, by member, underreporting)
- Backend stats procedures in `router/projects.ts` and `router/timeEntries.ts`

## Testing Agent

**Purpose:** Implements and maintains the Vitest unit test suite and Playwright E2E tests.

**Responsibilities:**
- Backend unit tests: types, schemas, and services layers
- Frontend unit tests: pure utility functions
- Playwright E2E tests: critical user journeys
- Test infrastructure: `resetDb` helper, fixtures, CI integration

**Output:** `backend/src/__tests__/`, `frontend/src/__tests__/`, `e2e/tests/`. See `docs/testing.md` for the full strategy.

## AWS Migration Agent

**Purpose:** Owns the migration of COBA from local/in-memory to AWS (EC2 + EBS SQLite + S3 + CloudFront).

**Responsibilities:**
- Architecture decisions (compute, database, networking, storage)
- Cost estimation and service comparisons
- Terraform module design
- GitHub Actions deployment pipeline design
- Required codebase changes

**Key decisions made:**
- EC2 t3.micro instead of ECS Fargate (~$12/month vs ~$65/month)
- SQLite on EBS instead of RDS (no query migration needed for POC)
- No ALB, no NAT Gateway (EC2 in public subnet behind CloudFront)
- SSM Parameter Store instead of Secrets Manager (free tier)

**Output:** `docs/aws/` — split into overview, Terraform, pipeline, codebase changes, and rollout files.
