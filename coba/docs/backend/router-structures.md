# router/structures.ts

**Path:** `backend/src/router/structures.ts`
**Layer:** Backend
**Purpose:** tRPC router for civil structures (bridges, dams, tunnels, etc.) attached to projects.

## Overview

The structures router handles the `structures` table and follows the same three-procedure pattern as the geo router: list by project, create, delete. A structure record stores type, material, location (macro region / country / place / GPS), dimensional data (length, height, span), foundation type, design load, and construction date.

Several identifiers are exported for reuse across the codebase. `STRUCTURE_TYPES` is a const tuple used both in this router's Zod schema and in `router/team.ts` where history structures share the same type enumeration. `RawStructure` and `mapStructure` are imported by `router/team.ts` for the `member_history_structures` mapper.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `structuresRouter` | tRPC router | Mounted as `structures` in the app router |
| `byProject` | query | All structures for a `projectId`, ordered by `label` ASC |
| `create` | mutation | Insert a new structure |
| `delete` | mutation | Delete a structure by `id` |
| `STRUCTURE_TYPES` | const tuple | 11 allowed structure types (`bridge`, `dam`, `tunnel`, `retaining_wall`, `embankment`, `building`, `pipeline`, `reservoir`, `culvert`, `road`, `other`) |
| `RawStructure` | TypeScript type | Raw DB row — imported by team.ts |
| `mapStructure` | function | Converts `RawStructure` to camelCase |
| `CreateStructureSchema` | Zod schema | Exported for frontend reuse |

## Dependencies

- `db` from `../db`
- `zod`

## Notes

- Dimensional fields (`length_m`, `height_m`, `span_m`, `design_load`) are all optional floats and map to `null` when not provided.
- As with geo entries, there is no update procedure — callers delete and recreate.
- `STRUCTURE_TYPES` being a `const` tuple rather than a plain array is required so Zod's `z.enum()` can infer a literal union type.
