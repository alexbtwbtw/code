import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import {
  setMemberRate,
  getMemberRates,
  getCurrentRate,
  deleteMemberRate,
  createFixedCost,
  getFixedCostsByProject,
  updateFixedCost,
  deleteFixedCost,
  getProjectFinancialSummary,
  getMemberCostSummary,
  getCompanyFinancials,
} from '../../services/finance'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProject(refCode = 'FP-001', budget: number | null = null) {
  return Number(
    db.prepare(`
      INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority, currency, project_manager, description, tags, budget)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(refCode, 'Finance Project', 'Client A', 'EMEA', 'Portugal', 'Lisbon',
           'transport', 'active', 'medium', 'EUR', 'PM', 'desc', '', budget).lastInsertRowid,
  )
}

function makeMember(name = 'Alice') {
  return Number(db.prepare(`INSERT INTO team_members (name) VALUES (?)`).run(name).lastInsertRowid)
}

function makeTimeEntry(
  projectId: number,
  memberId: number,
  hours: number,
  hourlyRate: number | null,
  date = '2025-01-15',
) {
  return Number(
    db.prepare(`
      INSERT INTO time_entries (project_id, member_id, date, hours, hourly_rate)
      VALUES (?, ?, ?, ?, ?)
    `).run(projectId, memberId, date, hours, hourlyRate).lastInsertRowid,
  )
}

// ── setMemberRate ─────────────────────────────────────────────────────────────

describe('setMemberRate', () => {
  it('inserts a rate and returns a record with an id', () => {
    const mId = makeMember()
    const rate = setMemberRate(mId, 75.0, '2025-01-01', 'Initial rate')
    expect(rate.id).toBeTypeOf('number')
    expect(rate.id).toBeGreaterThan(0)
    expect(rate.teamMemberId).toBe(mId)
    expect(rate.hourlyRate).toBe(75.0)
    expect(rate.effectiveFrom).toBe('2025-01-01')
    expect(rate.notes).toBe('Initial rate')
  })

  it('inserts multiple rates for the same member', () => {
    const mId = makeMember('Bob')
    setMemberRate(mId, 50.0, '2024-01-01', '')
    setMemberRate(mId, 60.0, '2025-01-01', '')
    const rates = getMemberRates(mId)
    expect(rates).toHaveLength(2)
  })
})

// ── getMemberRates ────────────────────────────────────────────────────────────

describe('getMemberRates', () => {
  it('returns rates ordered by effective_from DESC', () => {
    const mId = makeMember('Carol')
    setMemberRate(mId, 50.0, '2023-06-01', 'A')
    setMemberRate(mId, 60.0, '2024-06-01', 'B')
    setMemberRate(mId, 70.0, '2025-01-01', 'C')

    const rates = getMemberRates(mId)
    expect(rates).toHaveLength(3)
    expect(rates[0].effectiveFrom).toBe('2025-01-01')
    expect(rates[1].effectiveFrom).toBe('2024-06-01')
    expect(rates[2].effectiveFrom).toBe('2023-06-01')
  })

  it('returns empty array when member has no rates', () => {
    const mId = makeMember('Dave')
    const rates = getMemberRates(mId)
    expect(rates).toHaveLength(0)
  })

  it('does not return rates from other members', () => {
    const mId1 = makeMember('Eve')
    const mId2 = makeMember('Frank')
    setMemberRate(mId1, 80.0, '2025-01-01', '')
    const rates = getMemberRates(mId2)
    expect(rates).toHaveLength(0)
  })
})

// ── getCurrentRate ────────────────────────────────────────────────────────────

describe('getCurrentRate', () => {
  it('returns the most recent rate effective on or before the given date', () => {
    const mId = makeMember('Grace')
    setMemberRate(mId, 50.0, '2023-01-01', 'old')
    setMemberRate(mId, 75.0, '2024-06-01', 'mid')
    setMemberRate(mId, 90.0, '2025-03-01', 'new')

    // Ask for rate as of 2024-12-31 → should get 75.0 (effective 2024-06-01)
    const rate = getCurrentRate(mId, '2024-12-31')
    expect(rate).not.toBeNull()
    expect(rate!.hourlyRate).toBe(75.0)
  })

  it('picks exact match when date equals effective_from', () => {
    const mId = makeMember('Heidi')
    setMemberRate(mId, 60.0, '2025-01-01', '')
    const rate = getCurrentRate(mId, '2025-01-01')
    expect(rate).not.toBeNull()
    expect(rate!.hourlyRate).toBe(60.0)
  })

  it('returns null when no rate exists for the member', () => {
    const mId = makeMember('Ivan')
    const rate = getCurrentRate(mId, '2025-01-01')
    expect(rate).toBeNull()
  })

  it('returns null when all rates are in the future relative to query date', () => {
    const mId = makeMember('Judy')
    setMemberRate(mId, 80.0, '2026-01-01', '')
    const rate = getCurrentRate(mId, '2025-01-01')
    expect(rate).toBeNull()
  })
})

// ── deleteMemberRate ──────────────────────────────────────────────────────────

describe('deleteMemberRate', () => {
  it('removes the rate so it no longer appears in getMemberRates', () => {
    const mId = makeMember('Karl')
    const rate = setMemberRate(mId, 70.0, '2025-01-01', '')
    expect(getMemberRates(mId)).toHaveLength(1)
    const result = deleteMemberRate(rate.id)
    expect(result.success).toBe(true)
    expect(getMemberRates(mId)).toHaveLength(0)
  })

  it('does not affect other rates', () => {
    const mId = makeMember('Lena')
    const r1 = setMemberRate(mId, 50.0, '2024-01-01', '')
    setMemberRate(mId, 60.0, '2025-01-01', '')
    deleteMemberRate(r1.id)
    const remaining = getMemberRates(mId)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].hourlyRate).toBe(60.0)
  })
})

// ── createFixedCost ───────────────────────────────────────────────────────────

describe('createFixedCost', () => {
  it('inserts with all fields and returns a record with an id', () => {
    const pId = makeProject('FP-FC1')
    const cost = createFixedCost({
      projectId: pId,
      description: 'Equipment rental',
      amount: 1500.0,
      costDate: '2025-03-10',
      category: 'equipment',
      notes: 'Crane hire',
    })
    expect(cost.id).toBeGreaterThan(0)
    expect(cost.projectId).toBe(pId)
    expect(cost.description).toBe('Equipment rental')
    expect(cost.amount).toBe(1500.0)
    expect(cost.costDate).toBe('2025-03-10')
    expect(cost.category).toBe('equipment')
    expect(cost.notes).toBe('Crane hire')
  })
})

// ── getFixedCostsByProject ────────────────────────────────────────────────────

describe('getFixedCostsByProject', () => {
  it('returns costs ordered by cost_date DESC', () => {
    const pId = makeProject('FP-FC2')
    createFixedCost({ projectId: pId, description: 'A', amount: 100, costDate: '2025-01-01', category: 'other', notes: '' })
    createFixedCost({ projectId: pId, description: 'B', amount: 200, costDate: '2025-03-01', category: 'other', notes: '' })
    createFixedCost({ projectId: pId, description: 'C', amount: 300, costDate: '2025-02-01', category: 'other', notes: '' })

    const costs = getFixedCostsByProject(pId)
    expect(costs).toHaveLength(3)
    expect(costs[0].costDate).toBe('2025-03-01')
    expect(costs[1].costDate).toBe('2025-02-01')
    expect(costs[2].costDate).toBe('2025-01-01')
  })

  it('returns empty array for project with no fixed costs', () => {
    const pId = makeProject('FP-FC3')
    expect(getFixedCostsByProject(pId)).toHaveLength(0)
  })

  it('does not return costs from other projects', () => {
    const pId1 = makeProject('FP-FC4')
    const pId2 = makeProject('FP-FC5')
    createFixedCost({ projectId: pId1, description: 'X', amount: 50, costDate: '2025-01-01', category: 'other', notes: '' })
    expect(getFixedCostsByProject(pId2)).toHaveLength(0)
  })
})

// ── updateFixedCost ───────────────────────────────────────────────────────────

describe('updateFixedCost', () => {
  it('changes amount and description', () => {
    const pId = makeProject('FP-UPD1')
    const cost = createFixedCost({ projectId: pId, description: 'Old desc', amount: 100, costDate: '2025-01-01', category: 'other', notes: '' })
    const updated = updateFixedCost({ id: cost.id, amount: 250, description: 'New desc' })
    expect(updated.amount).toBe(250)
    expect(updated.description).toBe('New desc')
  })

  it('preserves unchanged fields', () => {
    const pId = makeProject('FP-UPD2')
    const cost = createFixedCost({ projectId: pId, description: 'Stays', amount: 400, costDate: '2025-04-01', category: 'materials', notes: 'keep' })
    const updated = updateFixedCost({ id: cost.id, amount: 500 })
    expect(updated.description).toBe('Stays')
    expect(updated.category).toBe('materials')
    expect(updated.notes).toBe('keep')
    expect(updated.costDate).toBe('2025-04-01')
  })

  it('throws if the fixed cost does not exist', () => {
    expect(() => updateFixedCost({ id: 999999, amount: 1 })).toThrow()
  })
})

// ── deleteFixedCost ───────────────────────────────────────────────────────────

describe('deleteFixedCost', () => {
  it('removes the entry so it no longer appears in getFixedCostsByProject', () => {
    const pId = makeProject('FP-DEL1')
    const cost = createFixedCost({ projectId: pId, description: 'Del', amount: 100, costDate: '2025-01-01', category: 'other', notes: '' })
    expect(getFixedCostsByProject(pId)).toHaveLength(1)
    const result = deleteFixedCost(cost.id)
    expect(result.success).toBe(true)
    expect(getFixedCostsByProject(pId)).toHaveLength(0)
  })
})

// ── getProjectFinancialSummary ────────────────────────────────────────────────

describe('getProjectFinancialSummary', () => {
  it('computes laborCost using snapshotted hourly_rate on time_entries', () => {
    const pId = makeProject('FP-SUM1', 10000)
    const mId = makeMember('Mia')
    // 8 hours @ 50/hr = 400
    makeTimeEntry(pId, mId, 8, 50, '2025-02-01')
    // 4 hours @ 75/hr = 300
    makeTimeEntry(pId, mId, 4, 75, '2025-02-02')

    const summary = getProjectFinancialSummary(pId)
    expect(summary.laborCost).toBe(700)
  })

  it('computes fixedCostTotal correctly', () => {
    const pId = makeProject('FP-SUM2', 5000)
    createFixedCost({ projectId: pId, description: 'A', amount: 300, costDate: '2025-01-01', category: 'equipment', notes: '' })
    createFixedCost({ projectId: pId, description: 'B', amount: 700, costDate: '2025-01-02', category: 'materials', notes: '' })

    const summary = getProjectFinancialSummary(pId)
    expect(summary.fixedCostTotal).toBe(1000)
  })

  it('computes totalCost as laborCost + fixedCostTotal', () => {
    const pId = makeProject('FP-SUM3', 10000)
    const mId = makeMember('Nora')
    makeTimeEntry(pId, mId, 10, 60, '2025-03-01') // labor = 600
    createFixedCost({ projectId: pId, description: 'X', amount: 400, costDate: '2025-03-05', category: 'travel', notes: '' })

    const summary = getProjectFinancialSummary(pId)
    expect(summary.laborCost).toBe(600)
    expect(summary.fixedCostTotal).toBe(400)
    expect(summary.totalCost).toBe(1000)
  })

  it('computes budgetVariance = budget - totalCost', () => {
    const pId = makeProject('FP-SUM4', 5000)
    const mId = makeMember('Oscar')
    makeTimeEntry(pId, mId, 20, 100, '2025-03-10') // labor = 2000
    createFixedCost({ projectId: pId, description: 'Y', amount: 500, costDate: '2025-03-11', category: 'other', notes: '' })

    const summary = getProjectFinancialSummary(pId)
    expect(summary.totalCost).toBe(2500)
    expect(summary.budgetVariance).toBe(2500) // 5000 - 2500
  })

  it('sets hasUnratedEntries true when a time entry has null hourly_rate', () => {
    const pId = makeProject('FP-SUM5', 10000)
    const mId = makeMember('Paula')
    makeTimeEntry(pId, mId, 5, 50, '2025-04-01')  // rated
    makeTimeEntry(pId, mId, 3, null, '2025-04-02') // unrated

    const summary = getProjectFinancialSummary(pId)
    expect(summary.hasUnratedEntries).toBe(true)
  })

  it('sets hasUnratedEntries false when all time entries have a rate', () => {
    const pId = makeProject('FP-SUM6', 10000)
    const mId = makeMember('Quinn')
    makeTimeEntry(pId, mId, 6, 80, '2025-04-01')

    const summary = getProjectFinancialSummary(pId)
    expect(summary.hasUnratedEntries).toBe(false)
  })

  it('returns null budgetVariance when project has no budget', () => {
    const pId = makeProject('FP-SUM7', null)
    const summary = getProjectFinancialSummary(pId)
    expect(summary.budgetVariance).toBeNull()
    expect(summary.budgetUtilisationPct).toBeNull()
  })

  it('throws when project does not exist', () => {
    expect(() => getProjectFinancialSummary(999999)).toThrow()
  })
})

// ── getMemberCostSummary ──────────────────────────────────────────────────────

describe('getMemberCostSummary', () => {
  it('returns correct totalHours and totalLaborCost across projects', () => {
    const pId1 = makeProject('FP-MCS1')
    const pId2 = makeProject('FP-MCS2')
    const mId = makeMember('Rita')

    makeTimeEntry(pId1, mId, 8, 50, '2025-01-10')  // 400
    makeTimeEntry(pId2, mId, 4, 100, '2025-01-15') // 400

    const summary = getMemberCostSummary(mId)
    expect(summary.memberId).toBe(mId)
    expect(summary.memberName).toBe('Rita')
    expect(summary.totalHours).toBe(12)
    expect(summary.totalLaborCost).toBe(800)
    expect(summary.byProject).toHaveLength(2)
  })

  it('returns totalHours 0 and totalLaborCost 0 with no time entries', () => {
    const mId = makeMember('Sam')
    const summary = getMemberCostSummary(mId)
    expect(summary.totalHours).toBe(0)
    expect(summary.totalLaborCost).toBe(0)
    expect(summary.byProject).toHaveLength(0)
  })

  it('returns currentRate from getMemberRates when set', () => {
    const mId = makeMember('Tina')
    setMemberRate(mId, 95.0, '2025-01-01', '')
    const summary = getMemberCostSummary(mId)
    expect(summary.currentRate).toBe(95.0)
  })

  it('returns currentRate null when no rate set', () => {
    const mId = makeMember('Uma')
    const summary = getMemberCostSummary(mId)
    expect(summary.currentRate).toBeNull()
  })

  it('throws when member does not exist', () => {
    expect(() => getMemberCostSummary(999999)).toThrow()
  })
})

// ── getCompanyFinancials ──────────────────────────────────────────────────────

describe('getCompanyFinancials', () => {
  it('returns correct totals across multiple projects', () => {
    const pId1 = makeProject('FP-CF1', 20000)
    const pId2 = makeProject('FP-CF2', 15000)
    const mId = makeMember('Victor')

    makeTimeEntry(pId1, mId, 10, 80, '2025-05-01')  // 800
    makeTimeEntry(pId2, mId, 5, 60, '2025-05-15')   // 300
    createFixedCost({ projectId: pId1, description: 'Equip', amount: 1200, costDate: '2025-05-10', category: 'equipment', notes: '' })

    const result = getCompanyFinancials({ fromDate: '2025-01-01', toDate: '2025-12-31' })
    expect(result.totalLaborCost).toBeGreaterThanOrEqual(1100)
    expect(result.totalFixedCost).toBeGreaterThanOrEqual(1200)
    expect(result.totalCost).toBe(result.totalLaborCost + result.totalFixedCost)
  })

  it('date range filter excludes entries outside the range', () => {
    const pId = makeProject('FP-CF3')
    const mId = makeMember('Wendy')

    makeTimeEntry(pId, mId, 8, 50, '2024-06-01')  // outside range
    makeTimeEntry(pId, mId, 4, 50, '2025-06-01')  // inside range

    const result = getCompanyFinancials({ fromDate: '2025-01-01', toDate: '2025-12-31' })
    // Total should only include the 2025 entry (4 * 50 = 200)
    const projectEntry = result.byProject.find(p => p.projectId === pId)
    if (projectEntry) {
      expect(projectEntry.laborCost).toBe(200)
    }
  })

  it('byCategory groups fixed costs by category', () => {
    const pId = makeProject('FP-CF4')
    createFixedCost({ projectId: pId, description: 'A', amount: 500, costDate: '2025-07-01', category: 'materials', notes: '' })
    createFixedCost({ projectId: pId, description: 'B', amount: 300, costDate: '2025-07-02', category: 'materials', notes: '' })
    createFixedCost({ projectId: pId, description: 'C', amount: 200, costDate: '2025-07-03', category: 'travel', notes: '' })

    const result = getCompanyFinancials({ fromDate: '2025-01-01', toDate: '2025-12-31' })
    const materialsEntry = result.byCategory.find(c => c.category === 'materials')
    const travelEntry = result.byCategory.find(c => c.category === 'travel')
    expect(materialsEntry?.fixedCost).toBe(800)
    expect(travelEntry?.fixedCost).toBe(200)
  })
})
