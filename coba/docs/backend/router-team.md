# router/team.ts

**Path:** `backend/src/router/team.ts`
**Layer:** Backend
**Purpose:** tRPC router for all team member operations including profile CRUD, project tagging, work history management, and CV handling. Delegates DB logic to `services/team.ts`.

## Overview

This is the largest and most complex router in the codebase. A team member's data is spread across multiple related tables — `team_members`, `member_cvs`, `project_team`, `member_history`, and the three `member_history_*` sub-tables — all of which are managed through this router.

Work history records can contain nested geo entries, civil structures, and features (mirroring the project-level equivalents). Mutations that modify history use SQLite transactions (`db.transaction()`) to keep parent and child rows consistent. The `updateHistory` procedure deletes-then-reinserts all sub-entries to simplify the update logic.

Following the Phase 2 architecture refactor, the router is a thin tRPC wrapper — all DB queries and business logic live in `backend/src/services/team.ts`.

**Note:** Member suggestion (`suggestMembers`) was moved to `router/requirements.ts` as part of a later refactor. It is no longer in this router.

## Key Exports / Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `list` | query | — | All members with a `projectCount` derived from `project_team`. |
| `byId` | query | `{ id }` | Member + tagged projects + full history with sub-entries + CV metadata list. Returns `null` if not found. |
| `create` | mutation | member fields + optional `cv` | Creates member record; optionally attaches a CV in the same call. |
| `update` | mutation | member fields + `id` | Updates name, title, email, phone, bio. |
| `byProject` | query | `{ projectId }` | Members tagged to a project with their `roleOnProject`. |
| `tagProject` | mutation | `{ projectId, teamMemberId, roleOnProject }` | Tags a member to a project via `INSERT OR REPLACE`. |
| `untagProject` | mutation | `{ projectId, teamMemberId }` | Removes the `project_team` row. |
| `addHistory` | mutation | `HistoryInputSchema` | Adds a history record with geo/structure/feature sub-entries in a transaction. |
| `updateHistory` | mutation | `HistoryInputSchema` + `id` | Replaces a history record's sub-entries (delete-then-reinsert pattern). |
| `deleteHistory` | mutation | `{ id }` | Deletes a history record (cascades to sub-tables). |
| `getCvData` | query | `{ cvId }` | Returns base64 `file_data` for CV download by the frontend. |
| `attachCv` | mutation | `{ teamMemberId, filename, fileSize, fileData }` | Attaches a PDF CV to an existing member. |
| `createWithHistory` | mutation | `{ member, history[], cv? }` | Atomic: creates member + all history records + optional CV in one transaction. Used after CV parsing. |
| `parseCv` | mutation | `{ pdfBase64 }` | Delegates to `lib/parseCv.ts` — calls Claude API (or mock) to extract structured data from a PDF CV. |

## Dependencies

- `services/team.ts` — all DB queries and business logic
- `schemas/team.ts` — Zod input schemas
- `types/team.ts` — `RawMember`, `mapMember()`, and related mappers
- `lib/parseCv.ts` — AI CV parsing (with mock dispatch via `USE_REAL_AI`)

## Notes

- `byId` returns `null` (not an error) for unknown IDs — the frontend handles this with a "not found" state.
- `getHistoryWithSubEntries` in the service layer issues 3 queries per history row (geo, structures, features) — an N+1 pattern acceptable at current data volume.
- The `updateHistory` procedure deletes-then-reinserts sub-entries, so the edit form must re-send all existing geo entries and structures.
- Local scoring/suggestion logic was extracted to `services/matching.ts` and exposed via `router/requirements.ts`.
