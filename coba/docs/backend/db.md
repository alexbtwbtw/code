# Backend Database Layer

**Paths:** `backend/src/db/`
**Layer:** Backend
**Purpose:** Initialises the in-memory SQLite database, defines all table schemas, and exports prepared statements used by seed modules and services.

## Structure

The `db/` directory was extracted from the original monolithic `db.ts` during Phase 2 of the architecture refactor:

| File | Role |
|------|------|
| `db/client.ts` | Opens the single `better-sqlite3` `:memory:` database instance, sets WAL pragma and foreign key enforcement, and exports `db`. |
| `db/schema.ts` | Applies all `CREATE TABLE IF NOT EXISTS` DDL via `db.exec()`. Imported once for its side effect. |
| `db/statements/<domain>.ts` | Named prepared statements per domain (`projects.ts`, `team.ts`, `tasks.ts`, `geo.ts`, `structures.ts`, `features.ts`, `requirements.ts`). Used by seed scripts and services. |
| `db/index.ts` | Barrel re-export: triggers the schema side-effect import and re-exports `db` and all prepared statements. |
| `db.ts` (root) | Legacy shim: `export * from './db/index'`. Kept so that any import using `../db` still resolves. Routers were updated to use `../db/client` directly. |

Because the database is in-memory, all data is lost when the backend process restarts. Seed modules re-populate every table on startup.

## Tables (21 total)

| Table | FK parent | Purpose |
|-------|-----------|---------|
| `projects` | — | Core project records (20 columns) |
| `geo_entries` | `projects` | Geological investigation points (boreholes, trial pits, etc.) |
| `structures` | `projects` | Civil structures (bridges, dams, tunnels, etc.) with geo coordinates |
| `project_features` | `projects` | Labelled geo/infrastructure features on a project |
| `team_members` | — | Staff profiles including `role` (user/oversight) and `password_hash` |
| `member_cvs` | `team_members` | Uploaded PDF CV binary data; `file_data` (TEXT) or `s3_key` for AWS storage |
| `project_team` | `projects`, `team_members` | M2M join: team member tagged to project with a role |
| `member_history` | `team_members`, optionally `projects` | A member's record of past project involvement |
| `member_history_geo` | `member_history` | Geo entries within a history record |
| `member_history_structures` | `member_history` | Civil structures within a history record |
| `member_history_features` | `member_history` | Features within a history record |
| `requirement_books` | optionally `projects` | Staffing requirement collections |
| `requirements` | `requirement_books` | Individual staffing requirements (discipline, level, certifications) |
| `requirement_assignments` | `requirements`, `team_members` | M2M: a team member assigned to fulfil a requirement |
| `tasks` | `projects` | Project tasks with status and priority |
| `task_assignments` | `tasks`, `team_members` | M2M: task assigned to member |
| `task_comments` | `tasks` | Comments on tasks (author stored as free-text) |
| `time_entries` | `projects`, `team_members` | Hours logged by a member against a project on a given date |
| `company_teams` | — | Internal organisational teams (e.g. Geotecnia, Estruturas) |
| `company_team_members` | `company_teams`, `team_members` | M2M: member belongs to a company team |

## Key Exports

| Export | Source | Description |
|--------|--------|-------------|
| `db` | `db/client.ts` | The single shared better-sqlite3 database instance |
| `insertProject`, `insertGeo`, etc. | `db/statements/<domain>.ts` | Named prepared INSERT statements used by seed scripts |

## Dependencies

- `better-sqlite3` — synchronous SQLite driver; chosen for simplicity given the in-memory use case

## Notes

- `ON DELETE CASCADE` is used extensively so deleting a project removes all child rows.
- `member_history.project_id` uses `ON DELETE SET NULL` — history survives project deletion but loses the FK link.
- `requirement_books.project_id` also uses `ON DELETE SET NULL` for the same reason.
- Dates are stored as ISO TEXT (`YYYY-MM-DD` or `YYYY`), not SQLite DATE type.
- `file_data` in `member_cvs` stores base64-encoded PDF bytes in a TEXT column; `s3_key` stores the AWS S3 object key (for the AWS deployment). Only one is expected to be populated per row.
- The `password_hash` column on `team_members` is not currently populated or checked by any router.
