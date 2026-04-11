# AUTH_PLAN.md — Users, Roles & Auth Abstraction

**Author:** Architecture Agent  
**Date:** 2026-04-11  
**Status:** Ready for implementation

---

## 1. Guiding Principles

- Users ARE team members. No separate `users` table is introduced.
- Local dev has zero real auth — a simple user-switcher in the UI backed by `localStorage`.
- The local switcher is hidden behind an abstraction layer (`getCurrentUser()`) that is trivially swappable for Cognito or any IdP later.
- Role determines home page content, not routing paths — `/` always exists, it renders differently per role.

---

## 2. Database Changes

### 2.1 Schema DDL — Add `role` to `team_members`

In `D:\code\coba\backend\src\db.ts`, change the `CREATE TABLE IF NOT EXISTS team_members` block:

```sql
CREATE TABLE IF NOT EXISTS team_members (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  title         TEXT    NOT NULL DEFAULT '',
  email         TEXT    NOT NULL DEFAULT '',
  phone         TEXT    NOT NULL DEFAULT '',
  bio           TEXT    NOT NULL DEFAULT '',
  role          TEXT    NOT NULL DEFAULT 'user',       -- NEW: 'user' | 'oversight'
  password_hash TEXT             DEFAULT NULL,         -- NEW: NULL in local mode; bcrypt hash in prod
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**Notes:**
- `role` defaults to `'user'` so all existing seeded members are automatically standard users.
- `password_hash` is `NULL` in local dev mode. In production (AWS), it is populated during Cognito-backed provisioning. It is never read by the frontend.
- Because the DB is `:memory:` (re-created on each server start), the DDL change takes effect immediately with no migration tooling needed.

### 2.2 Update `insertMember` prepared statement

In `D:\code\coba\backend\src\db.ts`:

```typescript
export const insertMember = db.prepare(`
  INSERT INTO team_members (name, title, email, phone, bio, role)
  VALUES (@name, @title, @email, @phone, @bio, @role)
`)
```

The `role` parameter defaults to `'user'` at DB level, so existing callers that omit `@role` continue to work.

### 2.3 Update `RawMember` type and `mapMember` in team router

In `D:\code\coba\backend\src\router\team.ts`:

```typescript
type RawMember = {
  id: number; name: string; title: string; email: string
  phone: string; bio: string; role: string              // ADD role
  created_at: string; updated_at: string
}

function mapMember(r: RawMember) {
  return {
    id: r.id, name: r.name, title: r.title, email: r.email,
    phone: r.phone, bio: r.bio,
    role: r.role as 'user' | 'oversight',               // ADD role
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
```

---

## 3. Auth Abstraction Layer

### 3.1 New file: `frontend/src/auth/index.ts`

This is the single file the rest of the app imports. It exports one type and three functions.

```typescript
export type CurrentUser = {
  id: number
  name: string
  title: string
  email: string
  role: 'user' | 'oversight'
}

const LOCAL_STORAGE_KEY = 'coba_current_user'

function getLocalUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CurrentUser) : null
  } catch { return null }
}

// ── Public API — swap ONLY these three exports for AWS ──────────────

export function getCurrentUser(): CurrentUser | null {
  return getLocalUser()
}

export function setCurrentUser(user: CurrentUser): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user))
}

export function signOut(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY)
}

// ── React hook ──────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(getCurrentUser)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY) setUser(getCurrentUser())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const switchUser = (next: CurrentUser) => {
    setCurrentUser(next)
    setUser(next)
  }

  return { user, switchUser, signOut }
}
```

**Key design:** `getCurrentUser`, `setCurrentUser`, and `signOut` are the AWS swap points. Replace only their bodies for Cognito — no other files change.

---

## 4. Local Dev User Switcher Component

### 4.1 New file: `frontend/src/components/UserSwitcher.tsx`

- Avatar button in the topbar showing the current user's initials and role badge
- Clicking opens a dropdown listing all team members
- Selecting a member calls `switchUser()` and reloads the page
- On first load with no user in localStorage, auto-selects the first member
- Wrapped with `{import.meta.env.DEV && <UserSwitcher />}` in Layout so it's stripped in production builds

### 4.2 Placement in `frontend/src/components/Layout.tsx`

Insert `<UserSwitcher />` at the right end of the topbar, after the language toggle button:

```
topbar-brand | topbar-nav | lang-btn | <UserSwitcher />
```

### 4.3 CSS additions (`frontend/src/index.css`)

Add rules for:
- `.user-avatar-btn` — pill-shaped button with semi-transparent background
- `.user-avatar-initials` — bold initials
- `.user-avatar-role` — small faded role label
- `.user-switcher-dropdown` — floating panel, dark surface, rounded, shadow
- `.user-switcher-item` — member row with name + role badge
- `.user-switcher-role-badge--user` — blue tint
- `.user-switcher-role-badge--oversight` — amber tint

---

## 5. Role-Based Home Pages

### 5.1 Routing approach

No new routes. The `Page` union keeps `{ view: 'home' }` at `/`. `Home.tsx` reads the current user's role and renders accordingly:

```typescript
export default function Home({ onNavigate }) {
  const { user } = useCurrentUser()
  if (user?.role === 'oversight') return <OversightHome onNavigate={onNavigate} user={user} />
  return <UserHome onNavigate={onNavigate} user={user} />
}
```

### 5.2 UserHome — scoped to current user

Replaces the current generic `Home.tsx` content. Data is filtered to the logged-in member:

| Current (generic) | UserHome (scoped) |
|---|---|
| All projects | `trpc.projects.myProjects({ memberId })` |
| All overdue tasks | `trpc.tasks.myOverdue({ memberId })` |
| All near-deadline | `trpc.tasks.myNearDeadline({ memberId })` |
| "Team Members" KPI | "My Open Tasks" KPI |

### 5.3 OversightHome — portfolio risk view

Two-column layout:

```
┌────────────────────────────────────────────────────────────────┐
│  HERO: "Portfolio Overview"      [Switch to User View →]       │
├─────────────────────┬──────────────────────────────────────────┤
│  Total Projects     │  Active / Planning / Suspended counts    │
│  Total Budget (EUR) │  Overdue Tasks  |  Blocked Tasks         │
├─────────────────────┴──────────────────────────────────────────┤
│  ALL ACTIVE PROJECTS TABLE                                      │
│  Ref | Name | PM | Status | Budget | ⚠ Overdue | 🔴 Blocked  │
├─────────────────────────────────────────────────────────────────┤
│  RISK HIGHLIGHTS                                               │
│  ┌─ Overdue Tasks ─────────────────────────────────────────┐  │
│  │  Task | Project | Assignees | Due date                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─ Blocked Tasks ─────────────────────────────────────────┐  │
│  │  Task | Project | Assignees                              │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

"Switch to User View" is a local state toggle — no URL change, no role change.

---

## 6. New Backend Procedures

### 6.1 `projects.myProjects` — `backend/src/router/projects.ts`

```typescript
myProjects: publicProcedure
  .input(z.object({ memberId: z.number() }))
  .query(({ input }) => {
    const rows = db.prepare(`
      SELECT DISTINCT p.* FROM projects p
      JOIN project_team pt ON pt.project_id = p.id
      WHERE pt.team_member_id = ?
      ORDER BY p.created_at DESC
    `).all(input.memberId) as RawProject[]
    return rows.map(mapProject)
  }),
```

### 6.2 `tasks.myOverdue` and `tasks.myNearDeadline` — `backend/src/router/tasks.ts`

Filter overdue/near-deadline tasks by `task_assignments.team_member_id`. Follow the same pattern as the existing `overdue` procedure but add a JOIN on `task_assignments`.

### 6.3 `projects.riskSummary` — `backend/src/router/projects.ts`

Returns `Record<projectId, { overdueCount, blockedCount }>` for use in the OversightHome project table.

```typescript
riskSummary: publicProcedure.query(() => {
  const today = new Date().toISOString().slice(0, 10)
  const overdue = db.prepare(`
    SELECT project_id, COUNT(*) as cnt FROM tasks
    WHERE due_date < ? AND status != 'done' GROUP BY project_id
  `).all(today) as { project_id: number; cnt: number }[]
  const blocked = db.prepare(`
    SELECT project_id, COUNT(*) as cnt FROM tasks
    WHERE status = 'blocked' GROUP BY project_id
  `).all() as { project_id: number; cnt: number }[]

  const map: Record<number, { overdueCount: number; blockedCount: number }> = {}
  for (const r of overdue) map[r.project_id] = { overdueCount: r.cnt, blockedCount: 0 }
  for (const r of blocked) {
    if (!map[r.project_id]) map[r.project_id] = { overdueCount: 0, blockedCount: 0 }
    map[r.project_id].blockedCount = r.cnt
  }
  return map
}),
```

---

## 7. i18n Keys to Add

In both `frontend/src/i18n/en.ts` and `pt.ts`:

```typescript
userSwitcherLabel:    'Switch user (local dev)'   // PT: 'Mudar utilizador (dev local)'
userRoleUser:         'user'                       // PT: 'utilizador'
userRoleOversight:    'oversight'                  // PT: 'supervisão'
homeMyProjects:       'My Projects'                // PT: 'Os Meus Projetos'
homeMyOpenTasks:      'My Open Tasks'              // PT: 'Tarefas Abertas'
homeOversightTitle:   'Portfolio Overview'         // PT: 'Visão Geral do Portfolio'
homeOversightSwitch:  'Switch to User View'        // PT: 'Ver como Utilizador'
homeRiskHighlights:   'Risk Highlights'            // PT: 'Alertas de Risco'
homeColOverdue:       'Overdue'                    // PT: 'Atrasadas'
homeColBlocked:       'Blocked'                    // PT: 'Bloqueadas'
```

---

## 8. AWS Migration Path

### 8.1 What stays the same
- `CurrentUser` type shape
- `useCurrentUser()` hook signature
- All role-based rendering in `Home.tsx`, `Layout.tsx`, `UserSwitcher.tsx`
- All backend procedures (they remain `publicProcedure` until auth is enforced)

### 8.2 What changes for AWS

1. **Install** `@aws-amplify/auth`
2. **Replace** only the three exported function bodies in `frontend/src/auth/index.ts` with Cognito equivalents (`fetchAuthSession`, `getCurrentUser`, `signOut` from Amplify)
3. **Add Cognito custom attributes** per user: `custom:memberId`, `custom:role`, `custom:title`
4. **Hide UserSwitcher in prod:** wrap with `{import.meta.env.DEV && <UserSwitcher />}` in Layout.tsx
5. **Backend context (future):** extract and verify Cognito JWT in `createContext`; switch to `protectedProcedure` where appropriate

### 8.3 Not required for AWS migration
- Changes to any view component's role logic
- New routes or URL changes
- Database schema changes (role column is already there)

---

## 9. Seed Data Changes

In `backend/src/seed/team.ts`:

- Add `role: 'user'` explicitly to all existing `insertMember.run()` calls
- Add 2 new oversight members at the end of `seedTeam()`:

```typescript
insertMember.run({
  name: 'Margarida Ferreira', title: 'Diretora de Portfolio',
  email: 'm.ferreira@coba.pt', phone: '+351 21 000 9001',
  bio: 'Responsável pela supervisão estratégica de todos os projetos. 20 anos de experiência em gestão de portfolios.',
  role: 'oversight',
})

insertMember.run({
  name: 'Rui Monteiro', title: 'Gestor de Programa Sénior',
  email: 'r.monteiro@coba.pt', phone: '+351 21 000 9002',
  bio: 'Especialista em gestão de risco e reporting executivo. Supervisiona projetos de transporte e energia em múltiplas regiões.',
  role: 'oversight',
})
```

---

## 10. Per-Agent Task Breakdown

### Features Agent
- `backend/src/db.ts` — add `role` + `password_hash` columns to team_members DDL; update `insertMember`
- `backend/src/router/team.ts` — add `role` to `RawMember` type and `mapMember`
- `backend/src/router/projects.ts` — add `myProjects` and `riskSummary` procedures
- `backend/src/router/tasks.ts` — add `myOverdue` and `myNearDeadline` procedures

### UI Agent
- **New:** `frontend/src/components/UserSwitcher.tsx` — user switcher with auto-bootstrap
- `frontend/src/components/Layout.tsx` — render `<UserSwitcher />` in topbar (DEV only)
- `frontend/src/index.css` — add all `.user-switcher-*` and `.user-avatar-*` CSS rules
- `frontend/src/views/Home.tsx` — refactor into role-aware dispatcher + `UserHome` + `OversightHome`
- `frontend/src/i18n/en.ts` + `pt.ts` — add new i18n keys

### Architecture & Docs Agent
- **New:** `frontend/src/auth/index.ts` — auth abstraction layer with `getCurrentUser`, `setCurrentUser`, `signOut`, `useCurrentUser`
- **New:** `docs/AUTH_PLAN.md` — this document ✓

### Seed Data Agent
- `backend/src/seed/team.ts` — add `role: 'user'` to all existing members; add 2 oversight members (Margarida Ferreira, Rui Monteiro) with CVs

### Reporting Agent
- No immediate tasks required
- Optional future: add `projects.budgetAtRisk` procedure (sum of budgets for projects with overdue tasks) for the OversightHome KPI row

---

## 11. File Change Summary

| File | Change | Owner |
|------|--------|-------|
| `backend/src/db.ts` | Add `role`, `password_hash` to team_members; update `insertMember` | Features Agent |
| `backend/src/router/team.ts` | Add `role` to type + mapper | Features Agent |
| `backend/src/router/projects.ts` | Add `myProjects`, `riskSummary` | Features Agent |
| `backend/src/router/tasks.ts` | Add `myOverdue`, `myNearDeadline` | Features Agent |
| `backend/src/seed/team.ts` | Add `role` to all members; add 2 oversight users | Seed Data Agent |
| `frontend/src/auth/index.ts` | **New** — auth abstraction layer | Architecture Agent |
| `frontend/src/components/UserSwitcher.tsx` | **New** — user switcher UI | UI Agent |
| `frontend/src/components/Layout.tsx` | Add `<UserSwitcher />` to topbar | UI Agent |
| `frontend/src/views/Home.tsx` | Role-based UserHome / OversightHome | UI Agent |
| `frontend/src/index.css` | Add user switcher styles | UI Agent |
| `frontend/src/i18n/en.ts` + `pt.ts` | Add ~10 new keys | UI Agent |
| `docs/AUTH_PLAN.md` | **New** — this document | Architecture Agent |

---

## 12. Implementation Order

1. **Features Agent** — DB schema first (`db.ts`, `team.ts` mapper, new router procedures). Everything depends on `role` being in the DB.
2. **Seed Data Agent** — after DB schema, add `role` to seed so the app boots with realistic data.
3. **Architecture Agent** (parallel with #1) — create `auth/index.ts`. No backend dependency.
4. **UI Agent** — last. Depends on auth layer + `team.list` returning `role` + new task/project procedures.

---

## 13. Out of Scope (Explicitly Deferred)

- Real password authentication (no login form, no session management)
- JWT verification on the backend (all procedures stay `publicProcedure`)
- Role-based access control on mutations
- Email/password registration flow
- Multi-tenancy or organization-level isolation
