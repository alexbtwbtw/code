# views/ProjectDetail.tsx

**Path:** `frontend/src/views/ProjectDetail.tsx`
**Layer:** Frontend
**Purpose:** Full project view — displays and edits all project fields, manages geo entries, civil structures, features, team assignments, and tasks for a single project.

## Overview

`ProjectDetail` is the largest view component. It fetches a project by ID and renders sections for: project metadata (with inline edit form), geological entries, civil structures, geographic features, tagged team members, and the project task board.

The edit flow uses an `isEditing` boolean to toggle between read-only display and an inline form. On save, the `projects.update` mutation is called with only the changed fields; the form pre-populates from the fetched project data.

Geo entries, structures, and features each have inline add forms below their respective tables. Deletion uses optimistic patterns — mutations invalidate the relevant query keys so the UI refreshes.

The task board section displays tasks grouped in a card list with priority colour coding, status pills, assignee initials chips, and a comment count badge. A status legend row (colour squares + translated labels) helps orient users. Clicking a task navigates to `TaskDetail`.

`GeoSection` and `StructureSection` are imported from `AddProject.tsx` for reuse in the inline add forms.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `ProjectDetail` (default) | React component | Props: `{ id: number, onNavigate }` |

## Dependencies

- `trpc.projects.byId`, `trpc.projects.update`
- `trpc.geo.byProject`, `trpc.geo.create`, `trpc.geo.delete`
- `trpc.structures.byProject`, `trpc.structures.create`, `trpc.structures.delete`
- `trpc.features.byProject`, `trpc.features.create`, `trpc.features.delete`
- `trpc.team.byProject`, `trpc.team.list`, `trpc.team.tagProject`, `trpc.team.untagProject`
- `trpc.tasks.byProject`, `trpc.tasks.create`, `trpc.tasks.update`, `trpc.tasks.delete`
- `GeoSection`, `StructureSection`, `Field`, `STRUCT_TYPE_KEY` from `./AddProject`

## Notes

- The component imports shared form sub-components from `AddProject.tsx` (`GeoSection`, `StructureSection`, `Field`) to avoid duplicating the form UI.
- Task status and priority constants are defined locally rather than imported from the backend schema, since the frontend does not share TypeScript types for enum values directly.
- Project manager autocomplete is rendered as a text input with a datalist of existing team member names.
- Features section was added later and follows the same pattern as geo/structures.
