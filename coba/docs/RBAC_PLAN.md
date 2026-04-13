# COBA RBAC Plan

**Date:** 2026-04-13  
**Author:** Architecture & Docs Agent  
**Status:** Proposal — awaiting product review before implementation

---

## Executive Summary

COBA currently has three roles (`user`, `finance`, `oversight`) enforced only by localStorage and a single `financeProcedure` middleware. This proposal formalises a five-role hierarchy that maps cleanly to a civil engineering consultancy's org chart, enforces access server-side via a composable tRPC middleware stack, and is designed to swap in AWS Cognito with minimal code changes.

---

## 1. Proposed Role Hierarchy

### 1.1 Roles

A typical civil engineering / geotechnical consultancy has five distinct permission groups:

| Role | Display Name | Who holds it |
|------|-------------|-------------|
| `admin` | System Administrator | IT / DevOps staff who manage the platform itself |
| `oversight` | Director / Partner | Senior leadership with full read + executive write access |
| `manager` | Project Manager | Engineers who own projects and lead teams |
| `finance` | Finance Controller | Finance/accounting staff; full financial access, limited elsewhere |
| `user` | Engineer / Staff | Technical staff; can do their own project work, limited admin |

> **Note:** Roles are flat (no hierarchical inheritance) so permissions are explicit and auditable. A user cannot accumulate permissions from lower roles automatically — each role's permissions are listed independently.

---

### 1.2 Permission Matrix

Legend: `✅` = full access · `👁` = read-only · `🚫` = no access · `🔑` = own records only

#### Projects

| Action | admin | oversight | manager | finance | user |
|--------|-------|-----------|---------|---------|------|
| View list / search | ✅ | ✅ | ✅ | ✅ | ✅ |
| View project detail | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create project | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Edit project | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Delete project | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| Parse project from PDF (AI) | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| View geo entries / structures / features | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create / delete geo entries / structures / features | ✅ | ✅ | ✅ | 🚫 | 🚫 |

#### Team Members

| Action | admin | oversight | manager | finance | user |
|--------|-------|-----------|---------|---------|------|
| View member list | ✅ | ✅ | ✅ | ✅ | ✅ |
| View member detail / history | ✅ | ✅ | ✅ | 👁 | 👁 |
| Create member | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Edit member (name, bio, title) | ✅ | ✅ | ✅ | 🚫 | 🔑 |
| Delete member | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| Tag / untag member on project | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Add / edit / delete history | ✅ | ✅ | ✅ | 🚫 | 🔑 |
| Upload / delete CV | ✅ | ✅ | ✅ | 🚫 | 🔑 |
| Parse CV (AI) | ✅ | ✅ | ✅ | 🚫 | 🔑 |
| Suggest members (AI matching) | ✅ | ✅ | ✅ | 🚫 | 🚫 |

#### Tasks

| Action | admin | oversight | manager | finance | user |
|--------|-------|-----------|---------|---------|------|
| View tasks (all) | ✅ | ✅ | ✅ | 👁 | 👁 |
| Create task | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Edit task (status, priority, dates) | ✅ | ✅ | ✅ | 🚫 | 🔑 |
| Delete task | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Assign / unassign members to tasks | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Add comment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete comment (own) | ✅ | ✅ | ✅ | ✅ | 🔑 |
| Delete comment (any) | ✅ | ✅ | ✅ | 🚫 | 🚫 |

#### Time Entries

| Action | admin | oversight | manager | finance | user |
|--------|-------|-----------|---------|---------|------|
| View own time entries | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all members' time entries | ✅ | ✅ | ✅ | ✅ | 🚫 |
| Create own time entry | ✅ | ✅ | ✅ | 🚫 | ✅ |
| Edit / delete own time entry | ✅ | ✅ | ✅ | 🚫 | ✅ |
| Edit / delete any time entry | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| View aggregate time report | ✅ | ✅ | ✅ | ✅ | 🚫 |

#### Finance

| Action | admin | oversight | manager | finance | user |
|--------|-------|-----------|---------|---------|------|
| View project financial summary | ✅ | ✅ | ✅ | ✅ | 🚫 |
| View member cost summary | ✅ | ✅ | 🚫 | ✅ | 🚫 |
| View company financials report | ✅ | ✅ | 🚫 | ✅ | 🚫 |
| Set / delete member rates | ✅ | 🚫 | 🚫 | ✅ | 🚫 |
| Create / edit / delete fixed costs | ✅ | 🚫 | 🚫 | ✅ | 🚫 |

> **Rationale:** Oversight directors need to see project-level financials for portfolio decisions, but should not edit rates or costs (separation of duties). Managers see their own project's financial summary to manage within budget. Finance exclusively owns rate and cost management.

#### Requirements / Books

| Action | admin | oversight | manager | finance | user |
|--------|-------|-----------|---------|---------|------|
| View requirement books | ✅ | ✅ | ✅ | 🚫 | ✅ |
| Create / edit / delete books | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Create / edit / delete requirements | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Match members to requirements | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Assign / remove requirement assignments | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| Parse requirements from PDF (AI) | ✅ | ✅ | ✅ | 🚫 | 🚫 |

#### Reports

| Action | admin | oversight | manager | finance | user |
|--------|-------|-----------|---------|---------|------|
| View basic stats (status, category, country) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View portfolio / risk summary | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| View financial reports | ✅ | ✅ | 🚫 | ✅ | 🚫 |
| View team utilisation / time reports | ✅ | ✅ | ✅ | ✅ | 🚫 |

#### Admin / System

| Action | admin | oversight | manager | finance | user |
|--------|-------|-----------|---------|---------|------|
| Reseed database | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| Wipe database | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| Manage company teams | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| View AI enabled / system status | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 2. AWS Cognito Compatibility

### 2.1 How Roles Are Stored in Cognito

**Use Cognito User Pool Groups** (not custom attributes) for roles:

```
UserPool
  Group: coba-admin
  Group: coba-oversight
  Group: coba-manager
  Group: coba-finance
  Group: coba-user   ← default group for all new users
```

Each group should have an IAM role ARN attached only if the group needs to call AWS services directly (e.g. S3 from the browser). For this app, group membership is purely for tRPC middleware checks — no IAM delegation is needed.

**Why groups, not custom attributes?**
- Custom attributes (`custom:role`) require an admin-initiated update, cannot be changed at sign-in, and are not included in Access Tokens by default (only ID Tokens).
- Groups appear in both the Access Token (`cognito:groups` claim) and the ID Token (`cognito:groups` claim), and are managed through the Cognito admin API without schema changes.

**Token claim mapping:**

| Current header | Cognito equivalent |
|----------------|-------------------|
| `x-user-role: finance` | `cognito:groups: ["coba-finance"]` in JWT `cognito:groups` array |
| `userId` (from localStorage) | `sub` claim (UUID) in JWT |
| `user.name` | `name` attribute claim in ID Token |
| `user.email` | `email` attribute claim |

A user can belong to multiple groups; the backend should take the **highest-privilege group** present:
```
priority: admin > oversight > manager > finance > user
```

### 2.2 JWT Verification in the tRPC Backend

**Phase 2 (Cognito live) — replace `createContext` in `backend/src/index.ts`:**

```ts
import { CognitoJwtVerifier } from 'aws-jwt-verify'

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',      // verify Access Token, not ID Token
  clientId: process.env.COGNITO_CLIENT_ID!,
})

createContext: async ({ req }): Promise<AppContext> => {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { userId: null, userRole: null, userName: null }

  try {
    const payload = await verifier.verify(token)
    const groups: string[] = (payload['cognito:groups'] as string[]) ?? []
    const role = resolveHighestRole(groups)   // maps group names to role string
    return {
      userId: payload.sub,
      userRole: role,
      userName: payload.name as string | null,
    }
  } catch {
    return { userId: null, userRole: null, userName: null }
  }
}
```

**No API Gateway Authorizer needed** — JWT verification happens inside the tRPC middleware. An API Gateway Authorizer would require a Lambda and adds latency; since the Hono backend is already a Node.js process, in-process verification with `aws-jwt-verify` is simpler and faster.

### 2.3 Swap-In Points in the Current Codebase

| File | Phase 1 (current) | Phase 2 (Cognito) |
|------|-------------------|------------------|
| `backend/src/index.ts` — `createContext` | Reads `x-user-role` header | Verifies JWT Bearer token; extracts `sub`, groups → role |
| `backend/src/trpc.ts` — `AppContext` | `userRole: string \| null` | Add `userId: string \| null`, `userName: string \| null` |
| `frontend/src/auth/index.ts` — `getCurrentUser()` | Reads localStorage | Calls `Auth.currentAuthenticatedUser()` (Amplify) or `cognitoUser.getSignInUserSession()` |
| `frontend/src/auth/index.ts` — `setCurrentUser()` | Writes localStorage | Becomes no-op (Cognito owns session) |
| `frontend/src/auth/index.ts` — `signOut()` | Clears localStorage | Calls `Auth.signOut()` |
| `frontend/src/trpc.ts` — tRPC client headers | Sends `x-user-role` header | Sends `Authorization: Bearer <access_token>` header |

**All other files (routers, views, hooks) remain unchanged** — the middleware stack abstracts the credential source.

### 2.4 Header Transition: `x-user-role` → JWT claims

Phase 1 frontend (`frontend/src/trpc.ts`) currently sends:
```ts
headers: {
  'x-user-role': user?.role ?? '',
}
```

Phase 2 replaces this with:
```ts
headers: async () => ({
  authorization: `Bearer ${await getAccessToken()}`,  // Amplify or OIDC
}),
```

The backend `createContext` switches from `req.headers.get('x-user-role')` to JWT verification. The tRPC procedure middleware code (`authedProcedure`, `managerProcedure`, etc.) is **unchanged** — it still reads `ctx.userRole`.

---

## 3. Backend Enforcement Design

### 3.1 Middleware Stack

All middleware is defined in `backend/src/trpc.ts`. Each level extends the one above:

```
publicProcedure          ← no auth required (system.aiEnabled, health)
  └── authedProcedure    ← any authenticated user (all read queries)
        ├── managerProcedure   ← manager, oversight, or admin
        ├── financeProcedure   ← finance, oversight, or admin
        ├── oversightProcedure ← oversight or admin
        └── adminProcedure     ← admin only
```

### 3.2 Middleware Definitions

```ts
// backend/src/trpc.ts

import { initTRPC, TRPCError } from '@trpc/server'

export type AppContext = {
  userId: string | null      // member ID (DB integer in Phase 1, Cognito sub UUID in Phase 2)
  userRole: Role | null
  userName: string | null
}

export type Role = 'admin' | 'oversight' | 'manager' | 'finance' | 'user'

const ROLE_WEIGHT: Record<Role, number> = {
  admin: 50, oversight: 40, manager: 30, finance: 20, user: 10,
}

function atLeast(ctx: AppContext, minRole: Role): boolean {
  if (!ctx.userRole) return false
  return (ROLE_WEIGHT[ctx.userRole] ?? 0) >= ROLE_WEIGHT[minRole]
}

const t = initTRPC.context<AppContext>().create()

export const router = t.router

// ── No auth required ─────────────────────────────────────────────────────────
export const publicProcedure = t.procedure

// ── Any authenticated user ───────────────────────────────────────────────────
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userRole) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }
  return next({ ctx: { ...ctx, userRole: ctx.userRole } })
})

// ── Manager or above ─────────────────────────────────────────────────────────
export const managerProcedure = authedProcedure.use(({ ctx, next }) => {
  if (!atLeast(ctx, 'manager')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Manager access required' })
  }
  return next({ ctx })
})

// ── Finance or above (finance | oversight | admin) ───────────────────────────
export const financeProcedure = authedProcedure.use(({ ctx, next }) => {
  const allowed: Role[] = ['finance', 'oversight', 'admin']
  if (!ctx.userRole || !allowed.includes(ctx.userRole)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Finance access required' })
  }
  return next({ ctx })
})

// ── Oversight or admin ────────────────────────────────────────────────────────
export const oversightProcedure = authedProcedure.use(({ ctx, next }) => {
  if (!atLeast(ctx, 'oversight')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Oversight access required' })
  }
  return next({ ctx })
})

// ── Admin only ────────────────────────────────────────────────────────────────
export const adminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
  return next({ ctx })
})
```

> **Note on `financeProcedure`:** Finance is a *parallel* role, not a rank. A finance controller sits at weight 20, below manager (30), but needs access to financial procedures that managers do not. Therefore `financeProcedure` uses an allowlist rather than `atLeast`. Oversight (40) and admin (50) are also in the allowlist.

### 3.3 Procedure Assignment by Router

| Router | Procedure | Middleware |
|--------|-----------|-----------|
| `system` | `aiEnabled` | `publicProcedure` |
| `projects` | `list`, `byId`, `stats`, `riskSummary`, `priorityList`, `myProjects` | `authedProcedure` |
| `projects` | `create`, `update`, `parseProject` | `managerProcedure` |
| `projects` | `delete` | `oversightProcedure` |
| `geo`, `structures`, `features` | `byProject` | `authedProcedure` |
| `geo`, `structures`, `features` | `create`, `delete` | `managerProcedure` |
| `team` | `list`, `byId`, `byProject`, `getCvData` | `authedProcedure` |
| `team` | `create`, `update`, `tagProject`, `untagProject`, `addHistory`, `updateHistory`, `deleteHistory`, `attachCv`, `createWithHistory`, `parseCv`, `suggestMembers` | `managerProcedure` |
| `tasks` | `overdue`, `nearDeadline`, `blocked`, `myOverdue`, `myNearDeadline`, `byProject`, `byMember`, `byId` | `authedProcedure` |
| `tasks` | `create`, `delete`, `assign`, `unassign` | `managerProcedure` |
| `tasks` | `update`, `addComment`, `deleteComment` | `authedProcedure` (+ per-procedure ownership check for `user` role) |
| `timeEntries` | `byMember` (own only, enforced in procedure) | `authedProcedure` |
| `timeEntries` | `byProject`, `report` | `financeProcedure` |
| `timeEntries` | `create`, `delete` | `authedProcedure` (+ ownership check in procedure) |
| `finance` | all procedures | `financeProcedure` |
| `requirements` | `listBooks`, `bookById` | `authedProcedure` |
| `requirements` | `createBook`, `updateBook`, `deleteBook`, `createRequirement`, `updateRequirement`, `deleteRequirement`, `matchMembers`, `addAssignment`, `removeAssignment`, `parseFromPdf` | `managerProcedure` |
| `companyTeams` | all procedures | `adminProcedure` |
| `admin` | `reseed`, `wipe` | `adminProcedure` |

### 3.4 Ownership Checks (Per-Procedure Guards)

Some procedures use `authedProcedure` but restrict write access to the record owner. These checks live inside the procedure body, not in middleware, because they require a DB lookup:

```ts
// Example: tasks.update — authedProcedure + ownership guard
update: authedProcedure.input(UpdateTaskSchema).mutation(async ({ ctx, input }) => {
  const task = db.getTask(input.id)
  if (!task) throw new TRPCError({ code: 'NOT_FOUND' })
  // managers and above can edit any task; users can only edit tasks assigned to them
  if (!atLeast(ctx, 'manager')) {
    const isAssigned = db.isTaskAssignee(input.id, ctx.userId)
    if (!isAssigned) throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return db.updateTask(input)
})
```

The same pattern applies to `timeEntries.create` / `timeEntries.delete` (users can only touch their own entries) and `tasks.addComment` / `tasks.deleteComment` (users can only delete their own comments).

---

## 4. Frontend Enforcement Design

### 4.1 Extend `CurrentUser` Type

```ts
// frontend/src/auth/index.ts

export type Role = 'admin' | 'oversight' | 'manager' | 'finance' | 'user'

export type CurrentUser = {
  id: number
  name: string
  title: string
  email: string
  role: Role
}
```

### 4.2 `usePermissions()` Hook

Add `frontend/src/auth/permissions.ts`:

```ts
import { useCurrentUser } from './index'
import type { Role } from './index'

const ROLE_WEIGHT: Record<Role, number> = {
  admin: 50, oversight: 40, manager: 30, finance: 20, user: 10,
}

function atLeast(role: Role | undefined, min: Role): boolean {
  if (!role) return false
  return (ROLE_WEIGHT[role] ?? 0) >= ROLE_WEIGHT[min]
}

export function usePermissions() {
  const { user } = useCurrentUser()
  const role = user?.role

  return {
    // --- Identity
    isAuthenticated: !!user,
    role,

    // --- Projects
    canViewProjects:    !!role,
    canCreateProjects:  atLeast(role, 'manager'),
    canEditProjects:    atLeast(role, 'manager'),
    canDeleteProjects:  atLeast(role, 'oversight'),

    // --- Team members
    canViewTeam:        !!role,
    canEditTeam:        atLeast(role, 'manager'),
    canManageOwnProfile: !!role,   // users can edit their own bio/CV
    canDeleteTeam:      atLeast(role, 'oversight'),

    // --- Tasks
    canViewTasks:       !!role,
    canCreateTasks:     atLeast(role, 'manager'),
    canEditAnyTask:     atLeast(role, 'manager'),
    canDeleteTasks:     atLeast(role, 'manager'),
    canAssignTasks:     atLeast(role, 'manager'),

    // --- Time entries
    canCreateTimeEntry: role !== 'finance' && !!role,
    canViewAllTimeEntries: role === 'finance' || atLeast(role, 'manager'),
    canViewTimeReport:  role === 'finance' || atLeast(role, 'manager'),

    // --- Finance
    canViewFinance:     role === 'finance' || atLeast(role, 'oversight'),
    canViewProjectCosts: atLeast(role, 'manager') || role === 'finance',
    canManageRates:     role === 'finance' || role === 'admin',
    canManageFixedCosts: role === 'finance' || role === 'admin',

    // --- Requirements
    canViewRequirements: !!role,
    canManageRequirements: atLeast(role, 'manager'),

    // --- Reports
    canViewReports:     !!role,
    canViewPortfolioReports: atLeast(role, 'manager'),
    canViewFinancialReports: role === 'finance' || atLeast(role, 'oversight'),

    // --- Admin
    canAccessAdmin:     atLeast(role, 'oversight'),   // oversight sees admin nav
    canReseedDatabase:  role === 'admin',
    canManageCompanyTeams: role === 'admin',
  } as const
}

export type Permissions = ReturnType<typeof usePermissions>
```

### 4.3 Route / View Guard Component

Add `frontend/src/auth/RequirePermission.tsx`:

```tsx
import type { ReactNode } from 'react'
import { usePermissions, type Permissions } from './permissions'

type Props = {
  check: (perms: Permissions) => boolean
  fallback?: ReactNode
  children: ReactNode
}

export function RequirePermission({ check, fallback = null, children }: Props) {
  const perms = usePermissions()
  return check(perms) ? <>{children}</> : <>{fallback}</>
}
```

Usage:
```tsx
// Hide Finance nav link from non-finance users
<RequirePermission check={p => p.canViewFinance}>
  <NavLink to="/finance">Finance</NavLink>
</RequirePermission>

// Show whole view or redirect
<RequirePermission
  check={p => p.canReseedDatabase}
  fallback={<p>Access denied.</p>}
>
  <AdminPanel />
</RequirePermission>
```

### 4.4 Hiding UI Elements

Use `usePermissions()` directly in components:

```tsx
function ProjectDetail() {
  const { canEditProjects, canDeleteProjects, canViewFinance } = usePermissions()

  return (
    <div>
      {canEditProjects && <button onClick={handleEdit}>Edit Project</button>}
      {canDeleteProjects && <button onClick={handleDelete}>Delete Project</button>}
      {canViewFinance && <FinancialSummaryPanel projectId={id} />}
    </div>
  )
}
```

**Do not conditionally render navigation items based on role without also enforcing server-side** — frontend guards are UX, not security.

### 4.5 UserSwitcher — Production Guard

Per the security audit (Finding 1.4), the `UserSwitcher` must be dev-only in production:

```tsx
// frontend/src/components/Layout.tsx
{import.meta.env.DEV && <UserSwitcher />}
```

In production, show a static user avatar with name and role, and a proper sign-out button that calls `signOut()`.

---

## 5. Migration Path

### Phase 1 — Header-Based (Current, Completeable Now)

**Goal:** Get proper server-side role enforcement without changing auth mechanism.

**Changes required:**

1. **`backend/src/trpc.ts`** — Add `authedProcedure`, `managerProcedure`, `oversightProcedure`, `adminProcedure` as described in Section 3.2. Extend `AppContext` with `userId` and `userName`.

2. **`backend/src/index.ts`** — Extend `createContext` to also extract `x-user-id` and `x-user-name` from headers (Phase 1 placeholder):
   ```ts
   createContext: ({ req }): AppContext => ({
     userId: req.headers.get('x-user-id') ?? null,
     userRole: req.headers.get('x-user-role') as Role | null,
     userName: req.headers.get('x-user-name') ?? null,
   })
   ```

3. **`backend/src/router/*.ts`** — Replace `publicProcedure` with the appropriate middleware per the table in Section 3.3.

4. **`frontend/src/trpc.ts`** — Send the additional headers:
   ```ts
   headers: () => ({
     'x-user-role': user?.role ?? '',
     'x-user-id': String(user?.id ?? ''),
     'x-user-name': user?.name ?? '',
   }),
   ```

5. **`frontend/src/auth/permissions.ts`** — Create the `usePermissions()` hook (new file).

6. **`frontend/src/auth/RequirePermission.tsx`** — Create the guard component (new file).

7. **`frontend/src/components/Layout.tsx`** — Gate `UserSwitcher` behind `import.meta.env.DEV`.

8. **`backend/src/seed/team.ts`** — Add an `admin` role user to the seed data (currently no admin exists; oversight is the highest seed role).

**Files NOT touched in Phase 1:** `frontend/src/auth/index.ts` (localStorage mechanism unchanged), all view components (permissions hook does the work).

---

### Phase 2 — AWS Cognito

**Goal:** Replace localStorage / header-based identity with verified JWTs.

**New dependencies:**
- Backend: `aws-jwt-verify` (AWS-maintained, no Lambda needed)
- Frontend: `@aws-amplify/auth` or `amazon-cognito-identity-js`

**Changes required:**

1. **AWS infrastructure** (Terraform in `terraform/`):
   - Cognito User Pool with groups: `coba-admin`, `coba-oversight`, `coba-manager`, `coba-finance`, `coba-user`
   - User Pool Client (app client) — no client secret (SPA flow: PKCE + Auth Code)
   - Identity Pool only if S3 direct upload from browser is needed

2. **`backend/src/index.ts` — `createContext`** — Replace header reading with JWT verification (see Section 2.2).

3. **`backend/src/trpc.ts` — `AppContext`** — Change `userId` from `number | null` to `string | null` (Cognito `sub` is a UUID string).

4. **`frontend/src/auth/index.ts`** — Swap the three exported functions:
   - `getCurrentUser()` → calls Amplify `fetchAuthSession()`, extracts claims
   - `setCurrentUser()` → becomes a no-op (delete or leave as stub)
   - `signOut()` → calls Amplify `signOut()`

5. **`frontend/src/trpc.ts`** — Change header from `x-user-role` to `Authorization: Bearer <token>`:
   ```ts
   headers: async () => {
     const session = await fetchAuthSession()
     const token = session.tokens?.accessToken?.toString()
     return token ? { authorization: `Bearer ${token}` } : {}
   }
   ```

6. **`frontend/src/App.tsx`** — Wrap the app in a Cognito-aware auth gate that redirects to Cognito Hosted UI or an embedded login form when `getCurrentUser()` returns null.

7. **Remove `UserSwitcher`** from the codebase entirely (dev tool only, no longer needed after Cognito).

**Files NOT touched in Phase 2:** All router files, all tRPC middleware, `usePermissions()` hook, `RequirePermission` component — these are stable across both phases.

---

## 6. Open Questions

These items require product or business decisions before implementation:

### Q1 — Should `manager` be a separate role, or should senior engineers just be `user` with project-specific grants?

The five-role model gives `manager` broad write access across all projects. In reality, a project manager at a consulting firm may only manage 2–3 specific projects. If per-project ownership is required ("this manager can only edit Project X"), the RBAC design needs a project-manager join table (similar to `project_team`) rather than a flat role. This would significantly increase implementation complexity.

**Decision needed:** Is role-based access sufficient (any manager can edit any project), or do we need project-scoped ownership?

---

### Q2 — Should `admin` be a real app user (a team member in the DB), or a super-admin account that exists only in Cognito?

Currently `team_members.role` drives the `UserSwitcher`. An `admin` user who is not a civil engineer has no meaningful team member profile. Options:

- **Option A:** Admin is a system account in Cognito only; they cannot log project time or appear on project teams. The COBA DB has no row for them.
- **Option B:** Admin is a regular team member with `role = 'admin'`, just like `finance` users today. They appear in the team list and can log time.

Option A is cleaner for separation of duties but requires two separate identity stores. Option B is simpler but conflates system administration with project participation.

**Decision needed:** Is a system-only admin account acceptable, or must the admin also be a billable team member?

---

### Q3 — What happens to `oversight` in the five-role model?

The current seed data has two `oversight` users and two `finance` users, but no `manager`. The jump from `user` (engineer) to `oversight` (director) skips the "project manager" level that most firms have. Confirm whether `manager` is a real internal role or if COBA's org structure is flat (engineer → director).

**Decision needed:** Is `manager` a role that real users will be assigned, or should the hierarchy stay at three roles (`user`, `finance`, `oversight`) and `admin` be added as a fourth?

---

### Q4 — Should `finance` be able to view but not mutate project details?

The current matrix gives `finance` read access to project list/detail (for cost attribution) but no write access. Some firms have finance staff who also maintain project records (e.g. billing codes, contract values). Confirm the scope.

**Decision needed:** Does the finance team need any write access to project fields (e.g. `budget`, `contractValue`, billing codes)?

---

## Appendix: Files To Create / Modify (Phase 1 Summary)

| File | Action | Purpose |
|------|--------|---------|
| `backend/src/trpc.ts` | Modify | Add 4 new procedures; extend `AppContext` |
| `backend/src/index.ts` | Modify | Extract `x-user-id`, `x-user-name` from headers in `createContext` |
| `backend/src/router/admin.ts` | Modify | `publicProcedure` → `adminProcedure` |
| `backend/src/router/projects.ts` | Modify | Mixed: `authedProcedure` / `managerProcedure` / `oversightProcedure` |
| `backend/src/router/team.ts` | Modify | Mixed: `authedProcedure` / `managerProcedure` |
| `backend/src/router/tasks.ts` | Modify | Mixed: `authedProcedure` / `managerProcedure` |
| `backend/src/router/timeEntries.ts` | Modify | Mixed: `authedProcedure` / `financeProcedure` |
| `backend/src/router/requirements.ts` | Modify | Mixed: `authedProcedure` / `managerProcedure` |
| `backend/src/router/companyTeams.ts` | Modify | All → `adminProcedure` |
| `backend/src/router/geo.ts` | Modify | Read → `authedProcedure`; write → `managerProcedure` |
| `backend/src/router/structures.ts` | Modify | Read → `authedProcedure`; write → `managerProcedure` |
| `backend/src/router/features.ts` | Modify | Read → `authedProcedure`; write → `managerProcedure` |
| `backend/src/seed/team.ts` | Modify | Add one `admin` role seed user |
| `frontend/src/auth/permissions.ts` | Create | `usePermissions()` hook |
| `frontend/src/auth/RequirePermission.tsx` | Create | Route/view guard component |
| `frontend/src/trpc.ts` | Modify | Send `x-user-id` + `x-user-name` headers |
| `frontend/src/components/Layout.tsx` | Modify | Gate `UserSwitcher` behind `import.meta.env.DEV` |
| `frontend/src/auth/index.ts` | Modify | Add `manager` and `admin` to `Role` type |
