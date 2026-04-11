# views/SearchProjects.tsx

**Path:** `frontend/src/views/SearchProjects.tsx`
**Layer:** Frontend
**Purpose:** Project list and search view — provides free-text search, status/category/country filters, sort order, and a card grid of results.

## Overview

All filter state (`search`, `status`, `category`, `country`, `sortBy`) is held in React component state and passed directly to the `trpc.projects.list` query options. TanStack Query re-fetches automatically whenever any filter changes because the query key changes.

The status filter supports a special "Planning & Active" option that sends `"planning,active"` as the status value — the backend's `list` procedure splits this on commas and uses `IN (...)`.

Results are rendered as project cards (`project-card` CSS class) showing: reference code, status pill, project name, client, location (macro region / country / place), project manager, category tag, budget, and date range. Each card is a `<button>` that triggers `onNavigate({ view: 'project', id, name })`.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `SearchProjects` (default) | React component | Props: `{ onNavigate }` |

## Dependencies

- `trpc.projects.list` query
- `useTranslation` for all labels and status/category display strings

## Notes

- The result count is shown as `N projetos` / `1 projeto` (Portuguese hardcoded for the singular/plural switch, not using the i18n system).
- `fmtDate` truncates dates to `YYYY-MM-DD` (the DB stores ISO strings which may include time).
- The sort dropdown maps to the backend's `sortBy` parameter: `relevance` (status priority then newest), `newest` (start_date DESC), `budget` (budget DESC).
- `country` filter uses `LIKE %value%` on the backend, so partial matches work.
