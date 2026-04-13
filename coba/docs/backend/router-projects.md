# router/projects.ts

**Path:** `backend/src/router/projects.ts`
**Layer:** Backend
**Purpose:** tRPC router for all project CRUD operations, statistics, and role-specific project queries. Delegates all DB logic to `services/projects.ts`.

## Overview

This router manages the `projects` table and provides the primary list/search endpoint that the frontend's SearchProjects view and Home page rely on. Following the Phase 2 architecture refactor, the router is a thin tRPC wrapper — all queries and business logic live in `backend/src/services/projects.ts`, and types/mappers live in `backend/src/types/projects.ts`.

Two procedures support the role-based home page: `myProjects` returns projects the calling member is tagged to via `project_team`, and `riskSummary` returns a map of `{ projectId → { overdueCount, blockedCount } }` used by the oversight dashboard.

## Key Exports / Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `list` | query | `{ search?, status?, category?, country?, sortBy? }` | Full-text search and filtered project list. `status` accepts comma-separated values. Sort modes: `relevance` (active/planning first), `newest`, `budget`. |
| `byId` | query | `{ id }` | Single project by primary key; throws if not found. |
| `create` | mutation | `CreateProjectSchema` | Insert a new project; returns the created record. |
| `update` | mutation | partial `CreateProjectSchema` + `id` | Partial update via COALESCE; returns the updated record. |
| `parseProject` | mutation | `{ pdfBase64 }` | Delegates to `lib/parseProject.ts` to extract project data from a PDF via the Claude API. |
| `stats` | query | optional `{ status? }` | Aggregate counts by status, category, country, start year, and total EUR budget. |
| `myProjects` | query | `{ memberId }` | Projects the given member is tagged to (via `project_team`). |
| `riskSummary` | query | — | Map of project ID to overdue/blocked task counts, used by the oversight home page. |

## Dependencies

- `services/projects.ts` — all DB queries and business logic
- `lib/parseProject.ts` — AI-powered project data extraction from PDF
- `schemas/projects.ts` — Zod input validation schemas
- `types/projects.ts` — `RawProject` type and `mapProject()` mapper (used by service)

## Notes

- The full-text search joins `geo_entries` with `DISTINCT p.*` to avoid duplicate project rows when multiple geo entries match.
- The `status` filter in `list` splits on commas, enabling multi-status filtering (e.g. `"planning,active"`).
- `parseProject` always calls the real Claude API regardless of `USE_REAL_AI` (unlike other AI libs, it has no mock dispatch).
- `riskSummary` computes overdue using `new Date().toISOString().slice(0, 10)` — evaluated at query time, not cached.
