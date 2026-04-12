> **Archive note:** This plan was written on 2026-04-11. The auth layer and `UserSwitcher` from Section 1 (non-user team members scaffolding) and parts of the CV flow have been partially implemented. However, the `is_user` column, `promoteToUser` procedure, `parseCvForMember` procedure, and `CvProposalCard` diff/accept flow described here have NOT yet been implemented as of 2026-04-12. This document remains a valid forward plan for those features.

---

# TEAM_MEMBER_REWORK_PLAN.md — Team Members Feature Rework

**Author:** Architecture & Docs Agent  
**Date:** 2026-04-11 14:40  
**Status:** Partially implemented — auth layer done; is_user column, promoteToUser, parseCvForMember, and CV diff/accept flow still pending

---

## Overview

This plan covers three discrete reworks to the team members feature:

1. **Non-user team members** — directory entries with no login account (`is_user` column + `isUser` field)
2. **Oversight user promotion flow** — oversight users can promote directory entries to real users (`team.promoteToUser`)
3. **AI CV diff/accept flow** — propose CV-extracted history changes before committing them (`team.parseCvForMember` + `CvProposalCard`)

These three features interact: a directory-entry member is the default state for every new member; promotion elevates them to a real user; CV parsing is the primary way history gets onto any member, whether user or directory entry.

---

## 1. Non-User Team Members

### 1.1 Proposed DB Changes

Add `is_user INTEGER NOT NULL DEFAULT 0` to `team_members` in `backend/src/db/schema.ts`.

| Condition | Meaning |
|---|---|
| `is_user = 0` | Directory entry — profile only, no login account |
| `is_user = 1` | Real user — account provisioned |

Default value semantics:

| Created via | `is_user` default |
|---|---|
| Manual form in TeamMembers.tsx | `0` |
| CV import (`parseCv` → `createWithHistory`) | `0` |
| Seed data — regular members | `0` |
| Seed data — oversight members (Margarida, Rui) | `1` |
| `team.promoteToUser` mutation | sets to `1` |

### 1.2 Backend Changes

- Add `is_user` to `RawMember` in `backend/src/types/team.ts`; expose as `isUser: r.is_user === 1` in `mapMember()`
- Add `isUser: z.boolean().default(false)` to `MemberInputSchema` in `backend/src/schemas/team.ts`
- Update `createMember` and `createWithHistory` in `backend/src/services/team.ts` to pass `is_user`

### 1.3 Frontend Changes

- `TeamMembers.tsx`: show `Diretório` / `Utilizador` badge on member cards
- `UserSwitcher.tsx`: filter dropdown to only members where `isUser === true`
- `TeamMemberDetail.tsx`: show role + `isUser` status chip in member hero section

---

## 2. Oversight User Promotion Flow

### 2.1 New Backend Procedure

`team.promoteToUser` in `backend/src/router/team.ts` — accepts `memberId`, `callerRole`, optional `email`. Delegates to `teamService.promoteToUser()` which checks `callerRole === 'oversight'`, sets `is_user = 1`, optionally updates `email`.

### 2.2 Frontend Changes

Add a `Promover a Utilizador` button in `TeamMemberDetail.tsx` hero section, visible only when `currentUser?.role === 'oversight'` AND `member.isUser === false`. Clicking opens a small inline confirm panel with an email field.

---

## 3. AI CV Diff/Accept Flow

### 3.1 New Backend Procedure

`team.parseCvForMember` — takes `pdfBase64` + `teamMemberId`, runs the same AI parse as `parseCv`, then compares proposed history entries against the member's existing history by exact `project_name` + `country` match (case-insensitive). Returns proposals tagged as `'new'` or `'update'` with `existingHistoryId`.

### 3.2 Frontend State Machine

In `TeamMemberDetail.tsx`, replace the flat CV upload button with a stateful flow:
```
idle → parsing → reviewing (CvProposalCard list) → saving → done
```

State type: `CvDiffState` with phases `idle | parsing | reviewing | saving | done | error`.

### 3.3 New Component: `CvProposalCard`

`frontend/src/components/CvProposalCard.tsx` — one card per proposed history entry, with `[NEW]`/`[ATUALIZAR]` badge, accept/reject buttons, and a "Ver entrada completa" link for update proposals.

### 3.4 i18n Keys

~25 new keys covering the diff banner, proposal cards, and parsing state messages.

---

## 4. Out of Scope (Explicitly Deferred)

- Real password generation or email delivery on promotion
- Fuzzy or AI-assisted duplicate matching in `parseCvForMember` (v1 uses exact name+country)
- Bulk CV analyse for multiple members at once
- CV diff for the new-member creation flow
- Role-based access control via JWT
- UI for downgrading a real user back to a directory entry
