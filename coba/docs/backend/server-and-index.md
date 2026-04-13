# server.ts + index.ts

**Path:** `backend/src/server.ts` and `backend/src/index.ts`
**Layer:** Backend
**Purpose:** Entry points for the Node.js server — `server.ts` runs seeds then starts the HTTP listener; `index.ts` builds and exports the Hono app.

## Overview

`server.ts` is the process entry point. It loads `dotenv/config` to read `backend/.env`, then runs the seed functions in order. `seedTeam` is async (it generates PDF CVs with pdfkit), so subsequent seeds and the HTTP server start inside its `.then()` callback. If seeding fails, the process exits with code 1.

`index.ts` constructs the Hono application. It applies two middleware layers — the built-in Hono logger and CORS restricted to `http://localhost:5173` — then registers two routes: a lightweight health check at `GET /api/health` and a catch-all tRPC handler at `/trpc/*`. The tRPC handler uses the fetch-adapter (`@trpc/server/adapters/fetch`) with an empty context, meaning all procedures are effectively public.

The split between the two files keeps the app factory (`index.ts`) importable and testable independently of the server bootstrap (`server.ts`).

## Seed order

`server.ts` runs seeds in this order: `seedProjects` → `seedTeam` (async, awaited) → `seedRequirements` → `seedTasks` → `seedCompanyTeams` → `seedTimeEntries`. Requirements and tasks depend on team member IDs, so `seedTeam` must complete first.

## Key Exports / Procedures

| Export | File | Description |
|--------|------|-------------|
| `app` (default) | `index.ts` | Hono application instance; used by `serve()` in server.ts |

## Dependencies

- `@hono/node-server` — wraps Hono's fetch-based interface for Node.js
- `hono/cors`, `hono/logger` — middleware
- `@trpc/server/adapters/fetch` — bridges tRPC to Hono's request/response model
- `dotenv/config` — loads `ANTHROPIC_API_KEY`, `USE_REAL_AI`, and optional `PORT` from `backend/.env`
- Seed modules (`./seed/*`) — populate the in-memory SQLite database before the server accepts requests

## Notes

- CORS `origin` is hardcoded to `http://localhost:5173`; update for any production or staging environment.
- All tRPC procedures use `publicProcedure` — there is no authentication middleware at the Hono level or within tRPC's `createContext`.
- The `PORT` environment variable defaults to `3000` if not set.
- `USE_REAL_AI=true` in `backend/.env` enables real Claude API calls; omitting it causes AI lib functions to use mock implementations from `backend/src/lib/mocks/`.
