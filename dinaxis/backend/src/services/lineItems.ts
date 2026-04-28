import { z } from 'zod'
import { db } from '../db'
import { LineItem, RawLineItem, mapLineItem, LineItemPhoto, RawLineItemPhoto, mapLineItemPhoto } from '../types/lineItems'
import { createLineItemSchema, updateLineItemSchema } from '../schemas/lineItems'
import { getStorageAdapter } from '../lib/storage'

export function getLineItemsByClaimId(claimId: number): LineItem[] {
  const rows = db
    .prepare<[number], RawLineItem>(
      `SELECT * FROM line_items WHERE claim_id = ? ORDER BY created_at ASC`
    )
    .all(claimId)
  return rows.map(mapLineItem)
}

export function getLineItemById(id: number): LineItem | null {
  const row = db
    .prepare<[number], RawLineItem>(`SELECT * FROM line_items WHERE id = ?`)
    .get(id)
  return row ? mapLineItem(row) : null
}

export function createLineItem(input: z.infer<typeof createLineItemSchema>): LineItem {
  const result = db
    .prepare<unknown[], { id: number }>(
      `INSERT INTO line_items (claim_id, description, category, estimated_cost, approved_cost, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id`
    )
    .get(
      input.claimId,
      input.description,
      input.category ?? 'other',
      input.estimatedCost ?? 0,
      input.approvedCost ?? null,
      input.notes ?? '',
    )
  if (!result) throw new Error('Failed to create line item')
  const row = db
    .prepare<[number], RawLineItem>(`SELECT * FROM line_items WHERE id = ?`)
    .get(result.id)
  if (!row) throw new Error('Line item not found after insert')
  return mapLineItem(row)
}

export function updateLineItem(
  id: number,
  input: z.infer<typeof updateLineItemSchema>,
): LineItem | null {
  const fieldMap: Record<string, string> = {
    description: 'description',
    category: 'category',
    estimatedCost: 'estimated_cost',
    approvedCost: 'approved_cost',
    notes: 'notes',
  }

  const keys = Object.keys(input).filter((k) => k in fieldMap)
  if (keys.length === 0) return getLineItemById(id)

  const setClauses = keys.map((k) => `${fieldMap[k]} = ?`).join(', ')
  const values = keys.map((k) => (input as Record<string, unknown>)[k] ?? null)

  db.prepare(`UPDATE line_items SET ${setClauses} WHERE id = ?`).run(...values, id)

  return getLineItemById(id)
}

export function deleteLineItem(id: number): { deleted: boolean } {
  const result = db.prepare(`DELETE FROM line_items WHERE id = ?`).run(id)
  return { deleted: result.changes > 0 }
}

export function listLineItemPhotos(lineItemId: number): LineItemPhoto[] {
  const rows = db
    .prepare<[number], RawLineItemPhoto>(
      `SELECT * FROM line_item_photos WHERE line_item_id = ? ORDER BY uploaded_at ASC`
    )
    .all(lineItemId)
  return rows.map(mapLineItemPhoto)
}

export function getLineItemPhoto(id: string): LineItemPhoto | null {
  const row = db
    .prepare<[string], RawLineItemPhoto>(`SELECT * FROM line_item_photos WHERE id = ?`)
    .get(id)
  return row ? mapLineItemPhoto(row) : null
}

export function createLineItemPhoto(data: {
  id: string
  lineItemId: number
  filename: string
  mimeType: string
  storageKey: string
  storageAdapter: string
  sizeBytes: number
}): LineItemPhoto {
  db.prepare<unknown[]>(
    `INSERT INTO line_item_photos (id, line_item_id, filename, mime_type, storage_key, storage_adapter, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(data.id, data.lineItemId, data.filename, data.mimeType, data.storageKey, data.storageAdapter, data.sizeBytes)
  const row = db
    .prepare<[string], RawLineItemPhoto>(`SELECT * FROM line_item_photos WHERE id = ?`)
    .get(data.id)
  if (!row) throw new Error('Line item photo not found after insert')
  return mapLineItemPhoto(row)
}

export function deleteLineItemPhoto(id: string): { deleted: boolean; storageKey?: string; storageAdapter?: string } {
  const photo = getLineItemPhoto(id)
  if (!photo) return { deleted: false }
  try {
    getStorageAdapter().delete(photo.storageKey)
  } catch {
    // storage delete failures should not block DB delete
  }
  const result = db.prepare(`DELETE FROM line_item_photos WHERE id = ?`).run(id)
  return { deleted: result.changes > 0, storageKey: photo.storageKey, storageAdapter: photo.storageAdapter }
}

export function getClaimTotals(
  claimId: number,
): { estimatedTotal: number; approvedTotal: number; itemCount: number } {
  const row = db
    .prepare<
      [number],
      { estimated_total: number; approved_total: number; item_count: number }
    >(
      `SELECT
         COALESCE(SUM(estimated_cost), 0)            AS estimated_total,
         COALESCE(SUM(COALESCE(approved_cost, 0)), 0) AS approved_total,
         COUNT(*)                                    AS item_count
       FROM line_items
       WHERE claim_id = ?`
    )
    .get(claimId)

  return {
    estimatedTotal: row?.estimated_total ?? 0,
    approvedTotal: row?.approved_total ?? 0,
    itemCount: row?.item_count ?? 0,
  }
}
