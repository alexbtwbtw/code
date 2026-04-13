import { db } from '../db'
import {
  insertMemberRate,
  selectMemberRates,
  selectCurrentRate,
  deleteMemberRateById,
  insertFixedCost,
  selectFixedCostsByProject,
  updateFixedCostStmt,
  deleteFixedCostById,
  selectFixedCostById,
} from '../db/statements/finance'
import type {
  MemberRate,
  FixedCost,
  ProjectFinancialSummary,
  MemberCostSummary,
  CompanyFinancials,
} from '../types/finance'

// ── Raw DB row types ──────────────────────────────────────────────────────────

interface RawMemberRate {
  id: number
  team_member_id: number
  hourly_rate: number
  effective_from: string
  notes: string
  created_at: string
}

interface RawFixedCost {
  id: number
  project_id: number
  description: string
  amount: number
  cost_date: string
  category: string
  notes: string
  created_at: string
  updated_at: string
}

function mapRate(r: RawMemberRate): MemberRate {
  return {
    id: r.id,
    teamMemberId: r.team_member_id,
    hourlyRate: r.hourly_rate,
    effectiveFrom: r.effective_from,
    notes: r.notes,
    createdAt: r.created_at,
  }
}

function mapFixedCost(r: RawFixedCost): FixedCost {
  return {
    id: r.id,
    projectId: r.project_id,
    description: r.description,
    amount: r.amount,
    costDate: r.cost_date,
    category: r.category,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ── Member rates ──────────────────────────────────────────────────────────────

export function setMemberRate(
  memberId: number,
  hourlyRate: number,
  effectiveFrom: string,
  notes: string,
): MemberRate {
  const result = insertMemberRate.run({
    team_member_id: memberId,
    hourly_rate: hourlyRate,
    effective_from: effectiveFrom,
    notes,
  })
  const row = selectMemberRates.get(memberId) as RawMemberRate
  // Return the just-inserted row
  const all = selectMemberRates.all(memberId) as RawMemberRate[]
  const inserted = all.find(r => r.id === Number(result.lastInsertRowid))
  return mapRate(inserted ?? row)
}

export function getMemberRates(memberId: number): MemberRate[] {
  const rows = selectMemberRates.all(memberId) as RawMemberRate[]
  return rows.map(mapRate)
}

export function getCurrentRate(memberId: number, asOfDate?: string): MemberRate | null {
  const date = asOfDate ?? new Date().toISOString().slice(0, 10)
  const row = selectCurrentRate.get(memberId, date) as RawMemberRate | undefined
  return row ? mapRate(row) : null
}

export function deleteMemberRate(rateId: number): { success: true } {
  deleteMemberRateById.run(rateId)
  return { success: true }
}

// ── Fixed costs ───────────────────────────────────────────────────────────────

export function createFixedCost(input: {
  projectId: number
  description: string
  amount: number
  costDate: string
  category: string
  notes: string
}): FixedCost {
  const result = insertFixedCost.run({
    project_id: input.projectId,
    description: input.description,
    amount: input.amount,
    cost_date: input.costDate,
    category: input.category,
    notes: input.notes,
  })
  const row = selectFixedCostById.get(result.lastInsertRowid) as RawFixedCost
  return mapFixedCost(row)
}

export function getFixedCostsByProject(projectId: number): FixedCost[] {
  const rows = selectFixedCostsByProject.all(projectId) as RawFixedCost[]
  return rows.map(mapFixedCost)
}

export function updateFixedCost(input: {
  id: number
  description?: string
  amount?: number
  costDate?: string
  category?: string
  notes?: string
}): FixedCost {
  const existing = selectFixedCostById.get(input.id) as RawFixedCost | undefined
  if (!existing) throw new Error(`Fixed cost ${input.id} not found`)
  updateFixedCostStmt.run({
    id: input.id,
    description: input.description ?? existing.description,
    amount: input.amount ?? existing.amount,
    cost_date: input.costDate ?? existing.cost_date,
    category: input.category ?? existing.category,
    notes: input.notes ?? existing.notes,
  })
  const updated = selectFixedCostById.get(input.id) as RawFixedCost
  return mapFixedCost(updated)
}

export function deleteFixedCost(id: number): { success: true } {
  deleteFixedCostById.run(id)
  return { success: true }
}

// ── Aggregated summaries ──────────────────────────────────────────────────────

interface LaborRow {
  member_id: number
  member_name: string
  hours: number
  hourly_rate: number | null
  labor_cost: number
}

export function getProjectFinancialSummary(projectId: number): ProjectFinancialSummary {
  // Get project budget
  const project = db.prepare(`SELECT id, budget FROM projects WHERE id = ?`).get(projectId) as
    | { id: number; budget: number | null }
    | undefined
  if (!project) throw new Error(`Project ${projectId} not found`)

  // Labor cost: use snapshotted hourly_rate on time_entries
  const laborRows = db.prepare(`
    SELECT
      te.member_id,
      tm.name AS member_name,
      SUM(te.hours) AS hours,
      te.hourly_rate,
      SUM(te.hours * COALESCE(te.hourly_rate, 0)) AS labor_cost
    FROM time_entries te
    JOIN team_members tm ON tm.id = te.member_id
    WHERE te.project_id = ?
    GROUP BY te.member_id, tm.name, te.hourly_rate
  `).all(projectId) as LaborRow[]

  // Aggregate by member
  const memberMap = new Map<number, { name: string; hours: number; ratedCost: number; hasUnrated: boolean }>()
  for (const row of laborRows) {
    const existing = memberMap.get(row.member_id)
    const hasUnrated = row.hourly_rate === null || row.hourly_rate === undefined
    if (existing) {
      existing.hours += row.hours
      existing.ratedCost += row.labor_cost
      if (hasUnrated) existing.hasUnrated = true
    } else {
      memberMap.set(row.member_id, {
        name: row.member_name,
        hours: row.hours,
        ratedCost: row.labor_cost,
        hasUnrated,
      })
    }
  }

  const laborByMember = Array.from(memberMap.entries()).map(([memberId, v]) => ({
    memberId,
    memberName: v.name,
    hours: v.hours,
    hourlyRate: v.hasUnrated ? null : (v.hours > 0 ? v.ratedCost / v.hours : null),
    laborCost: v.ratedCost,
  }))

  const laborCost = laborByMember.reduce((s, m) => s + m.laborCost, 0)
  const membersWithNoRate = laborByMember.filter(m => m.hourlyRate === null).map(m => m.memberName)
  const hasUnratedEntries = membersWithNoRate.length > 0

  // Fixed costs
  const fixedRows = selectFixedCostsByProject.all(projectId) as RawFixedCost[]
  const fixedCostTotal = fixedRows.reduce((s, r) => s + r.amount, 0)
  const fixedCostByCategory: Record<string, number> = {}
  for (const r of fixedRows) {
    fixedCostByCategory[r.category] = (fixedCostByCategory[r.category] ?? 0) + r.amount
  }

  const totalCost = laborCost + fixedCostTotal
  const budget = project.budget ?? null
  const budgetVariance = budget !== null ? budget - totalCost : null
  const budgetUtilisationPct = budget !== null && budget > 0 ? (totalCost / budget) * 100 : null

  return {
    projectId,
    budget,
    laborCost,
    fixedCostTotal,
    totalCost,
    budgetVariance,
    budgetUtilisationPct,
    hasUnratedEntries,
    membersWithNoRate,
    laborByMember,
    fixedCostByCategory,
  }
}

export function getMemberCostSummary(memberId: number): MemberCostSummary {
  const member = db.prepare(`SELECT id, name FROM team_members WHERE id = ?`).get(memberId) as
    | { id: number; name: string }
    | undefined
  if (!member) throw new Error(`Member ${memberId} not found`)

  const currentRateRow = getCurrentRate(memberId)

  interface ProjectRow {
    project_id: number
    project_name: string
    hours: number
    labor_cost: number
  }

  const projectRows = db.prepare(`
    SELECT
      te.project_id,
      p.name AS project_name,
      SUM(te.hours) AS hours,
      SUM(te.hours * COALESCE(te.hourly_rate, 0)) AS labor_cost
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    WHERE te.member_id = ?
    GROUP BY te.project_id, p.name
    ORDER BY labor_cost DESC
  `).all(memberId) as ProjectRow[]

  const totalHours = projectRows.reduce((s, r) => s + r.hours, 0)
  const totalLaborCost = projectRows.reduce((s, r) => s + r.labor_cost, 0)

  return {
    memberId,
    memberName: member.name,
    currentRate: currentRateRow?.hourlyRate ?? null,
    totalHours,
    totalLaborCost,
    byProject: projectRows.map(r => ({
      projectId: r.project_id,
      projectName: r.project_name,
      hours: r.hours,
      laborCost: r.labor_cost,
    })),
  }
}

export function getCompanyFinancials(opts: { fromDate?: string; toDate?: string }): CompanyFinancials {
  const fromDate = opts.fromDate ?? `${new Date().getFullYear()}-01-01`
  const toDate = opts.toDate ?? `${new Date().getFullYear()}-12-31`

  interface ProjectLaborRow {
    project_id: number
    project_name: string
    budget: number | null
    labor_cost: number
  }

  const laborByProject = db.prepare(`
    SELECT
      p.id AS project_id,
      p.name AS project_name,
      p.budget,
      COALESCE(SUM(te.hours * COALESCE(te.hourly_rate, 0)), 0) AS labor_cost
    FROM projects p
    LEFT JOIN time_entries te ON te.project_id = p.id
      AND te.date >= ? AND te.date <= ?
    GROUP BY p.id, p.name, p.budget
  `).all(fromDate, toDate) as ProjectLaborRow[]

  interface ProjectFixedRow {
    project_id: number
    fixed_cost: number
  }

  const fixedByProject = db.prepare(`
    SELECT
      project_id,
      COALESCE(SUM(amount), 0) AS fixed_cost
    FROM project_fixed_costs
    WHERE cost_date >= ? AND cost_date <= ?
    GROUP BY project_id
  `).all(fromDate, toDate) as ProjectFixedRow[]

  const fixedMap = new Map(fixedByProject.map(r => [r.project_id, r.fixed_cost]))

  const byProject = laborByProject.map(r => {
    const fixedCost = fixedMap.get(r.project_id) ?? 0
    const totalCost = r.labor_cost + fixedCost
    const variancePct = r.budget && r.budget > 0
      ? ((r.budget - totalCost) / r.budget) * 100
      : null
    return {
      projectId: r.project_id,
      projectName: r.project_name,
      laborCost: r.labor_cost,
      fixedCost,
      totalCost,
      budget: r.budget ?? null,
      variancePct,
    }
  }).filter(r => r.totalCost > 0 || (r.budget ?? 0) > 0)

  const totalLaborCost = byProject.reduce((s, r) => s + r.laborCost, 0)
  const totalFixedCost = byProject.reduce((s, r) => s + r.fixedCost, 0)
  const totalCost = totalLaborCost + totalFixedCost
  const totalBudget = byProject.reduce((s, r) => s + (r.budget ?? 0), 0)

  // By category (fixed costs)
  interface CategoryRow { category: string; fixed_cost: number }
  const categoryRows = db.prepare(`
    SELECT category, SUM(amount) AS fixed_cost
    FROM project_fixed_costs
    WHERE cost_date >= ? AND cost_date <= ?
    GROUP BY category
    ORDER BY fixed_cost DESC
  `).all(fromDate, toDate) as CategoryRow[]

  const byCategory = categoryRows.map(r => ({ category: r.category, fixedCost: r.fixed_cost }))

  // By month
  interface MonthLaborRow { month: string; labor_cost: number }
  interface MonthFixedRow { month: string; fixed_cost: number }

  const monthLaborRows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      SUM(hours * COALESCE(hourly_rate, 0)) AS labor_cost
    FROM time_entries
    WHERE date >= ? AND date <= ?
    GROUP BY month
    ORDER BY month
  `).all(fromDate, toDate) as MonthLaborRow[]

  const monthFixedRows = db.prepare(`
    SELECT
      strftime('%Y-%m', cost_date) AS month,
      SUM(amount) AS fixed_cost
    FROM project_fixed_costs
    WHERE cost_date >= ? AND cost_date <= ?
    GROUP BY month
    ORDER BY month
  `).all(fromDate, toDate) as MonthFixedRow[]

  const monthMap = new Map<string, { laborCost: number; fixedCost: number }>()
  for (const r of monthLaborRows) {
    monthMap.set(r.month, { laborCost: r.labor_cost, fixedCost: 0 })
  }
  for (const r of monthFixedRows) {
    const existing = monthMap.get(r.month)
    if (existing) existing.fixedCost = r.fixed_cost
    else monthMap.set(r.month, { laborCost: 0, fixedCost: r.fixed_cost })
  }

  const byMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, laborCost: v.laborCost, fixedCost: v.fixedCost }))

  return {
    totalLaborCost,
    totalFixedCost,
    totalCost,
    totalBudget,
    projectCount: byProject.length,
    byProject,
    byCategory,
    byMonth,
  }
}
