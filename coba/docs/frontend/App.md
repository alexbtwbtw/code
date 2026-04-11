# App.tsx

**Path:** `frontend/src/App.tsx`
**Layer:** Frontend
**Purpose:** Root React component — defines the `Page` union type, implements URL routing via the History API, and renders the active view inside `Layout`.

## Overview

COBA uses a client-side routing model built on React state and the browser History API rather than a router library. The `Page` union type is a discriminated union where `view` is the discriminant. Each variant carries only the props that view needs (e.g. `{ view: 'project'; id: number; name?: string }`).

Two pure functions handle URL mapping: `pageToPath` converts a `Page` to a URL pathname, and `pathToPage` parses a pathname back to a `Page` (with regex matching for parameterised routes). A `navigate` callback calls `window.history.pushState` and sets React state in one step.

A `popstate` listener handles browser back/forward navigation. On mount, `replaceState` is called on the initial entry so that the first page also has state data and back-navigation works correctly on the first click.

All eight view components are rendered conditionally with `&&` short-circuit evaluation. `RequirementBookDetail` is a named export from `Requirements.tsx` and is rendered directly in `App.tsx`.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `Page` | TypeScript union type | Discriminated union of all possible page states; imported by every view component and `Layout` |
| `App` (default) | React component | Root component; provides `navigate` callback to all children |

## Dependencies

- `Layout` — shell with top nav and breadcrumb
- All view components in `views/`
- React `useState`, `useCallback`, `useEffect`

## Notes

- `name` and `title` on some `Page` variants (e.g. `{ view: 'project'; id: number; name?: string }`) are populated when navigating programmatically so that breadcrumbs can display the label without a query. They are absent when navigating via browser history; the detail view fetches its own data anyway.
- The `task` variant carries `projectId` in addition to `id` because `TaskDetail` needs to navigate back to the project.
- Unknown URL paths fall back to `{ view: 'home' }`.
- The `Page` type is exported for import by child components that need to call `onNavigate`.
