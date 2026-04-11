# auth/index.ts

**Path:** `frontend/src/auth/index.ts`
**Layer:** Frontend
**Purpose:** Auth abstraction layer that exposes a `CurrentUser` type, three swap-point functions, and a `useCurrentUser` React hook; currently backed by `localStorage`.

## Overview

This file is designed for future migration to AWS Cognito or another identity provider. The three exported functions — `getCurrentUser`, `setCurrentUser`, and `signOut` — are the only places that touch the auth storage mechanism. All application code consumes `useCurrentUser()` or calls these three functions; swapping the backend means editing only their implementations.

In the current local mode, the active user is serialised as JSON in `localStorage` under the key `coba_current_user`. A `storage` event listener in `useCurrentUser` keeps the hook state in sync when the user is changed in another browser tab (e.g. via the dev UserSwitcher in a second window).

`CurrentUser` has a `role` field with two values: `'user'` (standard team member) and `'oversight'` (portfolio manager). The Home view switches between `UserHome` and `OversightHome` based on this role.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `CurrentUser` | TypeScript type | `{ id, name, title, email, role: 'user' | 'oversight' }` |
| `getCurrentUser` | function | Returns the active user or `null`; reads from `localStorage` |
| `setCurrentUser` | function | Persists a user to `localStorage`; no-op placeholder for AWS mode |
| `signOut` | function | Clears the stored user |
| `useCurrentUser` | React hook | Returns `{ user, switchUser, signOut }` with storage-event sync |

## Dependencies

- `react` — `useState`, `useEffect`
- No external auth library in current implementation

## Notes

- The `id` on `CurrentUser` corresponds to a `team_members.id` in the database; it is used by `myProjects` and `myOverdue`/`myNearDeadline` queries to scope results.
- There is no token validation — the user object is trusted as stored. This is appropriate for the local demo phase only.
- `useCurrentUser` returns a `switchUser` helper that calls both `setCurrentUser` (storage) and `setUser` (React state), ensuring the UI updates immediately without needing a page reload.
- The `UserSwitcher` component (dev-only) calls `switchUser` directly; it is not rendered in production (`import.meta.env.DEV` guard in Layout.tsx).
