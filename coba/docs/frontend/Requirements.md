# views/Requirements.tsx

**Path:** `frontend/src/views/Requirements.tsx`
**Layer:** Frontend
**Purpose:** Two-panel view for managing requirement books and running member matching; exports both the list view and the book detail view.

## Overview

`Requirements` (the default export) shows the list of all requirement books. Each card displays title, category, optional linked project, and requirement count. An inline "new book" form allows creating a book with an optional project link selected from a dropdown.

`RequirementBookDetail` (named export) is the detail view for a single book. It shows the book's metadata with an edit form, lists all individual requirements with inline edit/delete, and provides a "Find Members" panel for each requirement.

The matching panel supports two modes (local and AI), a configurable `topN` slider, and displays results with: member name, title, email, bio excerpt, rationale, optional verbatim evidence, history count, project count, recent history, and a CV download link. Clicking a member navigates to their `TeamMemberDetail`.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `Requirements` (default) | React component | Props: `{ onNavigate }` — book list and creation |
| `RequirementBookDetail` (named) | React component | Props: `{ id, onNavigate }` — book detail with requirement CRUD and member matching |

## Dependencies

- `trpc.requirements.listBooks`, `.bookById`, `.createBook`, `.updateBook`, `.deleteBook`
- `trpc.requirements.createRequirement`, `.updateRequirement`, `.deleteRequirement`
- `trpc.requirements.matchMembers`
- `trpc.projects.list` — for the project-link dropdown
- `trpc.team.getCvData` (via `trpcClient`) — for CV download in match results
- `useTranslation`

## Notes

- `RequirementBookDetail` is rendered directly in `App.tsx` for the `requirement-book` page view.
- The `topN` slider ranges from 1 to 10 (rendered as a range input).
- Both match modes (`local` and `ai`) are called as mutations because the AI mode has network cost; the local mode result is also a mutation for consistency.
- CV download in the match results panel follows the same Blob URL pattern as `TeamMemberDetail`.
- `DISCIPLINES` and `LEVELS` constants in this file are local duplicates of the backend constants — they are not imported via the `@backend` alias.
