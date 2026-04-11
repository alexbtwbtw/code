# router/geo.ts

**Path:** `backend/src/router/geo.ts`
**Layer:** Backend
**Purpose:** tRPC router for geological investigation entries (boreholes, trial pits, core samples, field surveys) attached to projects.

## Overview

This is a slim router with three procedures covering the full lifecycle of a `geo_entries` row: list by project, create, and delete. Geo entries record geotechnical field investigation data including soil and rock types, depths, bearing capacities, SPT values, and GPS coordinates.

The file also exports the `RawGeo` TypeScript type and the `mapGeo` snake_case-to-camelCase mapper. These are imported by `router/team.ts` (indirectly via `HistoryGeoSchema`) to keep the geo field list consistent between project-level geo entries and the history copies stored in `member_history_geo`.

The `CreateGeoEntrySchema` is exported so it can be used by `AddProject.tsx` on the frontend via the `@backend` path alias.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `geoRouter` | tRPC router | The router instance — mounted as `geo` in the app router |
| `byProject` | query | All geo entries for a given `projectId`, ordered by `point_label` ASC |
| `create` | mutation | Insert a new geo entry; input validated by `CreateGeoEntrySchema` |
| `delete` | mutation | Delete a geo entry by `id` |
| `CreateGeoEntrySchema` | Zod schema | Exported for frontend reuse |
| `RawGeo` | TypeScript type | Raw DB row shape — used by team.ts |
| `mapGeo` | function | Converts a `RawGeo` to camelCase |

## Dependencies

- `db` from `../db`
- `zod`

## Notes

- `GeoTypeSchema` constrains `type` to `borehole | trial_pit | core_sample | field_survey` — values outside this set are rejected at the tRPC layer.
- Delete cascades in the database (FK `ON DELETE CASCADE`) mean deleting a project also removes its geo entries without calling this router.
- There is no update procedure; the frontend edits geo entries by deleting and recreating them.
