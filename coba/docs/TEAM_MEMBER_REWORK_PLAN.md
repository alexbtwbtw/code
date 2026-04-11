# TEAM_MEMBER_REWORK_PLAN.md — Team Members Feature Rework

**Author:** Architecture & Docs Agent
**Date:** 2026-04-11 14:40
**Status:** Ready for implementation

---

## Overview

This plan covers three discrete reworks to the team members feature:

1. **Non-user team members** — directory entries with no login account
2. **Oversight user promotion flow** — oversight users can promote directory entries to real users
3. **AI CV diff/accept flow** — propose CV-extracted history changes before committing them

These three features interact: a directory-entry member is the default state for every new member; promotion elevates them to a real user; CV parsing is the primary way history gets onto any member, whether user or directory entry.

---

## 1. Non-User Team Members

### 1.1 Current State

Every row in `team_members` has `role TEXT NOT NULL DEFAULT 'user'`. The `password_hash` column already exists and defaults to `NULL`. The `mapMember()` function casts `role` to `'user' | 'oversight'`. There is no concept of a member who is purely a directory entry with no login account. The `UserSwitcher` (dev-only) lists every member in the dropdown, including ones who would logically never log in.

### 1.2 Proposed DB Changes

No new column is needed. The existing `password_hash` column already carries the semantic we need:

| Condition | Meaning |
|---|---|
| `role IN ('user','oversight')` AND `password_hash IS NULL` | **Directory entry** — has a role label but no login account (local dev: all members; prod: account not yet provisioned) |
| `role IN ('user','oversight')` AND `password_hash IS NOT NULL` | **Real user** — account provisioned (prod only; in local dev, `password_hash` is always NULL) |

However, relying on `password_hash IS NULL` to mean "directory entry" conflates two different concepts once we add the promotion flow. Introduce a dedicated boolean column instead:

```sql
ALTER TABLE team_members ADD COLUMN is_user INTEGER NOT NULL DEFAULT 0;
```

Because the DB is in-memory SQLite (recreated on every restart), this is just a DDL change in `backend/src/db/schema.ts`, not a migration.

**Default value semantics:**

| Created via | `is_user` default | Rationale |
|---|---|---|
| Manual form in TeamMembers.tsx | `0` (directory entry) | The form creates a staff profile; login is a separate step |
| CV import (`parseCv` → `createWithHistory`) | `0` (directory entry) | CV parsing does not provision credentials |
| Seed data — regular members | `0` | Most seeded members are profiles, not active accounts |
| Seed data — oversight members (Margarida, Rui) | `1` | Oversight users need the switcher to work on first boot |
| `team.promoteToUser` mutation | sets to `1` | Explicit promotion step |

The `role` column continues to mean `'user' | 'oversight'` as before. `is_user` is orthogonal: it says whether the person has an active account. A directory entry with `role = 'oversight'` is a valid state: it means the person is designated as an oversight-level contact but has not yet been provisioned.

### 1.3 Backend Changes

**`backend/src/db/schema.ts`**

Add `is_user INTEGER NOT NULL DEFAULT 0` to the `team_members` DDL block, after `password_hash`.

**`backend/src/types/team.ts`**

Add `is_user: number` to `RawMember`. Update `mapMember()` to expose `isUser: r.is_user === 1`.

```typescript
export function mapMember(r: RawMember) {
  return {
    id: r.id, name: r.name, title: r.title, email: r.email,
    phone: r.phone, bio: r.bio,
    role: r.role as 'user' | 'oversight',
    isUser: r.is_user === 1,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}
```

**`backend/src/services/team.ts`**

- `createMember`: insert with `is_user = 0` (default; can be overridden by callers that pass `isUser: true`).
- `createWithHistory`: same.
- New helper `setIsUser(memberId: number, value: boolean)` — used by the promote procedure.

**`backend/src/schemas/team.ts`**

Add optional `isUser: z.boolean().default(false)` to `MemberInputSchema` so seed code can create oversight users with `isUser: true`.

### 1.4 Frontend Changes

**`frontend/src/views/TeamMembers.tsx`**

- Member cards: show a badge `Diretório` / `Directory` (i18n key `memberBadgeDirectory`) when `m.isUser === false`. Real users show a `Utilizador` / `User` badge (key `memberBadgeUser`).
- CSS: `.member-card-badge--directory` (muted grey), `.member-card-badge--user` (blue tint).

**`frontend/src/components/UserSwitcher.tsx`**

Filter the team list to only show members where `m.isUser === true` before rendering the dropdown items. This prevents directory-only entries from appearing in the local dev user switcher.

```typescript
const switchableMembers = members?.filter(m => m.isUser) ?? []
```

**`frontend/src/views/TeamMemberDetail.tsx`**

In the member hero section, add a role+status line:
- `role` badge (`Utilizador` / `Supervisão`) always shown
- `isUser` indicator: real user shows a checkmark chip; directory entry shows `Entrada de Diretório` chip

### 1.5 i18n Keys

```typescript
memberBadgeDirectory:    'Entrada de Diretório'  // EN: 'Directory Entry'
memberBadgeUser:         'Utilizador'             // EN: 'User'
memberIsUser:            'Conta ativa'            // EN: 'Active account'
memberIsDirectory:       'Apenas diretório'       // EN: 'Directory only'
```

### 1.6 Per-Agent Task Breakdown

| Agent | Task |
|---|---|
| Features | Add `is_user` column to schema; update `RawMember`, `mapMember`, `createMember`, `createWithHistory`; add `setIsUser` helper |
| Seed Data | Set `is_user: 1` on Margarida Ferreira and Rui Monteiro; leave all other 28 members at `is_user: 0` |
| UI | Badge on member cards; filter UserSwitcher to `isUser === true`; hero chip in TeamMemberDetail |

---

## 2. Oversight User Promotion Flow

### 2.1 Current State

There is no way to elevate a directory entry to a real user through the UI. An oversight user cannot currently perform any privileged operations in the backend; all procedures use `publicProcedure`. Permission checks are deferred to the AWS phase, but the promotion action itself needs to exist now so the UI flow is complete and testable in local dev.

### 2.2 Proposed DB Changes

No new columns beyond those added in section 1. Promotion sets `is_user = 1` (and optionally `email` if missing). `password_hash` is left NULL in local dev; in the AWS extension, the caller would also receive a generated one-time password delivered out-of-band.

### 2.3 New Backend Procedure

**`backend/src/router/team.ts`** — add `team.promoteToUser`:

```typescript
promoteToUser: publicProcedure
  .input(z.object({
    memberId:      z.number().int(),
    callerRole:    z.enum(['oversight']),   // checked in service; real auth comes later
    email:         z.string().email().optional(),
  }))
  .mutation(({ input }) => teamService.promoteToUser(input))
```

**`backend/src/services/team.ts`** — add `promoteToUser()`:

```typescript
export function promoteToUser(input: { memberId: number; callerRole: 'oversight'; email?: string }) {
  if (input.callerRole !== 'oversight') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only oversight users can promote members.' })
  }
  const member = db.prepare(`SELECT * FROM team_members WHERE id = ?`).get(input.memberId) as RawMember | undefined
  if (!member) throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found.' })
  if (member.is_user === 1) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Member is already a user.' })

  const updates: Record<string, unknown> = { id: input.memberId }
  if (input.email) updates.email = input.email
  db.prepare(`
    UPDATE team_members
    SET is_user = 1${input.email ? ', email = @email' : ''}, updated_at = datetime('now')
    WHERE id = @id
  `).run(updates)

  return mapMember(db.prepare(`SELECT * FROM team_members WHERE id = ?`).get(input.memberId) as RawMember)
}
```

**Permission model (local dev vs. AWS):**

- Local dev: `callerRole` is passed by the frontend from `useCurrentUser()`. The backend checks it but cannot verify it cryptographically. This is acceptable for local dev.
- AWS: Replace `publicProcedure` with `protectedProcedure` that extracts and verifies the Cognito JWT; remove the `callerRole` input field (extract from context instead).

**Post-promotion actions (local dev):**

- Return the updated member object.
- No password is generated or sent — the newly promoted user is selected via `UserSwitcher` on next use.
- AWS extension point: after setting `is_user = 1`, call `cognitoAdmin.createUser({ email, temporaryPassword })` and note the generated password in a `promotionResult.temporaryPassword` field in the response. The UI renders it in a dismissible alert once.

### 2.4 Frontend Changes

**`frontend/src/views/TeamMemberDetail.tsx`**

Add a `Promover a Utilizador` button in the member hero section, visible only when all three conditions are true:
1. `currentUser?.role === 'oversight'`
2. `member.isUser === false`
3. `member.role !== 'oversight'` (promoting an oversight directory entry to an oversight user is a separate UX decision — keep it separate for clarity)

Button placement: in the `member-hero-top` row, after the `Editar` button.

Clicking opens a small inline confirm panel (not a modal, to avoid introducing a modal system):

```
┌──────────────────────────────────────────────────────────┐
│  Promover {name} a utilizador?                           │
│                                                          │
│  Email (obrigatório se em branco): [_______________]     │
│                                                          │
│       [Cancelar]        [Confirmar Promoção]             │
└──────────────────────────────────────────────────────────┘
```

On success:
- Invalidate the `team.byId` query so the hero refreshes.
- Show a green alert: `{name} foi promovido(a) a utilizador.`
- The `Promover a Utilizador` button disappears (member is now `isUser: true`).

**`frontend/src/api/team.ts`**

Add `usePromoteToUser()` hook wrapping `trpc.team.promoteToUser.useMutation()`.

### 2.5 i18n Keys

```typescript
promoteTitle:            'Promover a Utilizador'       // EN: 'Promote to User'
promoteConfirmMessage:   'Promover {name} a utilizador?'  // EN: 'Promote {name} to user?'
promoteEmailHint:        'Email (obrigatório se em branco)'  // EN: 'Email (required if blank)'
promoteConfirmBtn:       'Confirmar Promoção'           // EN: 'Confirm Promotion'
promoteCancelBtn:        'Cancelar'                     // EN: 'Cancel'
promoteSuccessMessage:   '{name} foi promovido(a) a utilizador.'  // EN: '{name} has been promoted to user.'
promoteErrorNotOversight: 'Apenas utilizadores de supervisão podem promover membros.'  // EN: 'Only oversight users can promote members.'
promoteErrorAlreadyUser: 'Este membro já é utilizador.'  // EN: 'This member is already a user.'
```

### 2.6 Per-Agent Task Breakdown

| Agent | Task |
|---|---|
| Features | Add `promoteToUser` to `services/team.ts` and `router/team.ts`; add `TRPCError` import |
| UI | Add `Promover a Utilizador` button + inline confirm panel in `TeamMemberDetail`; add `usePromoteToUser` hook in `api/team.ts`; guard visibility on `currentUser.role === 'oversight' && !member.isUser` |
| Architecture & Docs | — (this plan covers it) |

---

## 3. AI CV Diff/Accept Flow

### 3.1 Current State

The current `parseCv` flow is used only when **creating a new member** from the `TeamMembers` list view. It calls `trpcClient.team.parseCv.mutate({ pdfBase64 })`, receives a `ParsedCv` object (name, title, email, phone, bio, history), pre-fills the creation form, and lets the user edit before saving via `createWithHistory`. All history is accepted implicitly.

On an **existing member's detail page** (`TeamMemberDetail`), the CV section only attaches the raw PDF file via `team.attachCv`. There is no parsing or history import flow for existing members.

There is no diff mechanism anywhere: if a proposed history entry matches something already in the member's history, there is no indication, and it would be inserted as a duplicate.

### 3.2 Proposed DB Changes

None. All proposed changes are held transiently in frontend state and committed only on explicit per-entry accept. The existing `member_history` + sub-entry tables handle the final writes via the existing `addHistory` / `updateHistory` procedures.

### 3.3 New Backend Procedure

**Keep `team.parseCv` as-is** for the new-member creation flow in `TeamMembers.tsx` (it does not need match detection there because there is no existing history to compare against).

**Add `team.parseCvForMember`** — a new procedure that takes both a PDF and a `teamMemberId`, runs the same AI parse, then compares proposed entries against the member's existing history:

```typescript
parseCvForMember: publicProcedure
  .input(z.object({
    pdfBase64:    z.string(),
    teamMemberId: z.number().int(),
  }))
  .mutation(({ input }) => teamService.parseCvForMember(input))
```

**`backend/src/services/team.ts`** — add `parseCvForMember()`:

```typescript
export async function parseCvForMember(input: { pdfBase64: string; teamMemberId: number }) {
  const parsed = await parseCv(input.pdfBase64)
  // parsed.history is an array of CvHistoryEntry

  const existingRows = db.prepare(
    `SELECT id, project_name, country FROM member_history WHERE team_member_id = ?`
  ).all(input.teamMemberId) as { id: number; project_name: string; country: string }[]

  const proposals = parsed.history.map(entry => {
    const normalise = (s: string) => s.trim().toLowerCase()
    const match = existingRows.find(
      r => normalise(r.project_name) === normalise(entry.projectName)
        && normalise(r.country) === normalise(entry.country)
    )
    return {
      ...entry,
      matchType:        match ? 'update' : 'new',
      existingHistoryId: match?.id ?? null,
    }
  })

  return {
    memberName:  parsed.name,   // informational — not used to overwrite the member
    memberTitle: parsed.title,
    proposals,
  }
}
```

**Return type shape:**

```typescript
type CvProposal = {
  // all fields from CvHistoryEntry (projectName, country, macroRegion, category, etc.)
  matchType:         'new' | 'update'
  existingHistoryId: number | null   // set when matchType === 'update'
}

type ParseCvForMemberResult = {
  memberName:  string
  memberTitle: string
  proposals:   CvProposal[]
}
```

**Match heuristic (v1):** exact `project_name` + `country` match (case-insensitive, trimmed). This is intentionally simple. A future v2 could use fuzzy matching or ask Claude to identify duplicates.

### 3.4 Frontend State Machine

In `TeamMemberDetail.tsx`, replace the current flat CV upload button with a stateful flow:

```
idle
  → [user clicks "Analisar CV com IA"]
parsing  (spinner shown)
  → [parseCvForMember resolves]
reviewing  (CvProposalCard list shown)
  → [user accepts/rejects each card; clicks "Guardar Aceites"]
saving  (spinner shown while addHistory / updateHistory calls complete)
  → [all mutations settled]
done  (success alert; list invalidated; revert to idle)
```

State type:

```typescript
type CvDiffState =
  | { phase: 'idle' }
  | { phase: 'parsing' }
  | { phase: 'reviewing'; proposals: CvProposal[]; accepted: Set<number>; memberName: string }
  | { phase: 'saving'; accepted: CvProposal[] }
  | { phase: 'done'; savedCount: number }
  | { phase: 'error'; message: string }
```

Transitions are driven by a `useCvDiff` custom hook in `frontend/src/api/team.ts` (or a co-located hook in the view — the UI Agent decides; the hook signature is the contract):

```typescript
function useCvDiff(memberId: number) {
  // state: CvDiffState
  // actions:
  //   startParse(pdfBase64: string): void
  //   toggleAccept(index: number): void
  //   saveAccepted(): Promise<void>
  //   reset(): void
}
```

### 3.5 UI Components

**New component: `CvProposalCard`** — `frontend/src/components/CvProposalCard.tsx`

Each card represents one proposed history entry. Props:

```typescript
type CvProposalCardProps = {
  proposal:   CvProposal
  isAccepted: boolean
  onToggle:   () => void
}
```

Layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  [NEW] / [ATUALIZAR]  badge   project_name · country · category │
│  dates: startDate — endDate                                      │
│  notes (truncated to 2 lines)                                    │
│  — IF matchType === 'update' ——————————————————————————————————  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Entrada existente: project_name · country               │   │
│  │  [Ver entrada completa ↗]                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  — structures chips (if any) ──────────────────────────────────  │
│                                          [Rejeitar] [Aceitar ✓] │
└─────────────────────────────────────────────────────────────────┘
```

- `[NEW]` badge: green tint (`.cv-proposal-badge--new`)
- `[ATUALIZAR]` badge: amber tint (`.cv-proposal-badge--update`)
- Accepted card: highlighted border (`.cv-proposal-card--accepted`)
- Rejected card: muted / greyed out (`.cv-proposal-card--rejected`)
- The "Ver entrada completa" link opens the existing history card in place (scroll-into-view); this does not require new routing.

**Changes in `TeamMemberDetail.tsx` — CV section:**

Replace the existing CV upload row with a two-button row:

```
[📎 Anexar PDF]   [🤖 Analisar CV com IA]
```

`Anexar PDF` remains the existing `attachCv` flow (store raw PDF).
`Analisar CV com IA` triggers `parseCvForMember` and enters the state machine.

When `phase === 'reviewing'`:
- Show a `CvDiffBanner` above the history section:
  ```
  Análise de CV — {n} entradas propostas ({accepted} aceites)   [Guardar Aceites ({accepted})]  [Cancelar]
  ```
- Render `CvProposalCard` for each proposal, interspersed with or above the existing history list (UI Agent decides on exact placement — suggested: a separate collapsible section above the history list).

When `phase === 'saving'`:
- Banner shows a spinner: `A guardar {n} entradas...`
- Cards are non-interactive.

When `phase === 'done'`:
- Green alert: `{savedCount} entradas guardadas com sucesso.`
- Auto-reset to `idle` after 4 seconds.

**Partial saves:**

A "partial save" is simply the natural result of the accept/reject model. The user may accept 3 of 5 proposals and click "Guardar Aceites (3)". The saving phase calls:
- `team.addHistory` for each proposal where `matchType === 'new'` AND accepted
- `team.updateHistory` for each proposal where `matchType === 'update'` AND accepted

These mutations already exist. Rejected proposals are discarded with no DB write. There is no rollback concept — each accepted entry is saved independently. If one fails, the others still succeed; the error is shown per-entry (or as a count in the banner).

**New member creation flow (TeamMembers.tsx) — unchanged:**

The existing `parseCv` → `createWithHistory` flow in `TeamMembers.tsx` is not modified. The diff/accept UX is only for existing members.

### 3.6 i18n Keys

```typescript
// CV analysis button
cvAnalyseBtn:              'Analisar CV com IA'            // EN: 'Analyse CV with AI'

// Banner
cvDiffBannerTitle:         'Análise de CV'                 // EN: 'CV Analysis'
cvDiffBannerProposals:     '{n} entradas propostas'        // EN: '{n} proposed entries'
cvDiffBannerAccepted:      '{n} aceites'                   // EN: '{n} accepted'
cvDiffSaveBtn:             'Guardar Aceites ({n})'         // EN: 'Save Accepted ({n})'
cvDiffCancelBtn:           'Cancelar Análise'              // EN: 'Cancel Analysis'
cvDiffSavingMsg:           'A guardar {n} entradas...'     // EN: 'Saving {n} entries...'
cvDiffDoneMsg:             '{n} entradas guardadas com sucesso.'  // EN: '{n} entries saved successfully.'

// Proposal cards
cvProposalBadgeNew:        'Nova entrada'                  // EN: 'New entry'
cvProposalBadgeUpdate:     'Atualizar existente'           // EN: 'Update existing'
cvProposalExistingLabel:   'Entrada existente'             // EN: 'Existing entry'
cvProposalViewExisting:    'Ver entrada completa ↗'        // EN: 'View full entry ↗'
cvProposalAcceptBtn:       'Aceitar'                       // EN: 'Accept'
cvProposalRejectBtn:       'Rejeitar'                      // EN: 'Reject'
cvProposalAccepted:        'Aceite'                        // EN: 'Accepted'
cvProposalRejected:        'Rejeitado'                     // EN: 'Rejected'

// Parsing state
cvDiffParsing:             'A analisar CV...'              // EN: 'Analysing CV...'
cvDiffErrorGeneric:        'Erro ao analisar CV. Tente novamente.'  // EN: 'Error analysing CV. Please try again.'
```

### 3.7 Per-Agent Task Breakdown

| Agent | Task |
|---|---|
| Features | Add `parseCvForMember()` to `services/team.ts`; add `team.parseCvForMember` procedure to `router/team.ts`; export return type |
| UI | Add `useCvDiff` hook; add `CvProposalCard` component + CSS; rework CV section in `TeamMemberDetail` with two-button row + diff banner + proposal list; add all i18n keys |
| Architecture & Docs | — (this plan covers it) |
| Testing | Add E2E journey: upload CV on existing member → review proposals → accept 2 of N → verify history updated |

---

## 4. Cross-Cutting Concerns

### 4.1 Type safety

`CvProposal` and `ParseCvForMemberResult` should be exported from `backend/src/types/team.ts` (or a new `backend/src/types/cvDiff.ts`) so the frontend can import them via the `@backend` path alias without duplicating the shape.

### 4.2 Auth guard on `promoteToUser`

In local dev the `callerRole` field is sent by the frontend. In AWS, this field is removed and the role is extracted from the verified JWT in the tRPC context. The service function signature should already accept `callerRole` so the only AWS change is how it is populated — the Features Agent should accept it as a service parameter, not couple it to the tRPC input schema.

A suggested service signature that allows both call sites:

```typescript
export function promoteToUser(
  input: { memberId: number; email?: string },
  callerRole: 'user' | 'oversight'
): ReturnType<typeof mapMember>
```

The router passes `callerRole` from either the input (local dev) or the context (AWS) when calling the service.

### 4.3 `suggestMembers` filtering

The `suggestMembers` procedure currently returns all members regardless of `is_user`. No change needed — the requirement-matching feature should consider all staff, including directory-only entries, as potential matches.

### 4.4 UserSwitcher auto-bootstrap

`UserSwitcher.tsx` currently auto-selects the first member on first load. After section 1, it must auto-select the first member where `isUser === true`. If no members have `isUser === true` (edge case on a blank DB), fall back to the first member and log a console warning.

### 4.5 Seed data

- All 28 regular members: `is_user = 0`
- Margarida Ferreira and Rui Monteiro (oversight): `is_user = 1`
- No change needed to history, CVs, or project tags

---

## 5. Implementation Order

1. **Features Agent** — DB schema (`is_user` column); `mapMember` update; `promoteToUser` service + router; `parseCvForMember` service + router.
2. **Seed Data Agent** — Set `is_user = 1` on the two oversight members.
3. **UI Agent** — `CvProposalCard` component and CSS; `useCvDiff` hook; rework `TeamMemberDetail` CV section and add promote button; update `UserSwitcher` filter; update member card badges in `TeamMembers`.

No frontend work depends on seed data changes, but the UserSwitcher filter (section 1.4) requires the seed data change to show any members in the switcher on first boot.

---

## 6. File Change Summary

| File | Change | Owner |
|------|--------|-------|
| `backend/src/db/schema.ts` | Add `is_user INTEGER NOT NULL DEFAULT 0` to `team_members` | Features |
| `backend/src/types/team.ts` | Add `is_user` to `RawMember`; update `mapMember` to expose `isUser`; export `CvProposal` + `ParseCvForMemberResult` types | Features / Architecture |
| `backend/src/schemas/team.ts` | Add `isUser: z.boolean().default(false)` to `MemberInputSchema` | Features |
| `backend/src/services/team.ts` | Add `setIsUser()`, `promoteToUser()`, `parseCvForMember()`; update `createMember` and `createWithHistory` to pass `is_user` | Features |
| `backend/src/router/team.ts` | Add `team.promoteToUser` and `team.parseCvForMember` procedures | Features |
| `backend/src/seed/team.ts` | Set `is_user: 1` on Margarida Ferreira and Rui Monteiro | Seed Data |
| `frontend/src/components/CvProposalCard.tsx` | **New** — proposal card component | UI |
| `frontend/src/components/UserSwitcher.tsx` | Filter to `isUser === true` members only | UI |
| `frontend/src/views/TeamMembers.tsx` | Add directory/user badge on member cards | UI |
| `frontend/src/views/TeamMemberDetail.tsx` | Add `Promover a Utilizador` button + confirm panel; rework CV section with analyse button + diff banner + proposal list | UI |
| `frontend/src/api/team.ts` | Add `usePromoteToUser()`, `useParseCvForMember()`, `useCvDiff()` hooks | UI |
| `frontend/src/index.css` | Add `.cv-proposal-*`, `.member-card-badge--*`, `.cv-diff-banner` CSS rules | UI |
| `frontend/src/i18n/en.ts` + `pt.ts` | Add ~25 new keys (sections 1.5, 2.5, 3.6) | UI |

---

## 7. Out of Scope (Explicitly Deferred)

- Real password generation or email delivery on promotion (noted as AWS extension point only)
- Fuzzy or AI-assisted duplicate matching in `parseCvForMember` (v1 uses exact name+country match)
- Bulk CV analyse for multiple members at once
- CV diff for the new-member creation flow (the existing `parseCv` → `createWithHistory` flow is retained as-is)
- Role-based access control via JWT (all procedures remain `publicProcedure` until AWS phase)
- UI for downgrading a real user back to a directory entry
