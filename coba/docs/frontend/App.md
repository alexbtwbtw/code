# App.tsx

**Path:** `frontend/src/App.tsx`
**Layer:** Frontend
**Purpose:** Root React component — imports the `Page` union type from `types/pages.ts`, implements URL routing via the History API, and renders the active view inside `Layout`.

## Overview

COBA uses a client-side routing model built on React state and the browser History API rather than a router library. The `Page` union type (defined in `frontend/src/types/pages.ts`) is a discriminated union where `view` is the discriminant. Each variant carries only the props that view needs (e.g. `{ view: 'project'; id: number; name?: string }`).

`App.tsx` re-exports the `Page` type for backward compatibility (`export type { Page }`), but the canonical definition lives in `types/pages.ts`. The routing helpers `pageToPath` and `pathToPage` are also imported from `types/pages.ts`.

A `navigate` callback calls `window.history.pushState` and sets React state in one step. A `popstate` listener handles browser back/forward navigation. On mount, `replaceState` is called on the initial entry so that the first page also has state data.

## Views rendered

| `page.view` | Component |
|-------------|-----------|
| `home` | `Home` |
| `search` | `SearchProjects` |
| `add` | `AddProject` |
| `reports` | `Reports` |
| `project` | `ProjectDetail` |
| `team` | `TeamMembers` |
| `member` | `TeamMemberDetail` |
| `requirements` | `Requirements` |
| `requirement-book` | `RequirementBookDetail` (named export from `Requirements.tsx`) |
| `task` | `TaskDetail` |
| `company-teams` | `CompanyTeams` |
| `admin` | `AdminPanel` |
| `time-report` | `TimeReport` |

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `Page` | TypeScript union type (re-export) | Discriminated union of all possible page states |
| `App` (default) | React component | Root component; provides `navigate` callback to all children |

## Dependencies

- `Layout` — shell with top nav and breadcrumb
- All 13 view components in `views/`
- `Page`, `pageToPath`, `pathToPage` from `./types/pages`
- React `useState`, `useCallback`, `useEffect`

## Notes

- `name` and `title` on some `Page` variants are populated when navigating programmatically so breadcrumbs can display the label without a query.
- The `task` variant carries `projectId` and `projectName` in addition to `id` because `TaskDetail` needs to navigate back to the project.
- Unknown URL paths fall back to `{ view: 'home' }`.
