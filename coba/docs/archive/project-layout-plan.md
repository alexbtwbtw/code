> **Archive note:** This plan was written on 2026-04-11 and has been implemented. The full backend layering (`db/`, `schemas/`, `types/`, `services/`, thin `router/`) and frontend layering (`api/`, `constants/`, `utils/`, `types/`, `components/shared/`) are all live. Refer to the source files for current state.

---

# COBA Project Layout Refactoring Plan

**Date:** 2026-04-11  
**Author:** Architecture & Docs Agent  
**Status:** Implemented

---

## 1. Problems with the Old Layout (Historical Context)

The original codebase had all logic co-located in router files: `Raw*` types, Zod schemas, DB prepared statements, helper functions, and business logic were all mixed together in `router/<domain>.ts` files. The `extractVerbatimEvidence` utility was duplicated between `team.ts` and `requirements.ts`.

On the frontend, constants (`STATUS_KEY`, `TASK_STATUS_KEY`, etc.) and utility functions (`initials`, `fmtDate`) were duplicated across multiple view files. `AddProject.tsx` was exporting components for consumption by other views.

---

## 2. Implemented Backend Structure

```
backend/src/
├── db/
│   ├── client.ts              # better-sqlite3 instance + pragma setup
│   ├── schema.ts              # All CREATE TABLE DDL
│   ├── statements/            # Prepared statements per domain
│   └── index.ts               # Barrel re-export
├── schemas/                   # Zod schemas and domain constants per domain
├── types/                     # Raw* types and map*() functions per domain
├── services/                  # All business logic and DB queries per domain
│   └── matching.ts            # extractVerbatimEvidence() — shared
├── router/                    # Thin tRPC procedures only (no SQL, no types)
│   └── index.ts               # appRouter composition
├── lib/                       # AI helpers and PDF generation
└── seed/                      # Seed data scripts
```

---

## 3. Implemented Frontend Structure

```
frontend/src/
├── api/                       # Custom React Query hooks per domain
├── components/
│   ├── shared/                # GeoSection, StructureSection, Field
│   ├── Layout.tsx
│   └── UserSwitcher.tsx
├── constants/                 # Shared constant objects (projects, tasks, geo, structures)
├── utils/                     # format.ts (fmt, fmtDate, fmtDim, initials), download.ts
├── types/                     # pages.ts (Page union, pageToPath, pathToPage), suggestions.ts
├── auth/                      # Auth abstraction layer
├── views/                     # Slim view components (import from api/, constants/, utils/)
├── i18n/                      # Language context and translation keys
├── App.tsx                    # Uses Page type + navigation utils from types/pages.ts
└── trpc.ts                    # tRPC client + queryClient
```

---

## 4. Key Design Rules (Implemented)

**Backend router layer:** Each procedure delegates immediately to a service function. No `db.prepare`, no `Raw*` type assertions, no SQL strings inside any `router/` file.

**Frontend view layer:** No view file imports from another view file. Duplicate constant objects and utility functions exist in exactly one place (`constants/` and `utils/`).

---

## 5. Out of Scope (Deferred)

These items from the original plan were explicitly not part of the initial refactor:
- Caching of prepared statements for hot paths
- N+1 query elimination in `getHistoryWithSubEntries`
- Separate `api/` hook files for `geo`, `structures`, and `features` (hooks remain inline in views or use tRPC directly)
