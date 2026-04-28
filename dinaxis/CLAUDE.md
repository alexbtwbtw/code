# Dinaxis

Claims adjuster portal for managing a small claims adjustment business.

## Stack
- Backend: Hono + tRPC + better-sqlite3, port 3002
- Frontend: React 19 + Vite + TanStack Query + tRPC client, port 5176, base `/dinaxis/`

## Commands (run from dinaxis/)
npm run dev             # backend :3002 + frontend :5176
npm run dev:backend
npm run dev:frontend

## Architecture
Same layered pattern as COBA:
- types/<domain>.ts — Raw* types + map() functions
- schemas/<domain>.ts — Zod schemas
- services/<domain>.ts — DB queries + business logic
- router/<domain>.ts — thin tRPC procedure wrappers

## Storage
STORAGE env var selects adapter: blob (dev, default) | s3 (AWS) | filesystem (Electron)
DATABASE_URL env var: :memory: (dev) | file path (AWS/Electron)
