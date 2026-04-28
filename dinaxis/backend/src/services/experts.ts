import { z } from 'zod'
import { db } from '../db'
import { logAudit } from '../lib/audit'
import { Expert, RawExpert, mapExpert, ClaimExpert, RawClaimExpert, mapClaimExpert } from '../types/experts'
import { createExpertSchema, updateExpertSchema, addClaimExpertSchema, updateClaimExpertSchema } from '../schemas/experts'

// ─── Experts ──────────────────────────────────────────────────────────────────

export function listExperts(search?: string): Expert[] {
  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`
    const rows = db
      .prepare<[string, string], RawExpert>(
        `SELECT * FROM experts WHERE name LIKE ? OR specialty LIKE ? ORDER BY name ASC`
      )
      .all(pattern, pattern)
    return rows.map(mapExpert)
  }
  const rows = db.prepare<[], RawExpert>(`SELECT * FROM experts ORDER BY name ASC`).all()
  return rows.map(mapExpert)
}

export function getExpertById(id: number): Expert | null {
  const row = db.prepare<[number], RawExpert>(`SELECT * FROM experts WHERE id = ?`).get(id)
  return row ? mapExpert(row) : null
}

export function createExpert(input: z.infer<typeof createExpertSchema>): Expert {
  const result = db
    .prepare<unknown[], { id: number }>(
      `INSERT INTO experts (name, specialty, email, phone, notes)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`
    )
    .get(input.name, input.specialty ?? '', input.email ?? '', input.phone ?? '', input.notes ?? '')
  if (!result) throw new Error('Failed to create expert')
  logAudit('CREATE', 'expert', result.id, { name: input.name })
  return getExpertById(result.id)!
}

export function updateExpert(id: number, input: z.infer<typeof updateExpertSchema>): Expert | null {
  const fieldMap: Record<string, string> = {
    name:      'name',
    specialty: 'specialty',
    email:     'email',
    phone:     'phone',
    notes:     'notes',
  }

  const keys = Object.keys(input).filter(k => (input as Record<string, unknown>)[k] !== undefined && k in fieldMap)
  if (keys.length === 0) return getExpertById(id)

  const setClauses = [...keys.map(k => `${fieldMap[k]} = ?`), `updated_at = datetime('now')`].join(', ')
  const values = keys.map(k => (input as Record<string, unknown>)[k])

  db.prepare(`UPDATE experts SET ${setClauses} WHERE id = ?`).run(...values, id)
  logAudit('UPDATE', 'expert', id)

  return getExpertById(id)
}

export function deleteExpert(id: number): { deleted: boolean } {
  const result = db.prepare(`DELETE FROM experts WHERE id = ?`).run(id)
  if (result.changes > 0) logAudit('DELETE', 'expert', id)
  return { deleted: result.changes > 0 }
}

// ─── Claim Experts ────────────────────────────────────────────────────────────

export function getClaimExperts(claimId: number): (ClaimExpert & { expert: Expert })[] {
  const rows = db
    .prepare<[number], RawClaimExpert & RawExpert & { expert_name: string; expert_specialty: string; expert_email: string; expert_phone: string; expert_notes: string; expert_created_at: string; expert_updated_at: string }>(
      `SELECT
         ce.id, ce.claim_id, ce.expert_id, ce.role, ce.work_summary, ce.added_at,
         e.name AS expert_name,
         e.specialty AS expert_specialty,
         e.email AS expert_email,
         e.phone AS expert_phone,
         e.notes AS expert_notes,
         e.created_at AS expert_created_at,
         e.updated_at AS expert_updated_at
       FROM claim_experts ce
       JOIN experts e ON e.id = ce.expert_id
       WHERE ce.claim_id = ?
       ORDER BY ce.added_at ASC`
    )
    .all(claimId)

  return rows.map(r => ({
    ...mapClaimExpert({
      id: r.id,
      claim_id: r.claim_id,
      expert_id: r.expert_id,
      role: r.role,
      work_summary: r.work_summary,
      added_at: r.added_at,
    }),
    expert: mapExpert({
      id: r.expert_id,
      name: (r as any).expert_name,
      specialty: (r as any).expert_specialty,
      email: (r as any).expert_email,
      phone: (r as any).expert_phone,
      notes: (r as any).expert_notes,
      created_at: (r as any).expert_created_at,
      updated_at: (r as any).expert_updated_at,
    }),
  }))
}

export function getExpertClaims(expertId: number): { claimExpert: ClaimExpert; claimId: number; claimNumber: string; status: string }[] {
  const rows = db
    .prepare<[number], RawClaimExpert & { claim_number: string; status: string }>(
      `SELECT
         ce.id, ce.claim_id, ce.expert_id, ce.role, ce.work_summary, ce.added_at,
         c.claim_number,
         c.status
       FROM claim_experts ce
       JOIN claims c ON c.id = ce.claim_id
       WHERE ce.expert_id = ?
       ORDER BY ce.added_at DESC`
    )
    .all(expertId)

  return rows.map(r => ({
    claimExpert: mapClaimExpert({
      id: r.id,
      claim_id: r.claim_id,
      expert_id: r.expert_id,
      role: r.role,
      work_summary: r.work_summary,
      added_at: r.added_at,
    }),
    claimId: r.claim_id,
    claimNumber: (r as any).claim_number,
    status: (r as any).status,
  }))
}

export function addClaimExpert(input: z.infer<typeof addClaimExpertSchema>): ClaimExpert {
  const result = db
    .prepare<unknown[], { id: number }>(
      `INSERT INTO claim_experts (claim_id, expert_id, role, work_summary)
       VALUES (?, ?, ?, ?)
       RETURNING id`
    )
    .get(input.claimId, input.expertId, input.role ?? '', input.workSummary ?? '')
  if (!result) throw new Error('Failed to add expert to claim')
  logAudit('CREATE', 'claimExpert', result.id, { claimId: input.claimId, expertId: input.expertId })
  const row = db.prepare<[number], RawClaimExpert>(`SELECT * FROM claim_experts WHERE id = ?`).get(result.id)
  if (!row) throw new Error('ClaimExpert not found after insert')
  return mapClaimExpert(row)
}

export function updateClaimExpert(id: number, input: Omit<z.infer<typeof updateClaimExpertSchema>, 'id'>): ClaimExpert | null {
  const fieldMap: Record<string, string> = {
    role:        'role',
    workSummary: 'work_summary',
  }

  const keys = Object.keys(input).filter(k => (input as Record<string, unknown>)[k] !== undefined && k in fieldMap)
  if (keys.length === 0) {
    const row = db.prepare<[number], RawClaimExpert>(`SELECT * FROM claim_experts WHERE id = ?`).get(id)
    return row ? mapClaimExpert(row) : null
  }

  const setClauses = keys.map(k => `${fieldMap[k]} = ?`).join(', ')
  const values = keys.map(k => (input as Record<string, unknown>)[k])

  db.prepare(`UPDATE claim_experts SET ${setClauses} WHERE id = ?`).run(...values, id)
  logAudit('UPDATE', 'claimExpert', id)

  const row = db.prepare<[number], RawClaimExpert>(`SELECT * FROM claim_experts WHERE id = ?`).get(id)
  return row ? mapClaimExpert(row) : null
}

export function removeClaimExpert(id: number): { deleted: boolean } {
  const result = db.prepare(`DELETE FROM claim_experts WHERE id = ?`).run(id)
  if (result.changes > 0) logAudit('DELETE', 'claimExpert', id)
  return { deleted: result.changes > 0 }
}
