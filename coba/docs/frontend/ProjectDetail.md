# views/ProjectDetail.tsx

**Path:** `frontend/src/views/ProjectDetail.tsx`
**Layer:** Frontend
**Purpose:** Full project view — displays and edits all project fields, manages geo entries, civil structures, features, team assignments, time entries, and tasks for a single project.

## Overview

`ProjectDetail` is the largest view component. It fetches a project by ID and renders sections for: project metadata (with inline edit form), geological entries, civil structures, geographic features, tagged team members, time entries, and the project task board.

The edit flow uses an `isEditing` boolean to toggle between read-only display and an inline form. On save, the `projects.update` mutation is called with only the changed fields; the form pre-populates from the fetched project data.

Geo entries, structures, and features each have inline add forms below their respective tables. Deletion uses optimistic patterns — mutations invalidate the relevant query keys so the UI refreshes.

The task board section displays tasks grouped in a card list with priority colour coding, status pills, assignee initials chips, and a comment count badge. Clicking a task navigates to `TaskDetail`.

Shared sub-components `GeoSection`, `StructureSection`, and `Field` are imported from `frontend/src/components/shared/` (not from `AddProject.tsx` — they were extracted there during the Phase 2 refactor).

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `ProjectDetail` (default) | React component | Props: `{ id: number, onNavigate }` |

## Dependencies

- `api/projects` — `useProjectById`, `useUpdateProject`
- `api/geo` — `useGeoByProject`, `useCreateGeo`, `useDeleteGeo`
- `api/structures` — `useStructuresByProject`, `useCreateStructure`, `useDeleteStructure`
- `api/features` — `useFeaturesByProject`, `useCreateFeature`, `useDeleteFeature`
- `api/team` — `useTeamByProject`, `useTeamList`, `useTagProject`, `useUntagProject`
- `api/tasks` — `useTasksByProject`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`
- `api/timeEntries` — `useTimeEntriesByProject`, `useCreateTimeEntry`, `useDeleteTimeEntry`
- `components/shared` — `GeoSection`, `StructureSection`, `Field`
- `constants/structures` — `STRUCT_TYPE_KEY`

## Notes

- Task status and priority constants are imported from `constants/tasks.ts`.
- Project manager autocomplete is rendered as a text input with a datalist of existing team member names.
- Features section follows the same add/delete pattern as geo/structures.
- Time entries section shows a card list of hours logged by members with add/delete capability.
