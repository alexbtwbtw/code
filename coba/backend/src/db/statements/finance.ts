import { db } from '../client'

// ── Member rates ──────────────────────────────────────────────────────────────

export const insertMemberRate = db.prepare(`
  INSERT INTO member_rates (team_member_id, hourly_rate, effective_from, notes)
  VALUES (@team_member_id, @hourly_rate, @effective_from, @notes)
`)

export const selectMemberRates = db.prepare(`
  SELECT id, team_member_id, hourly_rate, effective_from, notes, created_at
  FROM member_rates
  WHERE team_member_id = ?
  ORDER BY effective_from DESC
`)

export const selectCurrentRate = db.prepare(`
  SELECT id, team_member_id, hourly_rate, effective_from, notes, created_at
  FROM member_rates
  WHERE team_member_id = ? AND effective_from <= ?
  ORDER BY effective_from DESC
  LIMIT 1
`)

export const deleteMemberRateById = db.prepare(`
  DELETE FROM member_rates WHERE id = ?
`)

export const countMemberRates = db.prepare(`
  SELECT COUNT(*) as n FROM member_rates WHERE team_member_id = ?
`)

// ── Project fixed costs ───────────────────────────────────────────────────────

export const insertFixedCost = db.prepare(`
  INSERT INTO project_fixed_costs (project_id, description, amount, cost_date, category, notes)
  VALUES (@project_id, @description, @amount, @cost_date, @category, @notes)
`)

export const selectFixedCostsByProject = db.prepare(`
  SELECT id, project_id, description, amount, cost_date, category, notes, created_at, updated_at
  FROM project_fixed_costs
  WHERE project_id = ?
  ORDER BY cost_date DESC
`)

export const updateFixedCostStmt = db.prepare(`
  UPDATE project_fixed_costs
  SET description = @description,
      amount      = @amount,
      cost_date   = @cost_date,
      category    = @category,
      notes       = @notes,
      updated_at  = datetime('now')
  WHERE id = @id
`)

export const deleteFixedCostById = db.prepare(`
  DELETE FROM project_fixed_costs WHERE id = ?
`)

export const selectFixedCostById = db.prepare(`
  SELECT id, project_id, description, amount, cost_date, category, notes, created_at, updated_at
  FROM project_fixed_costs
  WHERE id = ?
`)
