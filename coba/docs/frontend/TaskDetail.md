# views/TaskDetail.tsx

**Path:** `frontend/src/views/TaskDetail.tsx`
**Layer:** Frontend
**Purpose:** Full task view — displays and edits task fields, manages assignees, and handles comments with inline delete confirmation.

## Overview

`TaskDetail` fetches a task by ID and renders: the task metadata (title, description, status, priority, state summary, due date) with an inline edit form; an assignee panel for adding and removing team members; and a chronological comment thread with per-comment delete.

The edit form (`isEditing` toggle) uses `tasks.update` with all task fields. Due date can be cleared by submitting an empty string, which maps to `null` on the backend.

The assignment panel shows a dropdown of all team members not already assigned. Selecting a member and clicking "Assign" calls `tasks.assign`; each existing assignee has a remove button that calls `tasks.unassign`.

The comment form captures `authorName` and `content` as free-text inputs. Comments are ordered oldest-first (ascending by `created_at`). Each comment has a delete button that calls `tasks.deleteComment`.

Task deletion shows an inline confirm/cancel UI before calling `tasks.delete`, then navigates back to the project.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `TaskDetail` (default) | React component | Props: `{ id, projectId, projectName?, onNavigate }` |

## Dependencies

- `trpc.tasks.byId`, `.update`, `.delete`, `.assign`, `.unassign`, `.addComment`, `.deleteComment`
- `trpc.team.list` — for the assign member dropdown
- `useTranslation`

## Notes

- `byId` returns `null` for unknown task IDs; the view renders a "not found" state in that case.
- `authorName` in comments is a free-text field (not tied to the logged-in user) — any string is accepted.
- After task deletion, `onNavigate({ view: 'project', id: projectId })` is called to return to the project.
- The `dueDate` field uses `type="date"` HTML input; submitting an empty value sets `dueDate: ''` which the backend maps to `null` via the `z.string().nullable().optional()` schema.
