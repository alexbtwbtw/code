# views/Home.tsx

**Path:** `frontend/src/views/Home.tsx`
**Layer:** Frontend
**Purpose:** Role-based home page — renders `UserHome` for standard team members and `OversightHome` for portfolio managers.

## Overview

The `Home` component reads the current user's role from `useCurrentUser()` and delegates to one of two sub-components. Both share the same `onNavigate` prop interface.

**UserHome** is the standard dashboard. It shows four KPI cards (total projects, active projects, member's tagged projects, total EUR budget), a list of up to 5 recent projects (the member's tagged projects if logged in, otherwise the most recent active projects), and a right column with overdue/near-deadline task counts (scoped to the member's tasks if logged in) and quick action buttons.

**OversightHome** is the portfolio manager view. It shows KPIs for total, active, overdue task count, and blocked task count. The main section is a risk table listing all active projects with their project manager, budget, and overdue/blocked task counts per project (sourced from `projects.riskSummary`). Below are two side-by-side sections listing all overdue and all blocked tasks globally. Oversight users can switch to the UserHome view via a toggle button.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `Home` (default) | React component | Route dispatcher; renders UserHome or OversightHome |
| `UserHome` (internal) | React component | Standard member dashboard |
| `OversightHome` (internal) | React component | Portfolio manager risk overview |

## Dependencies

- `useCurrentUser` from `../auth` — role-based routing
- `trpc.projects.stats`, `trpc.projects.myProjects`, `trpc.projects.list`, `trpc.projects.riskSummary`
- `trpc.tasks.overdue`, `trpc.tasks.nearDeadline`, `trpc.tasks.blocked`, `trpc.tasks.myOverdue`, `trpc.tasks.myNearDeadline`
- `useTranslation` from `../i18n/context`

## Notes

- When `user` is `null` (not logged in), `UserHome` falls back to showing global active projects and global overdue/near-deadline task counts.
- The `OversightHome` allows toggling to `viewAs === 'user'` to see the UserHome perspective while remaining an oversight user.
- Budget formatting uses `Intl.NumberFormat` with `pt-PT` locale and EUR currency.
- The risk table only shows EUR budget (`proj.currency === 'EUR'` guard); non-EUR budgets show `—`.
