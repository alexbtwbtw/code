# router/team.ts

**Path:** `backend/src/router/team.ts`
**Layer:** Backend
**Purpose:** tRPC router for all team member operations including profile CRUD, project tagging, work history management, CV handling, and member suggestions.

## Overview

This is the largest and most complex router in the codebase. A team member's data is spread across multiple related tables — `team_members`, `member_cvs`, `project_team`, `member_history`, and the three `member_history_*` sub-tables — and this router handles all of them.

Work history records can contain nested geo entries, civil structures, and features (mirroring the project-level equivalents). Mutations that modify history always use SQLite transactions (`db.transaction()`) to keep parent and child rows consistent. The `updateHistory` procedure deletes-then-reinserts all sub-entries to simplify the update logic.

The `suggestMembers` procedure supports two modes. In `local` mode, a scoring algorithm awards points for category matches, country/region experience, structure type overlap, and keyword matches between member bios/history and the project description. In `ai` mode, the same data is forwarded to `suggestMembersAi` which uses the Claude API.

## Key Exports / Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `list` | query | — | All members with a `projectCount` derived from `project_team`. |
| `byId` | query | `{ id }` | Member + tagged projects + full history with sub-entries + CV metadata list. |
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
| `parseCv` | mutation | `{ pdfBase64 }` | Delegates to `lib/parseCv.ts` — calls Claude API to extract structured data from a PDF CV. |
| `suggestMembers` | mutation | `{ projectId, mode: 'ai'|'local', topN }` | Returns ranked member suggestions for a project using local scoring or AI. |

## Dependencies

- `db` from `../db`
- `STRUCTURE_TYPES`, `RawStructure` from `./structures` — schema sharing for history structure entries
- `parseCv` from `../lib/parseCv` — AI CV parsing
- `suggestMembersAi`, `MemberSnapshot`, `ProjectSnapshot` from `../lib/suggestMembersAi` — AI member matching
- `zod`

## Notes

- `byId` returns `null` (not an error) when a member is not found, which the frontend handles by showing a "not found" state.
- `getHistoryWithSubEntries` issues 3 queries per history row (geo, structures, features) — an N+1 pattern. For the current data volume this is acceptable, but it would need batching at scale.
- The `extractVerbatimEvidence` helper in the local scoring path returns raw sentences from the bio containing matched keywords, used to give the user traceable evidence for a recommendation.
- Local scoring reasons are currently written in Portuguese (`"projeto(s) em ${category}"`), which is intentional for the PT-default UI but inconsistent with the EN mode.
- `suggestMembers` in `ai` mode returns a Promise — tRPC handles async mutations correctly, but it means this procedure has higher latency than others.
