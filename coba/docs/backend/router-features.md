# router/features.ts

**Path:** `backend/src/router/features.ts`
**Layer:** Backend
**Purpose:** tRPC router for labelled geographic/infrastructure features attached to projects.

## Overview

Project features are free-form labelled points of interest on a project — examples include monitoring systems, control installations, distribution networks, water intakes, and other notable elements that are not primary civil structures. They complement `geo_entries` (field investigations) and `structures` (primary civil works).

The router provides the standard three operations: list by project, create, and delete. The `CreateFeatureSchema` and `FeatureInput` type are exported for use by `AddProject.tsx` on the frontend, which renders an inline feature form.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `featuresRouter` | tRPC router | Mounted as `features` in the app router |
| `byProject` | query | All features for a `projectId`, ordered by `label` ASC |
| `create` | mutation | Insert a new feature; input validated by `CreateFeatureSchema` |
| `delete` | mutation | Delete a feature by `id` |
| `CreateFeatureSchema` | Zod schema | Exported for frontend reuse |
| `FeatureInput` | TypeScript type | `CreateFeatureSchema` without `projectId` — convenience type for forms |

## Dependencies

- `db` from `../db`
- `zod`

## Notes

- Features have no type enumeration unlike geo entries or structures — the `label` and `description` fields are fully free-form.
- GPS coordinates (`latitude`, `longitude`) are optional.
- There is no update procedure.
