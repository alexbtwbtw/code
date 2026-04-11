# db.ts

**Path:** `backend/src/db.ts`
**Layer:** Backend
**Purpose:** Initialises the in-memory SQLite database, defines all 17 table schemas, and exports prepared INSERT statements used by seed modules.

## Overview

The file opens a single better-sqlite3 `:memory:` database and immediately sets two pragmas: WAL journal mode (for better concurrency) and foreign key enforcement. All 17 tables are created in one `db.exec()` call with `CREATE TABLE IF NOT EXISTS` guards.

Because the database is in-memory, all data is lost when the backend process restarts. Seed modules re-populate every table on startup.

The bottom half of the file exports named prepared statements (`insertProject`, `insertGeo`, etc.) as a convenience for the seed scripts, which run outside the tRPC router context. The routers define their own inline prepared statements rather than reusing these exports.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `db` | `Database` | The single shared better-sqlite3 database instance |
| `insertProject` | `Statement` | INSERT one row into `projects` |
| `insertGeo` | `Statement` | INSERT one row into `geo_entries` |
| `insertStructure` | `Statement` | INSERT one row into `structures` |
| `insertFeature` | `Statement` | INSERT one row into `project_features` |
| `insertMember` | `Statement` | INSERT one row into `team_members` |
| `insertProjectTeam` | `Statement` | INSERT OR IGNORE into `project_team` |
| `insertHistory` | `Statement` | INSERT one row into `member_history` |
| `insertHistoryGeo` | `Statement` | INSERT one row into `member_history_geo` |
| `insertHistoryStructure` | `Statement` | INSERT one row into `member_history_structures` |
| `insertHistoryFeature` | `Statement` | INSERT one row into `member_history_features` |
| `insertTask` | `Statement` | INSERT one row into `tasks` |
| `insertTaskAssignment` | `Statement` | INSERT OR IGNORE into `task_assignments` |
| `insertTaskComment` | `Statement` | INSERT one row into `task_comments` |

## Tables

| Table | FK parent | Purpose |
|-------|-----------|---------|
| `projects` | — | Core project records (19 columns) |
| `geo_entries` | `projects` | Geological investigation points (boreholes, trial pits, etc.) |
| `structures` | `projects` | Civil structures (bridges, dams, tunnels, etc.) with geo coordinates |
| `project_features` | `projects` | Labelled geo/infrastructure features on a project |
| `team_members` | — | Staff profiles including `role` (user/oversight) and `password_hash` |
| `member_cvs` | `team_members` | Uploaded PDF CV binary data (stored base64 in TEXT column) |
| `project_team` | `projects`, `team_members` | M2M join: team member tagged to project with a role |
| `member_history` | `team_members`, optionally `projects` | A member's record of past project involvement |
| `member_history_geo` | `member_history` | Geo entries within a history record |
| `member_history_structures` | `member_history` | Civil structures within a history record |
| `member_history_features` | `member_history` | Features within a history record |
| `requirement_books` | optionally `projects` | Staffing requirement collections |
| `requirements` | `requirement_books` | Individual staffing requirements |
| `tasks` | `projects` | Project tasks with status and priority |
| `task_assignments` | `tasks`, `team_members` | M2M: task assigned to member |
| `task_comments` | `tasks` | Comments on tasks |

## Dependencies

- `better-sqlite3` — synchronous SQLite driver; chosen for simplicity given the in-memory use case

## Notes

- `ON DELETE CASCADE` is used extensively so deleting a project removes all its child rows without manual cleanup.
- `member_history.project_id` uses `ON DELETE SET NULL` — a history record survives project deletion but loses the FK link.
- Dates are stored as ISO TEXT (`YYYY-MM-DD` or `YYYY`), not SQLite DATE type.
- `file_data` in `member_cvs` stores base64-encoded PDF bytes in a TEXT column — not a BLOB — because better-sqlite3 serialises buffers lossily through JSON.
- The `password_hash` column on `team_members` was added for a planned auth upgrade; it is not currently populated or checked by any router.
