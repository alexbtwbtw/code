# components/Layout.tsx

**Path:** `frontend/src/components/Layout.tsx`
**Layer:** Frontend
**Purpose:** Application shell — renders the top navigation bar, breadcrumb trail, language toggle, and dev-only UserSwitcher; wraps page content in `<main>`.

## Overview

`Layout` receives the current `Page` and an `onNavigate` callback as props. It derives the active nav tab by mapping detail-level pages back to their parent section (e.g. `view: 'project'` activates the `search` tab). Breadcrumbs are shown for `project`, `member`, and `requirement-book` pages, displaying the parent section link and the item name (or `#id` as a fallback).

The language toggle button shows the opposite language code (clicking "EN" switches to English). The `UserSwitcher` component is rendered only when `import.meta.env.DEV` is true, so it never appears in production builds.

Navigation is entirely prop-driven — `Layout` does not call any tRPC queries or manage its own async state.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `Layout` (default) | React component | Shell wrapper; Props: `{ page, onNavigate, children }` |
| `NavBtn` (internal) | React component | Renders a single nav button with active state styling |

## Dependencies

- `useTranslation` from `../i18n/context` — for nav labels and the language toggle label
- `UserSwitcher` from `./UserSwitcher` — dev-only user switcher dropdown
- `Page` type from `../App`

## Notes

- The `activeTab` derivation uses the `view` field: `project` → `search`, `member` → `team`, `requirement-book` → `requirements`, `task` → `search`. Views not in this mapping use their own `view` value as the tab key.
- Breadcrumbs are only rendered for three page types; `task` and `add` views do not get a breadcrumb.
- The `task` view maps to the `search` activeTab because tasks live under projects, and projects are accessed via the Search nav item.
