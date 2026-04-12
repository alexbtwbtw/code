# COBA Agents

Specialist agents used in this project and what they do.

## AWS Cloud Agent

**Purpose:** Plans and maintains the AWS deployment architecture for COBA.

**Responsibilities:**
- Architecture decisions (compute, database, networking, storage)
- Cost estimation and service comparisons
- Terraform module design
- GitHub Actions deployment pipeline design
- Upgrade path planning (POC → production)

**Output:** `docs/aws/` — split into overview, Terraform, pipeline, codebase changes, and rollout files.

**Key decisions made:**
- EC2 t3.micro instead of ECS Fargate (~$12/month vs ~$65/month)
- SQLite on EBS instead of RDS (no query migration needed for POC)
- No ALB, no NAT Gateway (EC2 in public subnet behind CloudFront)
- SSM Parameter Store instead of Secrets Manager (free tier)

## Feature Agent

**Purpose:** Implements UI and backend features across the full stack.

**Responsibilities:**
- Backend service and router procedures (business logic, DB queries)
- Frontend view components and API hooks
- Auth abstraction layer and role-based home pages
- AI-powered features (CV parsing flow, requirements matching, member suggestions)

**Most recent work:** CV evidence deep-linking in the Requirements view — member suggestion cards now link directly to the relevant page in a member's CV PDF (`/api/cv/<id>#page=<n>`).

## Testing Agent

**Purpose:** Implements and maintains the Vitest unit test suite and Playwright E2E tests.

**Responsibilities:**
- Backend unit tests: types, schemas, and services layers (165 tests across 15 files)
- Frontend unit tests: pure utility functions (19 tests, 1 file)
- Playwright E2E tests: critical user journeys (27 tests across 5 spec files)
- Test infrastructure: `resetDb` helper, fixtures, CI integration

**Output:** `backend/src/__tests__/`, `frontend/src/__tests__/`, `e2e/tests/`. See `docs/testing.md` for the full strategy.

## Seed Data Agent

**Purpose:** Populates the in-memory database with realistic seed data for development and testing.

**Responsibilities:**
- Team member profiles with rich project histories, geo entries, structures, and features
- Generated CV PDFs attached to each member via `generateCvPdf`
- Project, requirement book, and task seed data

**Most recent work:** Expanded the team from 4 to 32 members, each with a realistic Portuguese/Lusophone engineering background and multi-project history.
