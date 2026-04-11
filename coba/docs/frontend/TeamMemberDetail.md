# views/TeamMemberDetail.tsx

**Path:** `frontend/src/views/TeamMemberDetail.tsx`
**Layer:** Frontend
**Purpose:** Detailed view for a single team member — profile edit, tagged projects, work history management with geo/structure sub-entries, CV upload and download, and assigned tasks.

## Overview

`TeamMemberDetail` is a large view with several independently managed sections. The top section shows the member's profile and provides an inline edit form (via `isEditing` toggle) using `team.update`.

The tagged projects section lists projects the member is tagged to, each linking to `ProjectDetail`.

The history section is the most complex. Each history entry can be expanded to show its geo entries and structures. An inline form (`showHistoryForm`) handles both creation (`addHistory`) and editing (`updateHistory`). The form reuses `GeoSection` and `StructureSection` components from `AddProject.tsx`. The edit path pre-populates the form with existing values including sub-entries. Deleting a history entry shows an inline confirmation.

The CV section lists all uploaded CVs with filename, upload date, and a download button. Downloading fetches the base64 `file_data` via `team.getCvData`, decodes it to a `Uint8Array`, creates a Blob URL, and triggers a synthetic anchor click. A hidden file input allows uploading additional CVs via `team.attachCv`.

The tasks section shows tasks assigned to this member via `tasks.byMember`.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `TeamMemberDetail` (default) | React component | Props: `{ id: number, onNavigate }` |

## Dependencies

- `trpc.team.byId`, `trpc.team.update`, `trpc.team.addHistory`, `trpc.team.updateHistory`, `trpc.team.deleteHistory`, `trpc.team.getCvData` (direct), `trpc.team.attachCv`
- `trpc.projects.list` — for the history form's project-link dropdown
- `trpc.tasks.byMember`
- `GeoSection`, `StructureSection`, `Field`, `STRUCT_TYPE_KEY` from `./AddProject`

## Notes

- `team.byId` returns `null` for unknown IDs — the view renders a "not found" message rather than an error.
- The history form entry's `projectId` field is an optional text input (rendered as a `<select>` from all projects) that links a history entry to a COBA project record. It can be left empty for external projects.
- CV download uses `URL.createObjectURL` + a synthetic `<a>` click — the Blob URL is revoked immediately after click.
- The `updateHistory` procedure deletes-then-reinserts sub-entries, so the edit form must re-send all existing geo entries and structures, not just changes.

