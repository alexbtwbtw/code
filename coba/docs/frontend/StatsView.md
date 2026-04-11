# views/Reports.tsx

**Path:** `frontend/src/views/Reports.tsx`
**Layer:** Frontend
**Purpose:** Stats dashboard with three tabs covering project KPIs, task urgency, and a team placeholder.

## Overview

The view has three tabs controlled by `activeTab` state: `'summary'`, `'tasks'`, `'team'`. The default tab on load is `'tasks'`.

**Summary tab** shows four KPI cards (total, active, completed, EUR budget), four breakdown tables (by status, category, country, start year), and an optional "Active only" filter toggle. Each table row includes a proportional bar visualisation rendered with a CSS-only fill div.

**Tasks tab** shows three sequential sections: tasks due within 3 days (near-deadline, amber styling), overdue tasks (red styling), and blocked tasks (yellow styling). Task cards show priority dot, title, status pill, project name, assignee initials chips, comment count, and due date. Clicking a card navigates to TaskDetail.

**Team tab** shows a "coming soon" placeholder.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `Reports` (default) | React component | Props: `{ onNavigate? }` |
| `KpiCard` (internal) | React component | Single KPI metric card |
| `ReportTable` (internal) | React component | Breakdown table with bar column |

## Dependencies

- `trpc.projects.stats` — with optional `{ status: 'active' }` filter
- `trpc.tasks.overdue`, `trpc.tasks.nearDeadline`, `trpc.tasks.blocked`
- `useTranslation`

## Notes

- `onNavigate` is optional; the component renders without it, but task cards become non-clickable.
- `activeOnly` state controls whether the `stats` query is filtered to active projects only.
- `STATUS_LABELS` and `CATEGORY_LABELS` use English values in both language modes — not wired through i18n.
- All task sections load in full without pagination.
