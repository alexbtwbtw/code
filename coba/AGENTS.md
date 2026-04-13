# Agent Status Board

This file is the shared coordination log for all agents working on COBA.
Each agent must update their section when they start, change, or finish a task.

**Format rule:** The `Last updated` field must always include both date AND time in `YYYY-MM-DD HH:MM` format (24h). **Always get the real current time by running `date +"%Y-%m-%d %H:%M"` (bash) before writing — never guess or hardcode a time.**

## At a Glance

| Agent | Status | Working On | Last Updated |
|-------|--------|------------|--------------|
| Features | Idle | — | 2026-04-12 12:29 |
| Architecture & Docs | Idle | — | 2026-04-12 12:31 |
| UI | Idle | — | 2026-04-12 12:31 |
| Seed Data | In Progress | Debugging time entry seeding after reseed | 2026-04-13 |
| Reporting | Idle | — | 2026-04-12 12:29 |
| Testing | Idle | — | 2026-04-12 12:31 |
| AWS Migration | Idle | — | 2026-04-12 12:29 |

_Agents: update this table (status, working on, last updated) whenever you pick up or finish a task._

---

## Agents

### Features Agent
Adds and completes missing product features: new backend endpoints, frontend UI sections, delete flows, confirmation dialogs, and cross-cutting feature gaps.

### Architecture & Docs Agent
Owns code structure, refactoring, type safety, N+1 query fixes, error handling standardisation, pagination, and developer documentation.

### UI Agent
Owns all frontend CSS, component styling, i18n correctness, accessibility, UX polish, and visual consistency across views.

### Seed Data Agent
Owns the quality and realism of all seed data across all 16 database tables. Ensures demo data exercises every feature and edge case.

### Reporting Agent
Owns the Reports view and all backend aggregate/stats procedures. Adds new tabs, charts, and data summaries to give project portfolio visibility.

### Testing Agent
Owns backend unit tests (Vitest), frontend component tests (RTL), and E2E tests (Playwright). Responsible for CI workflow setup.

### AWS Migration Agent
Owns the migration of COBA from local/in-memory to AWS (EC2 + EBS SQLite + S3 + CloudFront). Responsible for Terraform, deploy pipeline, and required codebase changes.

---

## Coordination Notes

- Agents should claim a task by updating their status and the At a Glance table.
- When two agents touch the same file, note it here to avoid conflicts.
- Shared files currently being edited: _none_
