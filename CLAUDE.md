# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Style

- **Always delegate implementation work to sub-agents.** Use the `Agent` tool for any non-trivial task — research, coding, edits across multiple files. Only do direct edits for trivial single-line changes (e.g., updating this file).
- **Default model is Sonnet** (`claude-sonnet-4-6`) unless the task specifically warrants Opus (e.g., deep security audits, complex architectural reasoning). Pass `model: "sonnet"` when spawning agents unless overriding.
- Run independent agents in parallel in a single message whenever possible.

## Project Overview

This monorepo contains three apps:

- **`coba/`** — COBA, a bilingual (EN/PT) project management app for civil engineering / geotechnical projects.
- **`game/`** — Game app (backend on :3001, frontend Vite on :5174).
- **`home/`** — Static landing page linking to the other two apps (frontend Vite on :5175, no backend).

## Commands

```bash
# Development — starts all backends, all frontends, and a reverse proxy at http://localhost:8080
npm run dev

# Proxy only (if sub-apps are already running)
npm run dev:proxy
```

The reverse proxy (`scripts/dev-proxy.mjs`) mirrors the AWS routing:
- `/api/*`, `/trpc/*` → COBA backend (:3000)
- `/game/api/*`, `/game/trpc/*` → Game backend (:3001)
- `/game/*` → Game Vite (:5174)
- `/coba/*` → COBA Vite (:5173)
- `/*` → Home Vite (:5175)

**Per-project commands** (run from each app directory):

```bash
# COBA (coba/)
npm run dev             # backend :3000 + frontend :5173
npm run dev:backend
npm run dev:frontend
npm run build
npm --prefix frontend run lint

# Game (game/)
npm run dev             # backend :3001 + frontend :5174
npm run dev:backend
npm run dev:frontend
npm run build

# Home (home/frontend/)
npm run dev             # Vite :5175
npm run build
```

Requires Node >= v25 (see `.nvmrc`).

## Architecture

Monorepo with three apps (`coba/`, `game/`, `home/`) and a root `package.json` that orchestrates all of them via `concurrently` plus a local reverse proxy.

### COBA (`coba/`)

See `coba/CLAUDE.md` for the full COBA architecture (backend, frontend, database schema, routers, AI helpers, seed data).

Key facts:
- Backend: **Hono** + **tRPC** on :3000; in-memory SQLite (better-sqlite3); Claude API integration
- Frontend: **React 19** + **Vite** + **TanStack React Query** + **tRPC client** on :5173; `base: '/coba/'` in production
- tRPC provides end-to-end type safety via `@backend` path alias

### Game (`game/`)

- Backend: runs on :3001
- Frontend: Vite on :5174
- See `game/` for details

### Home (`home/`)

- Static React landing page (no backend), Vite on :5175
- Deployed to the S3 root; links out to `/coba/` and `/game/`
