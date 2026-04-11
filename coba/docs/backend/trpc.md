# trpc.ts

**Path:** `backend/src/trpc.ts`
**Layer:** Backend
**Purpose:** Initialises the tRPC instance and exports the two primitives every router file needs.

## Overview

This is the smallest file in the backend. It calls `initTRPC.create()` with no context type, which means every procedure receives an empty context object (`{}`). The result is destructured into `router` and `publicProcedure`, which are re-exported for use across all router modules.

The absence of a typed context is intentional for the current phase of the project — all procedures are public. When authentication is added, this file is the single change point: `initTRPC.context<Context>().create()` would introduce the context type, and a protected procedure could be derived from `t.procedure.use(authMiddleware)`.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `router` | `RouterFactory` | Factory function for creating tRPC routers |
| `publicProcedure` | `Procedure` | Base procedure builder; all existing procedures use this |

## Dependencies

- `@trpc/server` — provides `initTRPC`

## Notes

- No middleware, no auth, no input/output transforms are applied at this level.
- All procedure validation is done with Zod schemas inside individual router files.
- To add an authenticated procedure in the future, derive it here: `export const protectedProcedure = t.procedure.use(...)`.
