# router/tasks.ts

**Path:** `backend/src/router/tasks.ts`
**Layer:** Backend
**Purpose:** tRPC router for project task management including CRUD, assignment, comments, and dashboard-level task queries.

## Overview

This router manages the `tasks`, `task_assignments`, and `task_comments` tables. Every task response includes an `assignees` array (members assigned to the task) derived from a JOIN with `team_members`, and a `commentCount` or full `comments` array depending on the procedure.

Three procedures provide cross-project task views for dashboard use: `overdue` (tasks past due date), `nearDeadline` (tasks due within 3 days), and `blocked` (tasks with status `blocked`). Each has a member-scoped variant (`myOverdue`, `myNearDeadline`) that filters by `task_assignments.team_member_id`.

The `update` procedure reads the existing task first, then merges provided fields with existing values — this avoids overwriting fields the caller did not intend to change, without requiring all fields to be re-sent.

## Key Exports / Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `overdue` | query | — | All non-done tasks with a past due date, ordered by due date ASC. Includes project name. |
| `nearDeadline` | query | — | Non-done tasks due within the next 3 days. |
| `blocked` | query | — | All tasks with status `blocked`, with project name and ref code. |
| `myOverdue` | query | `{ memberId }` | Overdue tasks assigned to a specific member. |
| `myNearDeadline` | query | `{ memberId }` | Near-deadline tasks assigned to a specific member. |
| `byProject` | query | `{ projectId }` | All tasks for a project, sorted high→medium→low priority then newest first. |
| `byMember` | query | `{ teamMemberId }` | All tasks assigned to a member, ordered by priority and creation date. |
| `byId` | query | `{ id }` | Single task with full assignees and comments arrays. Returns `null` if not found. |
| `create` | mutation | `{ projectId, title, description, status, priority, stateSummary, dueDate? }` | Creates a task and returns it with empty assignees/comments. |
| `update` | mutation | `{ id, title?, description?, status?, priority?, stateSummary?, dueDate? }` | Partial update; reads existing record to fill unset fields. |
| `delete` | mutation | `{ id }` | Deletes a task (cascades to assignments and comments). |
| `assign` | mutation | `{ taskId, teamMemberId }` | Adds a member to a task (`INSERT OR IGNORE`). |
| `unassign` | mutation | `{ taskId, teamMemberId }` | Removes a member from a task. |
| `addComment` | mutation | `{ taskId, authorName, content }` | Appends a comment and returns the new comment row. |
| `deleteComment` | mutation | `{ id }` | Deletes a comment by ID. |

## Dependencies

- `db` from `../db`
- `zod` — input validation with `TaskStatusSchema` (`todo|in_progress|review|blocked|done`) and `TaskPrioritySchema` (`low|medium|high`)

## Notes

- `dueDate` in `update` accepts `null` explicitly (to clear a due date), unlike most optional fields — hence `z.string().nullable().optional()`.
- `nearDeadline` computes the 3-day window with `Date.now() + 3 * 24 * 60 * 60 * 1000` at query time; there is no caching.
- `byProject` ordering uses a CASE expression for priority rather than relying on alphabetical ordering, which would give `high < low < medium`.
- Comments store `authorName` as a plain string rather than a FK to `team_members`, so comments survive member deletion and can be posted by non-members.
