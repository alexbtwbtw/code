import { db } from '../db'
import { logAudit } from '../lib/audit'
import { mapInvoice, mapInvoiceItem, type Invoice, type InvoiceItem, type InvoiceStatus, type RawInvoice, type RawInvoiceItem } from '../types/invoices'
import type { createInvoiceSchema } from '../schemas/invoices'
import type { z } from 'zod'

export function getInvoicesByClaimId(claimId: number): Invoice[] {
  const rows = db.prepare('SELECT * FROM invoices WHERE claim_id = ? ORDER BY created_at ASC').all(claimId) as RawInvoice[]
  return rows.map(mapInvoice)
}

export function getInvoiceById(id: string): Invoice | null {
  const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as RawInvoice | undefined
  return row ? mapInvoice(row) : null
}

export function getInvoiceItems(invoiceId: string): InvoiceItem[] {
  const rows = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC').all(invoiceId) as RawInvoiceItem[]
  return rows.map(mapInvoiceItem)
}

export function getInvoiceIdsForLineItem(lineItemId: number): string[] {
  const rows = db.prepare(
    "SELECT invoice_id FROM invoice_items WHERE item_type = 'line_item' AND item_id = ?"
  ).all(lineItemId) as { invoice_id: string }[]
  return rows.map(r => r.invoice_id)
}

export function getInvoiceIdsForBillingItem(billingItemId: number): string[] {
  const rows = db.prepare(
    "SELECT invoice_id FROM invoice_items WHERE item_type = 'billing_item' AND item_id = ?"
  ).all(billingItemId) as { invoice_id: string }[]
  return rows.map(r => r.invoice_id)
}

export function createInvoice(input: z.infer<typeof createInvoiceSchema>): Invoice {
  const id = crypto.randomUUID()
  const year = new Date().getFullYear()
  const row = db.prepare("SELECT COUNT(*) as n FROM invoices WHERE invoice_number LIKE ?").get(`FAT-${year}-%`) as { n: number }
  const seq = String(row.n + 1).padStart(4, '0')
  const invoiceNumber = `FAT-${year}-${seq}`

  const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0)

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, claim_id, invoice_number, status, issued_date, due_date, notes, total_amount)
    VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)
  `)

  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, item_type, item_id, description, quantity, unit_price, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const doCreate = db.transaction(() => {
    insertInvoice.run(id, input.claimId, invoiceNumber, input.issuedDate, input.dueDate ?? null, input.notes, totalAmount)
    for (const item of input.items) {
      insertItem.run(id, item.itemType, item.itemId, item.description, item.quantity, item.unitPrice, item.amount)
    }
  })

  doCreate()
  logAudit('CREATE', 'invoice', id, { claimId: input.claimId, invoiceNumber, totalAmount })
  return getInvoiceById(id)!
}

export function updateInvoiceStatus(id: string, status: InvoiceStatus): Invoice | null {
  db.prepare("UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id)
  logAudit('UPDATE', 'invoice', id, { status })
  return getInvoiceById(id)
}

export function deleteInvoice(id: string): { deleted: boolean } {
  const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(id)
  if (result.changes > 0) logAudit('DELETE', 'invoice', id)
  return { deleted: result.changes > 0 }
}
