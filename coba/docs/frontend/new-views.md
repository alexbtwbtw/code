# New Frontend Views: CompanyTeams, AdminPanel, TimeReport

This document covers the three views added after the initial frontend documentation was written.

---

## views/CompanyTeams.tsx

**Path:** `frontend/src/views/CompanyTeams.tsx`
**Purpose:** Manage internal organisational teams (e.g. Geotecnia, Estruturas) and their member rosters.

### Overview

Shows a list of all company teams. Selecting a team displays its members in a detail panel. Supports creating, editing, and deleting teams, as well as adding and removing team members from the roster.

State is managed per-panel: `selectedTeamId` controls the detail panel, `showCreateForm` / `editingTeamId` control the create/edit forms, `deleteConfirmId` controls inline delete confirmation.

### Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `CompanyTeams` (default) | React component | No props (does not use `onNavigate`) |

### Dependencies

- `api/companyTeams` — `useCompanyTeamList`, `useCompanyTeamById`, `useCreateCompanyTeam`, `useUpdateCompanyTeam`, `useDeleteCompanyTeam`, `useAddCompanyTeamMember`, `useRemoveCompanyTeamMember`
- `api/team` — `useTeamList` — for the add-member dropdown
- `useTranslation`

---

## views/AdminPanel.tsx

**Path:** `frontend/src/views/AdminPanel.tsx`
**Purpose:** Developer/admin panel — currently exposes the database reseed operation.

### Overview

Shows a single "Re-seed Database" action. The user must tick a confirmation checkbox before the reseed button becomes active. On success, all React Query caches are invalidated so every view fetches fresh data from the newly-seeded database.

Access to this view is navigation-level only (no server-side auth guard); in practice it is only reachable by knowing the `/admin` URL or navigating via the Layout nav.

### Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `AdminPanel` (default) | React component | No props |

### Dependencies

- `trpcClient.admin.reseed` (direct mutation via `useMutation`)
- `useQueryClient` — invalidates all queries on success
- `useCurrentUser` — reads current user role (displayed in panel header)
- `useTranslation`

---

## views/TimeReport.tsx

**Path:** `frontend/src/views/TimeReport.tsx`
**Purpose:** Aggregate time tracking report — hours by project, hours by member, and underreporting alerts.

### Overview

Calls `trpc.timeEntries.report` which returns three aggregated datasets:
- **byProject** — total hours, entry count, and member count per project (only projects with entries)
- **byMember** — total hours, project count, and entry count per member (only members with entries)
- **underreporting** — members tagged to at least one project but with zero time entries

KPI cards at the top summarise total hours, active members (those with entries), and underreporting count. Below are two tables (by project, by member) and an underreporting list.

### Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `TimeReport` (default) | React component | No props |
| `KpiCard` (internal) | React component | Single KPI card |

### Dependencies

- `api/timeEntries` — `useTimeReport`
- `useTranslation`
