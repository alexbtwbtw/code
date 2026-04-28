import { z } from 'zod'
import { db } from '../db'
import { logAudit } from '../lib/audit'
import { Claim, ClaimStatus, ClaimType, RawClaim, mapClaim, CustomClaimType, RawCustomClaimType, mapCustomClaimType } from '../types/claims'
import {
  createClaimSchema,
  updateClaimSchema,
  listClaimsSchema,
  CLAIM_STATUSES,
  CLAIM_TYPES,
} from '../schemas/claims'

export function listClaims(input: z.infer<typeof listClaimsSchema>): Claim[] {
  const conditions: string[] = []
  const values: unknown[] = []

  if (input.status) {
    conditions.push('status = ?')
    values.push(input.status)
  }

  if (input.claimType) {
    conditions.push('claim_type = ?')
    values.push(input.claimType)
  }

  if (input.insurerId) {
    conditions.push('insurer_id = ?')
    values.push(input.insurerId)
  }

  if (input.search) {
    const like = `%${input.search}%`
    conditions.push(
      '(claim_number LIKE ? OR claimant_name LIKE ? OR property_address LIKE ?)',
    )
    values.push(like, like, like)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const orderMap: Record<string, string> = {
    newest: 'date_opened DESC',
    oldest: 'date_opened ASC',
    value_desc: 'estimated_value DESC NULLS LAST',
    value_asc: 'estimated_value ASC NULLS FIRST',
  }
  const orderBy = orderMap[input.sortBy] ?? 'date_opened DESC'

  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 50
  const offset = (page - 1) * pageSize

  const rows = db
    .prepare(`SELECT * FROM claims ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...values, pageSize, offset) as RawClaim[]

  return rows.map(mapClaim)
}

export function getClaimById(id: number): Claim | null {
  const row = db.prepare('SELECT * FROM claims WHERE id = ?').get(id) as RawClaim | undefined
  return row ? mapClaim(row) : null
}

export function getClaimByNumber(claimNumber: string): Claim | null {
  const row = db
    .prepare('SELECT * FROM claims WHERE claim_number = ?')
    .get(claimNumber) as RawClaim | undefined
  return row ? mapClaim(row) : null
}

export function listCustomClaimTypes(): CustomClaimType[] {
  const rows = db
    .prepare('SELECT * FROM custom_claim_types ORDER BY name ASC')
    .all() as RawCustomClaimType[]
  return rows.map(mapCustomClaimType)
}

export function addCustomClaimType(name: string): CustomClaimType {
  db.prepare('INSERT OR IGNORE INTO custom_claim_types (name) VALUES (?)').run(name)
  const row = db
    .prepare('SELECT * FROM custom_claim_types WHERE name = ?')
    .get(name) as RawCustomClaimType
  return mapCustomClaimType(row)
}

export function createClaim(input: z.infer<typeof createClaimSchema>): Claim {
  if (input.claimType === 'other' && input.customTypeName?.trim()) {
    addCustomClaimType(input.customTypeName.trim())
  }

  const result = db
    .prepare(
      `INSERT INTO claims (
        claim_number, insurer_id, claimant_name, claimant_email, claimant_phone,
        property_address, property_type, claim_type, custom_type_name, status, date_opened,
        date_closed, estimated_value, final_settlement, adjuster_notes, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.claimNumber,
      input.insurerId,
      input.claimantName,
      input.claimantEmail,
      input.claimantPhone,
      input.propertyAddress,
      input.propertyType,
      input.claimType,
      input.customTypeName ?? '',
      input.status,
      input.dateOpened,
      input.dateClosed,
      input.estimatedValue,
      input.finalSettlement,
      input.adjusterNotes,
      input.description,
    )

  const row = db
    .prepare('SELECT * FROM claims WHERE id = ?')
    .get(result.lastInsertRowid) as RawClaim
  const claim = mapClaim(row)
  logAudit('CREATE', 'claim', claim.id, { claimNumber: input.claimNumber })
  return claim
}

export function updateClaim(
  id: number,
  input: z.infer<typeof updateClaimSchema>,
): Claim | null {
  const fieldMap: Record<string, string> = {
    insurerId: 'insurer_id',
    claimantName: 'claimant_name',
    claimantEmail: 'claimant_email',
    claimantPhone: 'claimant_phone',
    propertyAddress: 'property_address',
    propertyType: 'property_type',
    claimType: 'claim_type',
    customTypeName: 'custom_type_name',
    status: 'status',
    dateOpened: 'date_opened',
    dateClosed: 'date_closed',
    estimatedValue: 'estimated_value',
    finalSettlement: 'final_settlement',
    adjusterNotes: 'adjuster_notes',
    description: 'description',
  }

  if (input.claimType === 'other' && input.customTypeName?.trim()) {
    addCustomClaimType(input.customTypeName.trim())
  }

  const setClauses: string[] = []
  const values: unknown[] = []

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in input) {
      setClauses.push(`${col} = ?`)
      values.push(input[key as keyof typeof input])
    }
  }

  setClauses.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(
    `UPDATE claims SET ${setClauses.join(', ')} WHERE id = ?`,
  ).run(...values)
  logAudit('UPDATE', 'claim', id)

  return getClaimById(id)
}

export function deleteClaim(id: number): { deleted: boolean } {
  const result = db.prepare('DELETE FROM claims WHERE id = ?').run(id)
  if (result.changes > 0) logAudit('DELETE', 'claim', id)
  return { deleted: result.changes > 0 }
}

export function getClaimStats(): {
  total: number
  byStatus: Record<ClaimStatus, number>
  byType: Record<ClaimType, number>
  totalEstimatedValue: number
  totalFinalSettlement: number
  avgDaysToClose: number
} {
  const totalRow = db
    .prepare('SELECT COUNT(*) as count FROM claims')
    .get() as { count: number }

  const byStatusRows = db
    .prepare('SELECT status, COUNT(*) as count FROM claims GROUP BY status')
    .all() as { status: string; count: number }[]

  const byTypeRows = db
    .prepare('SELECT claim_type, COUNT(*) as count FROM claims GROUP BY claim_type')
    .all() as { claim_type: string; count: number }[]

  const totalsRow = db
    .prepare(
      `SELECT
        COALESCE(SUM(estimated_value), 0) as total_estimated,
        COALESCE(SUM(final_settlement), 0) as total_settlement
       FROM claims`,
    )
    .get() as { total_estimated: number; total_settlement: number }

  const avgRow = db
    .prepare(
      `SELECT COALESCE(AVG(julianday(date_closed) - julianday(date_opened)), 0) as avg_days
       FROM claims WHERE status = 'closed' AND date_closed IS NOT NULL`,
    )
    .get() as { avg_days: number }

  const byStatus = Object.fromEntries(
    CLAIM_STATUSES.map((s) => [s, 0]),
  ) as Record<ClaimStatus, number>

  for (const row of byStatusRows) {
    if (row.status in byStatus) {
      byStatus[row.status as ClaimStatus] = row.count
    }
  }

  const byType = Object.fromEntries(
    CLAIM_TYPES.map((t) => [t, 0]),
  ) as Record<ClaimType, number>

  for (const row of byTypeRows) {
    if (row.claim_type in byType) {
      byType[row.claim_type as ClaimType] = row.count
    }
  }

  return {
    total: totalRow.count,
    byStatus,
    byType,
    totalEstimatedValue: totalsRow.total_estimated,
    totalFinalSettlement: totalsRow.total_settlement,
    avgDaysToClose: avgRow.avg_days,
  }
}

export function getRecentClaims(limit: number): Claim[] {
  const rows = db
    .prepare('SELECT * FROM claims ORDER BY created_at DESC LIMIT ?')
    .all(limit) as RawClaim[]
  return rows.map(mapClaim)
}
