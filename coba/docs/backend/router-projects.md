# router/projects.ts

**Path:** `backend/src/router/projects.ts`
**Layer:** Backend
**Purpose:** tRPC router for all project CRUD operations, statistics, and role-specific project queries.

## Overview

This router manages the `projects` table and provides the primary list/search endpoint that the frontend's SearchProjects view and Home page rely on. The `list` procedure does a `LEFT JOIN` with `geo_entries` so that free-text search covers geological data (soil types, rock types, notes) in addition to project fields.

All snake_case database columns are mapped to camelCase via a local `mapProject` helper before being returned to the client. The `update` procedure uses `COALESCE` to perform partial updates — only fields explicitly provided in the input are changed.

Two procedures support the role-based home page added in the AUTH_PLAN phase: `myProjects` returns projects the calling member is tagged to via `project_team`, and `riskSummary` returns a map of `{ projectId → { overdueCount, blockedCount } }` used by the oversight dashboard.

## Key Exports / Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `list` | query | `{ search, status, category, country, sortBy }` | Full-text search and filtered project list. `status` accepts comma-separated values. Sort modes: `relevance` (active/planning first), `newest`, `budget`. |
| `byId` | query | `{ id }` | Single project by primary key; throws if not found. |
| `create` | mutation | `CreateProjectSchema` | Insert a new project; returns the created record. |
| `update` | mutation | partial `CreateProjectSchema` + `id` | Partial update via COALESCE; returns the updated record. |
| `parseProject` | mutation | `{ pdfBase64 }` | Delegates to `lib/parseProject.ts` to extract project data from a PDF. |
| `stats` | query | optional `{ status }` | Aggregate counts by status, category, country, start year, and total EUR budget. |
| `myProjects` | query | `{ memberId }` | Projects the given member is tagged to (via `project_team`). |
| `riskSummary` | query | — | Map of project ID to overdue/blocked task counts, used by the oversight home page. |

## Dependencies

- `db` from `../db` — direct database queries
- `parseProject` from `../lib/parseProject` — AI-powered project data extraction from PDF
- `zod` — input validation

## Notes

- The full-text search joins `geo_entries` with `DISTINCT p.*` to avoid duplicate project rows when multiple geo entries match.
- The `status` filter in `list` splits on commas, enabling multi-status filtering (e.g. `"planning,active"`).
- `update` maps `undefined` inputs to `null` before passing them to `COALESCE`, so unset optional fields do not accidentally overwrite existing values.
- The `RawProject` type and `mapProject` function are local to this file; they do not need to be shared because no other router queries the `projects` table directly.
- `riskSummary` computes overdue using `new Date().toISOString().slice(0, 10)` — this is evaluated at query time, not cached.
