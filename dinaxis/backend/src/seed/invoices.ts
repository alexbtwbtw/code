import { db } from '../db'
import { randomUUID } from 'crypto'
import { generateInvoicePdf } from '../services/invoicePdf'

// Closed claims indices: 0 (CLM-2025-0001), 1 (CLM-2025-0002), 2 (CLM-2025-0003)
// Submitted claims indices: 12 (CLM-2026-0013), 13 (CLM-2026-0014)
const INVOICE_CLAIM_INDICES = [0, 1, 2, 12, 13]

// Invoice data per claim index
const invoiceData: Record<number, {
  issuedDate: string
  dueDate: string
  notes: string
  status: 'sent' | 'paid'
  lineItemCount: number
  billingItemCount: number
}> = {
  0: {
    issuedDate: '2025-12-15',
    dueDate: '2026-01-14',
    notes: 'Fatura relativa aos honorários de peritagem do sinistro CLM-2025-0001. Inclui duas vistorias ao local e relatório técnico final.',
    status: 'paid',
    lineItemCount: 2,
    billingItemCount: 2,
  },
  1: {
    issuedDate: '2026-01-25',
    dueDate: '2026-02-24',
    notes: 'Fatura relativa aos honorários de peritagem do sinistro CLM-2025-0002. Inclui duas vistorias (peritagem de incêndio e avaliação estrutural), relatórios técnicos e acompanhamento do processo.',
    status: 'sent',
    lineItemCount: 3,
    billingItemCount: 2,
  },
  2: {
    issuedDate: '2026-02-20',
    dueDate: '2026-03-22',
    notes: 'Fatura relativa aos honorários de peritagem e acompanhamento jurídico do sinistro CLM-2025-0003. Processo de responsabilidade civil concluído com acordo extrajudicial.',
    status: 'paid',
    lineItemCount: 2,
    billingItemCount: 2,
  },
  12: {
    issuedDate: '2026-02-16',
    dueDate: '2026-03-18',
    notes: 'Fatura parcial relativa aos honorários de peritagem do sinistro CLM-2026-0013 (Clínica São Lucas). Inclui vistoria ao local, relatório técnico e acompanhamento até submissão à seguradora.',
    status: 'sent',
    lineItemCount: 3,
    billingItemCount: 1,
  },
  13: {
    issuedDate: '2026-03-01',
    dueDate: '2026-03-31',
    notes: 'Fatura relativa aos honorários de peritagem do sinistro CLM-2026-0014 (incêndio residencial Porto). Inclui vistoria, investigação de causa e relatório técnico de incêndio.',
    status: 'sent',
    lineItemCount: 2,
    billingItemCount: 1,
  },
}

export async function seedInvoices(
  claimIds: number[],
  lineItemIdsByClaimIdx: Record<number, number[]>,
  billingItemIdsByClaimIdx: Record<number, number[]>
): Promise<void> {
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, claim_id, invoice_number, status, issued_date, due_date, notes, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, item_type, item_id, description, quantity, unit_price, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  // Get descriptions and costs for items
  const getLineItem = db.prepare<[number], { description: string; estimated_cost: number; approved_cost: number | null }>(
    'SELECT description, estimated_cost, approved_cost FROM line_items WHERE id = ?'
  )
  const getBillingItem = db.prepare<[number], { description: string; amount: number }>(
    'SELECT description, amount FROM billing_items WHERE id = ?'
  )

  // Invoice sequence counter per year
  const invoiceCounters: Record<string, number> = {}

  function getNextInvoiceNumber(issuedDate: string): string {
    const year = issuedDate.slice(0, 4)
    if (!invoiceCounters[year]) {
      // Check existing invoices for this year
      const existing = db.prepare("SELECT COUNT(*) as n FROM invoices WHERE invoice_number LIKE ?").get(`FAT-${year}-%`) as { n: number }
      invoiceCounters[year] = existing.n
    }
    invoiceCounters[year]++
    return `FAT-${year}-${String(invoiceCounters[year]).padStart(4, '0')}`
  }

  for (const claimIdx of INVOICE_CLAIM_INDICES) {
    const claimId = claimIds[claimIdx]
    if (!claimId) continue

    const data = invoiceData[claimIdx]
    if (!data) continue

    const lineIds = lineItemIdsByClaimIdx[claimIdx] ?? []
    const billingIds = billingItemIdsByClaimIdx[claimIdx] ?? []

    // Select a subset of line items and billing items
    const selectedLineIds = lineIds.slice(0, data.lineItemCount)
    const selectedBillingIds = billingIds.slice(0, data.billingItemCount)

    // Build invoice items
    type InvoiceItemData = { itemType: string; itemId: number; description: string; quantity: number; unitPrice: number; amount: number }
    const invoiceItems: InvoiceItemData[] = []

    for (const lineId of selectedLineIds) {
      const row = getLineItem.get(lineId)
      if (!row) continue
      const cost = row.approved_cost ?? row.estimated_cost
      invoiceItems.push({
        itemType: 'line_item',
        itemId: lineId,
        description: row.description,
        quantity: 1,
        unitPrice: cost,
        amount: cost,
      })
    }

    for (const billingId of selectedBillingIds) {
      const row = getBillingItem.get(billingId)
      if (!row) continue
      invoiceItems.push({
        itemType: 'billing_item',
        itemId: billingId,
        description: row.description,
        quantity: 1,
        unitPrice: row.amount,
        amount: row.amount,
      })
    }

    if (invoiceItems.length === 0) continue

    const totalAmount = invoiceItems.reduce((s, it) => s + it.amount, 0)
    const invoiceId = randomUUID()
    const invoiceNumber = getNextInvoiceNumber(data.issuedDate)

    const doInsert = db.transaction(() => {
      insertInvoice.run(
        invoiceId,
        claimId,
        invoiceNumber,
        data.status,
        data.issuedDate,
        data.dueDate,
        data.notes,
        totalAmount
      )
      for (const item of invoiceItems) {
        insertItem.run(
          invoiceId,
          item.itemType,
          item.itemId,
          item.description,
          item.quantity,
          item.unitPrice,
          item.amount
        )
      }
    })
    doInsert()

    // Generate PDF and store it
    try {
      await generateInvoicePdf(invoiceId)
    } catch {
      // Non-fatal — PDF generation failure should not block seeding
    }
  }
}
