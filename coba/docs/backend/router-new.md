# New Routers: admin, system, companyTeams, timeEntries

This document covers the four routers added after the initial architecture refactor.

---

## router/admin.ts

**Path:** `backend/src/router/admin.ts`
**Purpose:** Admin operations — currently only `reseed`, which wipes and re-populates the entire in-memory database.

### Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `reseed` | mutation | — | Deletes all rows in FK-safe order, resets `sqlite_sequence`, then runs all seed functions in order. Returns `{ ok: true, message }` on success. |

### Notes

- Reseed order: `seedProjects` → `seedTeam` (awaited, async) → `seedRequirements` → `seedTasks` → `seedCompanyTeams` → `seedTimeEntries`.
- The `AdminPanel` view in the frontend calls this; it is guarded in the UI by requiring the user to confirm before triggering.
- There is no server-level auth guard on this endpoint — it is accessible to any client in the current local/dev mode.

---

## router/system.ts

**Path:** `backend/src/router/system.ts`
**Purpose:** System/environment queries used by the frontend to adapt UI to the current runtime configuration.

### Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `aiEnabled` | query | — | Returns `{ aiEnabled: boolean }` — true when `USE_REAL_AI=true` in the environment. |

### Notes

- The frontend's `api/system.ts` hook calls this on app load to show/hide AI-dependent UI elements (e.g. "Parse with AI" buttons).

---

## router/companyTeams.ts

**Path:** `backend/src/router/companyTeams.ts`
**Purpose:** CRUD for internal organisational teams (`company_teams` table) and their membership.

### Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `list` | query | — | All company teams with `memberCount`. Ordered by name. |
| `byId` | query | `{ id }` | Single team with its `members` array (`id`, `name`, `title`). Throws if not found. |
| `create` | mutation | `{ name, description? }` | Creates a new company team. |
| `update` | mutation | `{ id, name, description }` | Updates name and description. |
| `delete` | mutation | `{ id }` | Deletes a team (cascades to `company_team_members`). |
| `addMember` | mutation | `{ teamId, memberId }` | Adds a member to the team (`INSERT OR IGNORE`). |
| `removeMember` | mutation | `{ teamId, memberId }` | Removes a member from the team. |
| `byMember` | query | `{ memberId }` | All company teams a given member belongs to. |

### Notes

- This router does not delegate to a service layer — it contains inline DB queries.
- `company_teams.name` has a `UNIQUE` constraint, so creating a duplicate name will throw a SQLite error.

---

## router/timeEntries.ts

**Path:** `backend/src/router/timeEntries.ts`
**Purpose:** Time tracking — log hours worked by a team member on a project.

### Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `byProject` | query | `{ projectId }` | All time entries for a project, joined with member name. Ordered by date DESC. |
| `byMember` | query | `{ memberId }` | All time entries for a member, joined with project name. Ordered by date DESC. |
| `create` | mutation | `{ projectId, memberId, date, hours, description? }` | Logs a new time entry. `hours` must be positive (DB CHECK constraint). |
| `delete` | mutation | `{ id }` | Deletes a time entry. |
| `report` | query | — | Aggregate time report: hours by project, hours by member, and members with zero time logged (underreporting). |

### Notes

- This router does not delegate to a service layer — it contains inline DB queries and local `mapEntry` helpers.
- The `report` procedure provides three aggregated views used by the `TimeReport` frontend view.
- `time_entries.hours` is stored as `REAL` and has a `CHECK(hours > 0)` constraint — zero-hour entries will fail at the DB level.
