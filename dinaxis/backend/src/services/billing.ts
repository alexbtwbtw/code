import { db } from '../db'
import { mapBillingItem, type BillingItem, type RawBillingItem } from '../types/billing'
import type { createBillingItemSchema, updateBillingItemSchema } from '../schemas/billing'
import type { z } from 'zod'

export function getBillingItemsByClaimId(claimId: number): BillingItem[] {
  const rows = db.prepare('SELECT * FROM billing_items WHERE claim_id = ? ORDER BY created_at ASC').all(claimId) as RawBillingItem[]
  return rows.map(mapBillingItem)
}

export function getBillingItemById(id: number): BillingItem | null {
  const row = db.prepare('SELECT * FROM billing_items WHERE id = ?').get(id) as RawBillingItem | undefined
  return row ? mapBillingItem(row) : null
}

export function createBillingItem(input: z.infer<typeof createBillingItemSchema>): BillingItem {
  const result = db.prepare(
    'INSERT INTO billing_items (claim_id, description, category, amount, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(input.claimId, input.description, input.category, input.amount, input.notes)
  return getBillingItemById(Number(result.lastInsertRowid))!
}

export function updateBillingItem(id: number, input: z.infer<typeof updateBillingItemSchema>): BillingItem | null {
  const fields = Object.entries(input).filter(([, v]) => v !== undefined)
  if (fields.length === 0) return getBillingItemById(id)
  const colMap: Record<string, string> = {
    description: 'description', category: 'category', amount: 'amount', notes: 'notes',
  }
  const setClauses = fields.map(([k]) => `${colMap[k]} = ?`).join(', ')
  const values = fields.map(([, v]) => v)
  db.prepare(`UPDATE billing_items SET ${setClauses} WHERE id = ?`).run(...values, id)
  return getBillingItemById(id)
}

export function deleteBillingItem(id: number): { deleted: boolean } {
  const result = db.prepare('DELETE FROM billing_items WHERE id = ?').run(id)
  return { deleted: result.changes > 0 }
}

export function getBillingTotals(claimId: number): { total: number; itemCount: number } {
  const row = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as itemCount FROM billing_items WHERE claim_id = ?'
  ).get(claimId) as { total: number; itemCount: number }
  return row
}
