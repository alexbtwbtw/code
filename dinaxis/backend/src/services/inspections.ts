import { z } from 'zod'
import { db } from '../db'
import { Inspection, RawInspection, mapInspection } from '../types/inspections'
import { createInspectionSchema, updateInspectionSchema } from '../schemas/inspections'

export function getInspectionsByClaimId(claimId: number): Inspection[] {
  const rows = db
    .prepare<[number], RawInspection>(
      `SELECT * FROM inspections WHERE claim_id = ? ORDER BY created_at ASC`
    )
    .all(claimId)
  return rows.map(mapInspection)
}

export function getInspectionById(id: number): Inspection | null {
  const row = db
    .prepare<[number], RawInspection>(`SELECT * FROM inspections WHERE id = ?`)
    .get(id)
  return row ? mapInspection(row) : null
}

export function createInspection(input: z.infer<typeof createInspectionSchema>): Inspection {
  const result = db
    .prepare<unknown[], { id: number }>(
      `INSERT INTO inspections (claim_id, scheduled_date, completed_date, findings, adjuster_notes, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING id`
    )
    .get(
      input.claimId,
      input.scheduledDate ?? null,
      input.completedDate ?? null,
      input.findings ?? '',
      input.adjusterNotes ?? '',
      input.latitude ?? null,
      input.longitude ?? null,
    )
  if (!result) throw new Error('Failed to create inspection')
  const row = db
    .prepare<[number], RawInspection>(`SELECT * FROM inspections WHERE id = ?`)
    .get(result.id)
  if (!row) throw new Error('Inspection not found after insert')
  return mapInspection(row)
}

export function updateInspection(
  id: number,
  input: z.infer<typeof updateInspectionSchema>,
): Inspection | null {
  const fieldMap: Record<string, string> = {
    scheduledDate: 'scheduled_date',
    completedDate: 'completed_date',
    findings: 'findings',
    adjusterNotes: 'adjuster_notes',
    latitude: 'latitude',
    longitude: 'longitude',
  }

  const keys = Object.keys(input).filter((k) => k in fieldMap)
  if (keys.length === 0) return getInspectionById(id)

  const setClauses = keys.map((k) => `${fieldMap[k]} = ?`).join(', ')
  const values = keys.map((k) => (input as Record<string, unknown>)[k] ?? null)

  db.prepare(`UPDATE inspections SET ${setClauses} WHERE id = ?`).run(...values, id)

  return getInspectionById(id)
}

export function deleteInspection(id: number): { deleted: boolean } {
  const result = db.prepare(`DELETE FROM inspections WHERE id = ?`).run(id)
  return { deleted: result.changes > 0 }
}

export function getUpcomingInspections(limit: number): Inspection[] {
  const rows = db
    .prepare<[number], RawInspection>(
      `SELECT * FROM inspections
       WHERE scheduled_date > date('now') AND completed_date IS NULL
       ORDER BY scheduled_date ASC
       LIMIT ?`
    )
    .all(limit)
  return rows.map(mapInspection)
}
