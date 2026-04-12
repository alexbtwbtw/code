> **Archive note:** This plan was written on 2026-04-11 and has been implemented. The auth abstraction layer (`frontend/src/auth/index.ts`), `UserSwitcher` component, `role` column in `team_members`, `myProjects`/`riskSummary` backend procedures, and `UserHome`/`OversightHome` role-based home pages are all live. Refer to the source files for current state.

---

# AUTH_PLAN.md — Users, Roles & Auth Abstraction

**Author:** Architecture Agent  
**Date:** 2026-04-11  
**Status:** Implemented

---

## 1. Guiding Principles

- Users ARE team members. No separate `users` table is introduced.
- Local dev has zero real auth — a simple user-switcher in the UI backed by `localStorage`.
- The local switcher is hidden behind an abstraction layer (`getCurrentUser()`) that is trivially swappable for Cognito or any IdP later.
- Role determines home page content, not routing paths — `/` always exists, it renders differently per role.

---

## 2. Database Changes

### 2.1 Schema DDL — Add `role` to `team_members`

Add `role TEXT NOT NULL DEFAULT 'user'` and `password_hash TEXT DEFAULT NULL` to the `team_members` table in `backend/src/db/schema.ts`.

**Notes:**
- `role` defaults to `'user'` so all existing seeded members are automatically standard users.
- `password_hash` is `NULL` in local dev mode. In production (AWS), it is populated during Cognito-backed provisioning. It is never read by the frontend.
- Because the DB is `:memory:` (re-created on each server start), the DDL change takes effect immediately with no migration tooling needed.

### 2.2 Update `RawMember` type and `mapMember` in `backend/src/types/team.ts`

Add `role: string` to `RawMember`. Update `mapMember()` to cast `r.role` as `'user' | 'oversight'`.

---

## 3. Auth Abstraction Layer

### 3.1 `frontend/src/auth/index.ts`

Exports `CurrentUser` type and three public functions that are the AWS swap points:
- `getCurrentUser(): CurrentUser | null`
- `setCurrentUser(user: CurrentUser): void`
- `signOut(): void`

Also exports `useCurrentUser()` React hook (uses `useState` + `useEffect` to sync with `localStorage` across tabs).

**Key design:** Replace only the bodies of `getCurrentUser`, `setCurrentUser`, and `signOut` for Cognito — no other files change.

---

## 4. Local Dev User Switcher Component

### 4.1 `frontend/src/components/UserSwitcher.tsx`

- Avatar button in the topbar showing the current user's initials and role badge
- Clicking opens a dropdown listing all team members where `isUser === true`
- Selecting a member calls `switchUser()` and reloads the page
- On first load with no user in localStorage, auto-selects the first eligible member
- Rendered via `{import.meta.env.DEV && <UserSwitcher />}` in Layout so it is stripped in production builds

---

## 5. Role-Based Home Pages

`Home.tsx` reads the current user's role and renders either `UserHome` (scoped to the logged-in member's projects and tasks) or `OversightHome` (portfolio risk view with all active projects, overdue/blocked task counts, and a risk highlights section).

---

## 6. New Backend Procedures

- `projects.myProjects` — returns projects where the given `memberId` is in `project_team`
- `tasks.myOverdue` / `tasks.myNearDeadline` — filter overdue/near-deadline tasks by `task_assignments.team_member_id`
- `projects.riskSummary` — returns `Record<projectId, { overdueCount, blockedCount }>`

---

## 7. AWS Migration Path

Replace only the three exported function bodies in `frontend/src/auth/index.ts` with Cognito equivalents (`fetchAuthSession`, `getCurrentUser`, `signOut` from `@aws-amplify/auth`). Add Cognito custom attributes per user (`custom:memberId`, `custom:role`, `custom:title`). No view component changes required.

---

## 8. Out of Scope (Explicitly Deferred)

- Real password authentication (no login form, no session management)
- JWT verification on the backend (all procedures stay `publicProcedure`)
- Role-based access control on mutations
- Email/password registration flow
- Multi-tenancy or organization-level isolation
