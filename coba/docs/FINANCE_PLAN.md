# Finance Tracking — Design Plan

**Status:** Ready for implementation  
**Author:** Architecture & Docs Agent  
**Date:** 2026-04-13  
**Target agents:** Features Agent, Reporting Agent

---

## 1. New DB Tables

### 1.1 `member_rates` — Team member hourly rate history

Stores the full history of hourly rates for a team member, allowing rates to change over time (e.g. after a salary review). Each row represents a rate that is effective from `effective_from` until superseded by a newer row.

```sql
CREATE TABLE IF NOT EXISTS member_rates (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id      INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  hourly_rate    REAL    NOT NULL CHECK(hourly_rate >= 0),
  currency       TEXT    NOT NULL DEFAULT 'EUR',
  effective_from TEXT    NOT NULL,          -- ISO date YYYY-MM-DD, inclusive
  notes          TEXT    NOT NULL DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Index to speed up "current rate for member" lookups
CREATE INDEX IF NOT EXISTS idx_member_rates_member_effective
  ON member_rates(member_id, effective_from DESC);
```

**Design rationale:**
- A member can have multiple rate rows. The "current rate" is the one with the highest `effective_from` that is `<= today`.
- `currency` is stored per-rate row to handle currency changes (uncommon but possible).
- No `effective_to` column — the end of a rate period is implicitly the `effective_from` of the next row for the same member. This avoids duplication and prevents overlap bugs.
- `notes` allows documenting the reason for a rate change (e.g. "2026 salary review").

**Query pattern for "rate at a point in time":**
```sql
SELECT hourly_rate, currency
FROM member_rates
WHERE member_id = ? AND effective_from <= ?
ORDER BY effective_from DESC
LIMIT 1;
```

---

### 1.2 `project_fixed_costs` — Non-labor cost entries per project

Each row is a discrete cost item (invoice, expense, purchase order) attached to a project.

```sql
CREATE TABLE IF NOT EXISTS project_fixed_costs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT    NOT NULL,
  amount      REAL    NOT NULL CHECK(amount >= 0),
  currency    TEXT    NOT NULL DEFAULT 'EUR',
  cost_date   TEXT    NOT NULL,            -- ISO date YYYY-MM-DD
  category    TEXT    NOT NULL DEFAULT 'other',
  notes       TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast per-project lookups
CREATE INDEX IF NOT EXISTS idx_project_fixed_costs_project
  ON project_fixed_costs(project_id, cost_date DESC);
```

**`category` enum values** (enforced in application layer via Zod):
- `materials` — physical materials and supplies
- `subcontractor` — third-party specialist firms
- `equipment` — machinery rental or purchase
- `travel` — transport, accommodation, subsistence
- `permits` — regulatory fees, licences, stamps
- `survey` — topographic, geotechnical, environmental surveys commissioned externally
- `software` — licences, cloud services
- `other` — catch-all

**Design notes:**
- `currency` per row supports multi-currency projects. The reporting layer converts to a reference currency (see Open Questions §8 below).
- No `quantity` + `unit_price` split — amount is the total cost for that line item, keeping the schema simple.
- `cost_date` is the date the cost was incurred (invoice date or purchase date), not the payment date.

---

## 2. Changes to Existing Tables

### 2.1 `team_members` — No column changes needed

The current rate is derived from `member_rates` via a lookup. Adding `hourly_rate` directly to `team_members` would create a redundancy with the history table. **Do not add a column here.** The service layer will expose a `currentRate` field on the member object by joining `member_rates`.

### 2.2 `projects` — No column changes needed

The `budget` (REAL) and `currency` (TEXT) columns already exist. The finance system will use `budget` as the "target budget" for the budget-vs-actual comparison.

### 2.3 `time_entries` — No column changes needed

The existing schema (`project_id`, `member_id`, `date`, `hours`) is sufficient. Labor cost is computed at query time by joining `time_entries` with `member_rates` (using the rate effective at `time_entries.date`), so no `hourly_rate` snapshot is stored on the entry itself.

**Important design choice:** We do NOT snapshot the rate onto each time entry. This means if a member's rate changes, historical labor cost calculations for past entries will reflect the new rate, not the rate at the time of logging. This is simpler and adequate for a project management tool (not a payroll system). See Open Questions §8.4 if a snapshot approach is preferred.

---

## 3. New Backend Services

### 3.1 `backend/src/services/finance.ts` (new file)

All financial computation lives here. The router delegates to these functions.

#### `getMemberCurrentRate(memberId: number, asOfDate?: string)`
```
SQL:
  SELECT mr.hourly_rate, mr.currency
  FROM member_rates mr
  WHERE mr.member_id = :memberId
    AND mr.effective_from <= :asOfDate
  ORDER BY mr.effective_from DESC
  LIMIT 1

Returns: { hourlyRate: number; currency: string } | null
```

#### `getMemberRateHistory(memberId: number)`
```
SQL:
  SELECT * FROM member_rates WHERE member_id = ? ORDER BY effective_from DESC

Returns: MemberRate[]
```

#### `setMemberRate(memberId: number, hourlyRate: number, currency: string, effectiveFrom: string, notes: string)`
```
SQL:
  INSERT INTO member_rates (member_id, hourly_rate, currency, effective_from, notes)
  VALUES (?, ?, ?, ?, ?)

Returns: MemberRate (the newly inserted row)
```

#### `deleteMemberRate(rateId: number)`
```
SQL: DELETE FROM member_rates WHERE id = ?
Guard: Reject if this is the only rate for the member (frontend should confirm).
```

#### `getProjectLaborCost(projectId: number)`
```
Computes: SUM over time_entries for project, using rate effective at entry.date
SQL (conceptual — uses correlated subquery for rate lookup):
  SELECT
    te.id,
    te.member_id,
    tm.name AS member_name,
    te.date,
    te.hours,
    COALESCE((
      SELECT mr.hourly_rate
      FROM member_rates mr
      WHERE mr.member_id = te.member_id
        AND mr.effective_from <= te.date
      ORDER BY mr.effective_from DESC
      LIMIT 1
    ), 0) AS hourly_rate,
    te.hours * COALESCE((
      SELECT mr.hourly_rate
      FROM member_rates mr
      WHERE mr.member_id = te.member_id
        AND mr.effective_from <= te.date
      ORDER BY mr.effective_from DESC
      LIMIT 1
    ), 0) AS labor_cost
  FROM time_entries te
  JOIN team_members tm ON tm.id = te.member_id
  WHERE te.project_id = ?

Returns: {
  entries: Array<{ entryId, memberId, memberName, date, hours, hourlyRate, laborCost }>,
  totalLaborCost: number,
  totalHours: number,
  membersWithNoRate: string[]   -- names of members who have entries but no rate set
}
```

#### `getProjectFixedCosts(projectId: number)`
```
SQL: SELECT * FROM project_fixed_costs WHERE project_id = ? ORDER BY cost_date DESC

Returns: FixedCost[]
```

#### `getProjectFinancialSummary(projectId: number)`
```
Combines labor + fixed costs.
Returns: {
  projectId: number,
  budget: number | null,
  budgetCurrency: string,
  laborCost: number,
  fixedCost: number,
  totalCost: number,
  variance: number | null,       -- budget - totalCost (null if no budget set)
  variancePct: number | null,    -- variance / budget * 100
  membersWithNoRate: string[],
  fixedCostByCategory: Record<string, number>
}
```

#### `getMemberCostSummary(memberId: number)`
```
SQL: Joins time_entries with rate lookup for all projects.
Returns: {
  memberId: number,
  memberName: string,
  currentRate: number | null,
  currentRateCurrency: string | null,
  totalHours: number,
  totalLaborCost: number,
  byProject: Array<{
    projectId: number,
    projectName: string,
    hours: number,
    laborCost: number
  }>
}
```

#### `getCompanyFinancials(options: { fromDate?: string; toDate?: string })`
```
Aggregates across all projects for the company-wide dashboard.
Returns: {
  totalLaborCost: number,
  totalFixedCost: number,
  totalCost: number,
  totalBudget: number,
  projectCount: number,
  byMonth: Array<{
    month: string,    -- YYYY-MM
    laborCost: number,
    fixedCost: number
  }>,
  byCategory: Array<{
    category: string,
    fixedCost: number
  }>,
  topProjectsBySpend: Array<{
    projectId: number,
    projectName: string,
    totalCost: number,
    budget: number | null,
    variancePct: number | null
  }>
}
```

#### Fixed cost CRUD functions

```
createFixedCost(input)
updateFixedCost(input)   -- id + partial fields
deleteFixedCost(id)
```

---

### 3.2 `backend/src/db/statements/finance.ts` (new file)

Pre-compiled better-sqlite3 statements for the finance service. Pattern mirrors `backend/src/db/statements/team.ts`.

```typescript
export const insertMemberRate = db.prepare(`
  INSERT INTO member_rates (member_id, hourly_rate, currency, effective_from, notes)
  VALUES (@member_id, @hourly_rate, @currency, @effective_from, @notes)
`)

export const insertFixedCost = db.prepare(`
  INSERT INTO project_fixed_costs
    (project_id, description, amount, currency, cost_date, category, notes)
  VALUES
    (@project_id, @description, @amount, @currency, @cost_date, @category, @notes)
`)

export const updateFixedCost = db.prepare(`
  UPDATE project_fixed_costs
  SET description = @description,
      amount      = @amount,
      currency    = @currency,
      cost_date   = @cost_date,
      category    = @category,
      notes       = @notes,
      updated_at  = datetime('now')
  WHERE id = @id
`)

export const deleteFixedCost = db.prepare(`
  DELETE FROM project_fixed_costs WHERE id = ?
`)

export const deleteMemberRate = db.prepare(`
  DELETE FROM member_rates WHERE id = ?
`)
```

---

## 4. New tRPC Procedures

### 4.1 `backend/src/router/finance.ts` (new router file)

```typescript
import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import * as financeService from '../services/finance'

const FixedCostCategoryEnum = z.enum([
  'materials', 'subcontractor', 'equipment',
  'travel', 'permits', 'survey', 'software', 'other'
])

export const financeRouter = router({

  // ── Member rates ─────────────────────────────────────────────────

  getMemberRates: publicProcedure
    .input(z.object({ memberId: z.number().int() }))
    // Returns: MemberRate[] ordered by effective_from DESC
    .query(({ input }) => financeService.getMemberRateHistory(input.memberId)),

  getMemberCurrentRate: publicProcedure
    .input(z.object({ memberId: z.number().int(), asOfDate: z.string().optional() }))
    // Returns: { hourlyRate, currency } | null
    .query(({ input }) => financeService.getMemberCurrentRate(input.memberId, input.asOfDate)),

  setMemberRate: publicProcedure
    .input(z.object({
      memberId:      z.number().int(),
      hourlyRate:    z.number().nonnegative(),
      currency:      z.string().default('EUR'),
      effectiveFrom: z.string().min(1),          // YYYY-MM-DD
      notes:         z.string().default(''),
    }))
    // Returns: MemberRate (the inserted row)
    .mutation(({ input }) => financeService.setMemberRate(
      input.memberId, input.hourlyRate, input.currency, input.effectiveFrom, input.notes
    )),

  deleteMemberRate: publicProcedure
    .input(z.object({ id: z.number().int() }))
    // Returns: { success: true }
    .mutation(({ input }) => financeService.deleteMemberRate(input.id)),

  // ── Project fixed costs ─────────────────────────────────────────

  getProjectFixedCosts: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    // Returns: FixedCost[]
    .query(({ input }) => financeService.getProjectFixedCosts(input.projectId)),

  createFixedCost: publicProcedure
    .input(z.object({
      projectId:   z.number().int(),
      description: z.string().min(1),
      amount:      z.number().nonnegative(),
      currency:    z.string().default('EUR'),
      costDate:    z.string().min(1),
      category:    FixedCostCategoryEnum.default('other'),
      notes:       z.string().default(''),
    }))
    // Returns: FixedCost
    .mutation(({ input }) => financeService.createFixedCost(input)),

  updateFixedCost: publicProcedure
    .input(z.object({
      id:          z.number().int(),
      description: z.string().min(1).optional(),
      amount:      z.number().nonnegative().optional(),
      currency:    z.string().optional(),
      costDate:    z.string().optional(),
      category:    FixedCostCategoryEnum.optional(),
      notes:       z.string().optional(),
    }))
    // Returns: FixedCost
    .mutation(({ input }) => financeService.updateFixedCost(input)),

  deleteFixedCost: publicProcedure
    .input(z.object({ id: z.number().int() }))
    // Returns: { success: true }
    .mutation(({ input }) => financeService.deleteFixedCost(input.id)),

  // ── Aggregated financial summaries ─────────────────────────────

  projectFinancialSummary: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    // Returns: ProjectFinancialSummary (see §3.1)
    .query(({ input }) => financeService.getProjectFinancialSummary(input.projectId)),

  memberCostSummary: publicProcedure
    .input(z.object({ memberId: z.number().int() }))
    // Returns: MemberCostSummary (see §3.1)
    .query(({ input }) => financeService.getMemberCostSummary(input.memberId)),

  companyFinancials: publicProcedure
    .input(z.object({
      fromDate: z.string().optional(),
      toDate:   z.string().optional(),
    }).optional())
    // Returns: CompanyFinancials (see §3.1)
    .query(({ input }) => financeService.getCompanyFinancials(input ?? {})),
})
```

### 4.2 Register router in `backend/src/router/index.ts`

Add `finance: financeRouter` to the root `AppRouter`. The Features agent must import `financeRouter` and include it in the merged router alongside the existing routers.

### 4.3 Frontend API hooks — `frontend/src/api/finance.ts` (new file)

```typescript
// Mirrors the pattern in frontend/src/api/timeEntries.ts

export function useProjectFixedCosts(projectId: number) { ... }
export function useProjectFinancialSummary(projectId: number) { ... }
export function useMemberRates(memberId: number) { ... }
export function useMemberCurrentRate(memberId: number) { ... }
export function useMemberCostSummary(memberId: number) { ... }
export function useCompanyFinancials(opts?: { fromDate?: string; toDate?: string }) { ... }

// Mutations
export function useCreateFixedCost() { ... }
export function useUpdateFixedCost() { ... }
export function useDeleteFixedCost() { ... }
export function useSetMemberRate() { ... }
export function useDeleteMemberRate() { ... }
```

---

## 5. New Frontend Views / Sections

### 5.1 Finance tab in `ProjectDetail` (highest priority)

**File:** `frontend/src/views/ProjectDetail.tsx`

Add a new tab labeled "Finanças" / "Finance" alongside the existing tabs (Geo, Structures, Features, Team, Tasks, Time Entries). This tab contains:

**Section A — Financial Summary bar**
- KPI cards: Total Labor Cost | Fixed Costs | Total Spend | Budget | Variance (color-coded: green if under budget, red if over)
- Small warning banner if any team members on the project have no rate set (link to their profile)

**Section B — Labor Cost Breakdown table**
- Columns: Member name | Hours | Rate (€/h) | Labor Cost | % of total
- Rows per team member assigned to the project
- Footer row: Totals

**Section C — Fixed Costs list**
- Card-style rows (matches existing time-entry card style)
- Each row: date chip | category badge | description | amount + currency | edit/delete buttons
- "Add fixed cost" button → inline expand form or modal with fields: description, amount, currency (dropdown: EUR/USD/GBP/MZN/AOA/MWK), date, category (dropdown), notes

### 5.2 Finance section in `TeamMemberDetail`

**File:** `frontend/src/views/TeamMemberDetail.tsx`

Add a "Taxas & Custos" / "Rates & Costs" section (collapsible panel, below the existing CV section):

**Rate history table:**
- Columns: Effective from | Rate | Currency | Notes | Delete button
- "Add rate" form inline: date picker, rate input, currency dropdown, notes

**Cost summary cards:**
- Total hours (all projects) | Total labor cost computed at each entry's applicable rate

### 5.3 New top-level view: `FinancialReport` (`/finance`)

**File:** `frontend/src/views/FinancialReport.tsx` (new file)

This view is equivalent to `TimeReport.tsx` but focused on money, not hours. It is accessible from the nav alongside "Time Report."

**Sections:**

**KPI row:**
- Total company labor spend | Total company fixed spend | Total company spend | Total budget | Overall variance

**Date range filter** (from/to date pickers — defaults to current year)

**By-project table:**
- Columns: Project name | Labor cost | Fixed cost | Total cost | Budget | Variance | Variance %
- Color coding on variance column
- Bar chart column showing spend vs budget

**By-category chart (fixed costs):**
- Simple bar or table: category | total spend across all projects

**By-month trend (combined chart):**
- Month | Labor spend | Fixed spend | Total
- Rendered as a simple bar/table (matching the existing `ReportTable` component style in `Reports.tsx`)

**Members with no rate alert:**
- List of team members who have time entries but no rate configured — links to their profile

### 5.4 Navigation update

**File:** `frontend/src/components/Layout.tsx`

Add "Finanças" / "Finance" nav item pointing to `{ view: 'finance-report' }`.

**File:** `frontend/src/types/pages.ts`

Add `| { view: 'finance-report' }` to the `Page` union, `pageToPath` mapping to `/finance`, and `pathToPage` handling for `/finance`.

**File:** `frontend/src/App.tsx`

Add `{page.view === 'finance-report' && <FinancialReport />}`.

**File:** `frontend/src/i18n/en.ts` and `pt.ts`

Add nav key `navFinance: 'Finance'` / `'Finanças'` and all new label keys (see §5.5 below).

### 5.5 Required i18n keys

All keys must be added to both `en.ts` and `pt.ts`.

```
financeTabLabel           Finance / Finanças
financeTabRates           Rates & Costs / Taxas & Custos
financeSummaryTitle       Financial Summary / Resumo Financeiro
financeLaborCost          Labor Cost / Custo de Mão-de-Obra
financeFixedCosts         Fixed Costs / Custos Fixos
financeTotalSpend         Total Spend / Gasto Total
financeBudget             Budget / Orçamento
financeVariance           Variance / Variação
financeUnderBudget        Under budget / Abaixo do orçamento
financeOverBudget         Over budget / Acima do orçamento
financeNoRateWarning      Some team members have no rate set / Alguns membros não têm taxa definida
financeHourlyRate         Hourly Rate / Taxa Horária
financeEffectiveFrom      Effective From / Vigente a partir de
financeAddRate            Add Rate / Adicionar Taxa
financeRateHistory        Rate History / Histórico de Taxas
financeAddFixedCost       Add Cost / Adicionar Custo
financeFixedCostDesc      Description / Descrição
financeFixedCostAmount    Amount / Valor
financeFixedCostDate      Cost Date / Data do Custo
financeFixedCostCategory  Category / Categoria
financeFixedCostNotes     Notes / Notas
financeCatMaterials       Materials / Materiais
financeCatSubcontractor   Subcontractor / Subcontratado
financeCatEquipment       Equipment / Equipamento
financeCatTravel          Travel / Deslocação
financeCatPermits         Permits / Licenças e Taxas
financeCatSurvey          Survey / Prospeções Externas
financeCatSoftware        Software / Software
financeCatOther           Other / Outro
financeByProject          By Project / Por Projeto
financeByCategory         By Category / Por Categoria
financeByMonth            Monthly Trend / Tendência Mensal
financeNoRateMembers      Members without rates / Membros sem taxa
navFinance                Finance / Finanças
financeReportTitle        Financial Report / Relatório Financeiro
financeReportSubtitle     Company-wide cost and budget overview / Visão geral de custos e orçamentos
```

---

## 6. Seed Data

### 6.1 `backend/src/seed/finance.ts` (new file)

This file seeds member rates and project fixed costs. It is called from the main seed orchestrator (`backend/src/seed/index.ts` or equivalent entry point) after `seedTeam()` and `seedProjects()`.

**Member rates** — assign rates to the 4 seeded team members (member IDs 1–4 from `seed/team.ts`). Use realistic Portuguese civil engineering day-rate equivalents divided by 8 for hourly:

```
António Ressano Garcia (member 1) — Senior Geotechnical Engineer
  Rate A: €85/h, EUR, effective 2020-01-01, notes: 'Initial rate'
  Rate B: €95/h, EUR, effective 2024-01-01, notes: '2024 salary review'

[Member 2 — Structural Engineer, assumed from seeding order]
  Rate A: €80/h, EUR, effective 2021-06-01, notes: 'Initial rate'
  Rate B: €90/h, EUR, effective 2025-01-01, notes: '2025 salary review'

[Member 3 — Hydraulics Engineer]
  Rate A: €75/h, EUR, effective 2022-01-01, notes: 'Initial rate'

[Member 4 — Environmental Engineer]
  Rate A: €70/h, EUR, effective 2023-03-01, notes: 'Initial rate'
```

Note: Because the seed team has 30+ members (the seed/team.ts file is very large — only the first 4 are the "named" seed members), apply rates broadly to all members seeded via `insertMember`. A helper loop should assign a default rate of €65–95/h (vary by seniority title keyword match) with `effective_from: '2023-01-01'` for any member not explicitly listed above.

**Project fixed costs** — add representative fixed costs to 4–5 of the projects that already have time entries:

```
Project 2 (EN222/A32 Serrinha — transport):
  - 2026-01-10, 'Topographic survey — km 4+200 to 7+800', 12500, EUR, category: survey
  - 2026-01-25, 'Traffic modelling software licence', 3200, EUR, category: software
  - 2026-02-15, 'Signage fabrication and delivery', 45000, EUR, category: materials

Project 3 (AH Caculo Cabaça — dam):
  - 2026-01-08, 'Geotechnical drilling contractor (3 boreholes)', 28000, EUR, category: subcontractor
  - 2026-01-30, 'Lab testing — soil samples', 4500, EUR, category: survey
  - 2026-02-20, 'Site accommodation and transport', 6800, EUR, category: travel

Project 11 (Lisbon Metro Green Line):
  - 2026-01-06, 'Geotechnical instrumentation supply', 18000, EUR, category: equipment
  - 2026-01-28, 'Environmental permit — Lisbon Municipality', 2200, EUR, category: permits
  - 2026-02-14, 'Specialist subcontractor — ground anchors', 85000, EUR, category: subcontractor

Project 19 (Tete Suspension Bridge):
  - 2026-01-07, 'Wind tunnel testing — external laboratory', 32000, EUR, category: survey
  - 2026-02-05, 'Cable specification materials', 220000, USD, category: materials
  - 2026-02-18, 'Team travel and accommodation — Tete', 9500, EUR, category: travel
```

### 6.2 Wire up in seed orchestrator

The main seed entry point (`backend/src/index.ts` or `backend/src/seed/index.ts`) should call `seedFinance()` after `seedTeam()` and `seedTimeEntries()`:

```typescript
import { seedFinance } from './seed/finance'
// ...after existing seed calls:
seedFinance()
```

---

## 7. Migration Considerations

### 7.1 Schema changes in `backend/src/db/schema.ts`

Two new `CREATE TABLE IF NOT EXISTS` blocks must be appended at the end of the existing `db.exec(...)` call in `schema.ts`:

1. `member_rates` DDL (see §1.1)
2. `project_fixed_costs` DDL (see §1.2)

Including both indexes (`idx_member_rates_member_effective`, `idx_project_fixed_costs_project`).

**No existing table DDL needs modification.** The `IF NOT EXISTS` pattern used throughout the schema means the additions are additive and safe — existing table definitions are untouched.

### 7.2 Seed file changes

No existing seed files need modification. The new `backend/src/seed/finance.ts` file uses the same `insertMember`-style prepared statements pattern and is purely additive.

However, the seed orchestrator entry point needs a new import and call. The location of this orchestrator depends on how it is currently structured — the Features agent must locate the file that calls `seedTeam()`, `seedProjects()`, `seedTimeEntries()` etc. and add `seedFinance()` after them.

### 7.3 Router registration

`backend/src/router/index.ts` currently merges all routers. The Features agent must add:

```typescript
import { financeRouter } from './finance'
// in the merged router:
finance: financeRouter,
```

### 7.4 No data loss risk

Because this is an in-memory SQLite database that fully reseeds on every backend restart, there is no migration path to manage. The schema changes take effect immediately on next startup. The only risk is forgetting to add `seedFinance()` to the orchestrator, which would leave the tables empty but structurally correct.

### 7.5 Type exports

The TypeScript interfaces for `MemberRate` and `FixedCost` should be defined in `backend/src/types/finance.ts` (new file) and exported from there for use in both the service and router layers.

---

## 8. Open Questions

These require a user/product decision before the Reporting agent finalises certain details.

### 8.1 Currency handling — single currency vs multi-currency aggregation

**Current state:** `projects.currency` stores one currency per project (defaults to EUR). `time_entries` has no currency (implicitly uses the project's currency). The proposed design stores `currency` per rate and per fixed cost.

**The problem:** `getCompanyFinancials()` and `getProjectFinancialSummary()` need to sum costs across entries in different currencies.

**Options:**
- **A (simplest):** Ignore currency differences — sum all amounts as if they are in the same unit. Show a disclaimer: "All amounts displayed in project currency (EUR); multi-currency not supported." This is adequate for a single-currency team.
- **B (pragmatic):** Store all rates and fixed costs in EUR. Add a separate `amount_eur` column to `project_fixed_costs` for the EUR-converted value, populated at entry time using a user-supplied conversion rate. Aggregate on `amount_eur`.
- **C (full):** Integrate an exchange rate API (e.g. Open Exchange Rates) and convert at display time. Highest complexity.

**Recommendation:** Start with Option A for the MVP. Add a UI note where sums are displayed. If multi-currency becomes a real need, migrate to Option B.

### 8.2 Rate granularity — hourly vs day rate

**Question:** Should rates be stored as hourly or day rates?

**Recommendation:** Store as **hourly rates** (`hourly_rate` column). This is the most granular and composable unit — daily and monthly costs can always be derived (×8 or ×160). The UI can display/accept day rates and convert on input if preferred, with a small note "= €X/h".

### 8.3 Rate vs snapshot — retroactive rate change impact

**As designed:** if a member's rate changes, all historical time entries recalculate at the new rate (since rates are looked up by effective date, not snapshotted onto entries).

**Alternative:** snapshot the applicable rate into `time_entries.hourly_rate` at entry creation time. This locks in the cost forever, even if rates are updated.

**Decision needed:** For a project management tool (not payroll), the as-designed approach (lookup at query time, no snapshot) is usually acceptable. If the company needs immutable historical costs, the snapshot approach must be used and requires a schema change to `time_entries` (add `hourly_rate REAL DEFAULT NULL`).

### 8.4 Who can set/edit rates?

**Question:** Should rate management be restricted to admin-role users only?

The current auth model has `team_members.role` with values `'user'` and `'admin'` (from the schema). The tRPC layer uses `publicProcedure` (no auth check) for all current procedures.

**Recommendation:** Add a `protectedProcedure` (or at minimum an `adminProcedure`) in `trpc.ts` that checks the authenticated user's role before allowing `setMemberRate` and `deleteMemberRate`. This is a cross-cutting concern — the Security agent should sign off on the pattern. For the MVP without full auth, the rate endpoints can be public but this should be noted as a security debt.

### 8.5 Budget currency vs fixed cost currency

The `projects.budget` amount is stored alongside `projects.currency`. If a project has budget in EUR but some fixed costs in USD, the variance calculation (§3.1 `getProjectFinancialSummary`) will be incorrect unless currency conversion is applied.

**Resolution depends on §8.1 decision.** Until resolved, `getProjectFinancialSummary` should note in its return value whether any costs were in a different currency than the project budget currency, and surface a `hasCurrencyMismatch: boolean` flag for the UI to display a warning.

### 8.6 Should `time_entries` record the applicable rate at save time?

See §8.3 above. This is the most impactful design decision. The plan is written for the "no snapshot" approach, but if the team decides snapshots are needed, the changes to `time_entries` and the create procedures are non-trivial and should be scoped separately.

### 8.7 Fixed cost approval workflow

**Out of scope for MVP.** No approval or draft/approved state is planned. All fixed costs are considered approved at entry time. A future enhancement could add `status TEXT NOT NULL DEFAULT 'approved'` to `project_fixed_costs`.

### 8.8 Reporting period / fiscal year

`getCompanyFinancials()` accepts optional `fromDate`/`toDate`. The frontend defaults to the current calendar year. If the company uses a non-January fiscal year, the defaults should be configurable. No action required for MVP — the filter is user-controlled.

---

## Summary: File-by-File Checklist for Implementing Agents

| File | Action | Owner |
|------|--------|-------|
| `backend/src/db/schema.ts` | Add `member_rates` + `project_fixed_costs` DDL + indexes | Features |
| `backend/src/types/finance.ts` | New — define `MemberRate`, `FixedCost`, `ProjectFinancialSummary`, `MemberCostSummary`, `CompanyFinancials` interfaces | Features |
| `backend/src/db/statements/finance.ts` | New — prepared statements | Features |
| `backend/src/services/finance.ts` | New — all financial service functions | Features |
| `backend/src/router/finance.ts` | New — tRPC router | Features |
| `backend/src/router/index.ts` | Register `financeRouter` | Features |
| `backend/src/seed/finance.ts` | New — seed member rates + fixed costs | Seed Data |
| `backend/src/seed/index.ts` (or equivalent) | Call `seedFinance()` | Seed Data |
| `frontend/src/api/finance.ts` | New — React Query hooks for all finance procedures | Features |
| `frontend/src/types/pages.ts` | Add `finance-report` to `Page` union + routing functions | Features |
| `frontend/src/App.tsx` | Add `FinancialReport` route | Features |
| `frontend/src/components/Layout.tsx` | Add Finance nav item | UI |
| `frontend/src/views/FinancialReport.tsx` | New view — company financial dashboard | Reporting |
| `frontend/src/views/ProjectDetail.tsx` | Add Finance tab with labor breakdown + fixed costs | Features |
| `frontend/src/views/TeamMemberDetail.tsx` | Add Rates & Costs section | Features |
| `frontend/src/i18n/en.ts` | Add all `finance*` and `navFinance` keys | Features |
| `frontend/src/i18n/pt.ts` | Mirror PT translations | Features |
