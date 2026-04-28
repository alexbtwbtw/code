import { db } from '../db'
import { createInvoice, updateInvoiceStatus } from '../services/invoices'
import { generateInvoicePdf } from '../services/invoicePdf'

/**
 * Seed invoices for 8 claims in closed, inspected, or submitted status.
 * Uses createInvoice() from services (which handles invoice_number sequencing).
 * PDF is generated via generateInvoicePdf() after each invoice is created.
 *
 * Claim indices (0-based):
 *   0,1,2   → closed    (CLM-2025-0001/0002/0003)  → status: paid
 *   7,8,9   → inspected (CLM-2025-0008/0009/0010)  → status: sent
 *   12,13   → submitted (CLM-2026-0013/0014)       → status: sent
 */

type ItemInput = {
  itemType: 'line_item' | 'billing_item'
  itemId: number
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface InvoiceSpec {
  claimIdx: number
  issuedDate: string
  dueDate: string
  notes: string
  finalStatus: 'sent' | 'paid'
  // Each entry: [itemType, idxInList] — picks from the ID arrays by position
  lineItemIndices: number[]
  billingItemIndices: number[]
}

const INVOICE_SPECS: InvoiceSpec[] = [
  // ── CLM-2025-0001 Danos Materiais / closed → paid ──────────────────────────
  {
    claimIdx: 0,
    issuedDate: '2025-12-15',
    dueDate: '2026-01-14',
    notes: 'Fatura relativa às reparações estruturais (telhado, frechal, caleiras) e honorários de peritagem — Sinistro CLM-2025-0001.',
    finalStatus: 'paid',
    lineItemIndices: [0, 1, 2],   // telhas, frechal, caleiras
    billingItemIndices: [0, 1],   // honorários Ferreira, deslocação
  },

  // ── CLM-2025-0002 Incêndio Comercial / closed → paid ──────────────────────
  {
    claimIdx: 1,
    issuedDate: '2026-01-25',
    dueDate: '2026-02-24',
    notes: 'Fatura relativa à reconstrução pós-incêndio e honorários de peritagem — Sinistro CLM-2025-0002.',
    finalStatus: 'paid',
    lineItemIndices: [0, 1, 4],   // arrecadação, armazém, eléctrico
    billingItemIndices: [0, 1],   // honorários Mendonça, honorários Ferreira
  },

  // ── CLM-2025-0003 Responsabilidade Civil / closed → paid ──────────────────
  {
    claimIdx: 2,
    issuedDate: '2026-02-20',
    dueDate: '2026-03-22',
    notes: 'Fatura relativa à peritagem e acompanhamento jurídico do processo de responsabilidade civil — Sinistro CLM-2025-0003.',
    finalStatus: 'paid',
    lineItemIndices: [0, 2],      // despesas médicas, danos morais
    billingItemIndices: [0, 1],   // honorários Lopes, honorários advogado
  },

  // ── CLM-2025-0008 Incêndio Residencial / inspected → sent ─────────────────
  {
    claimIdx: 7,
    issuedDate: '2025-12-20',
    dueDate: '2026-01-19',
    notes: 'Fatura relativa à peritagem de incêndio na garagem e avaliação dos danos estruturais e de conteúdos — Sinistro CLM-2025-0008.',
    finalStatus: 'sent',
    lineItemIndices: [0, 1, 3],   // parede separação, remediação garagem, automóvel perda total
    billingItemIndices: [0, 1],   // honorários Mendonça, deslocação
  },

  // ── CLM-2025-0009 RC Supermercado / inspected → sent ─────────────────────
  {
    claimIdx: 8,
    issuedDate: '2025-12-22',
    dueDate: '2026-01-21',
    notes: 'Fatura relativa à peritagem de local e avaliação da responsabilidade civil — Sinistro CLM-2025-0009.',
    finalStatus: 'sent',
    lineItemIndices: [0, 1],      // despesas médicas, incapacidade
    billingItemIndices: [0, 1],   // honorários Lopes, deslocação
  },

  // ── CLM-2025-0010 Inundação Industrial / inspected → sent ─────────────────
  {
    claimIdx: 9,
    issuedDate: '2026-01-20',
    dueDate: '2026-02-19',
    notes: 'Fatura parcial relativa à peritagem e remediação da inundação industrial — Sinistro CLM-2025-0010.',
    finalStatus: 'sent',
    lineItemIndices: [0, 1, 4],   // remediação, eléctrico, stock
    billingItemIndices: [0, 1],   // honorários Baptista, honorários Ferreira
  },

  // ── CLM-2026-0013 Danos Materiais Clínica / submitted → sent ──────────────
  {
    claimIdx: 12,
    issuedDate: '2026-02-16',
    dueDate: '2026-03-18',
    notes: 'Fatura parcial relativa à peritagem conjunta e avaliação dos danos na clínica — Sinistro CLM-2026-0013.',
    finalStatus: 'sent',
    lineItemIndices: [0, 1, 4],   // tecto derm, tecto lab, equipamento médico
    billingItemIndices: [0, 1],   // honorários Ferreira+Lopes, deslocação
  },

  // ── CLM-2026-0014 Incêndio Residencial Porto / submitted → sent ────────────
  {
    claimIdx: 13,
    issuedDate: '2026-03-01',
    dueDate: '2026-03-31',
    notes: 'Fatura relativa à peritagem de incêndio e avaliação dos danos na cozinha e sala — Sinistro CLM-2026-0014.',
    finalStatus: 'sent',
    lineItemIndices: [0, 1],      // cozinha, limpeza fumo
    billingItemIndices: [0, 1],   // honorários Mendonça, deslocação
  },
]

export async function seedInvoices(
  claimIds: number[],
  lineItemIdsByClaimIdx: Record<number, number[]>,
  billingItemIdsByClaimIdx: Record<number, number[]>
): Promise<void> {
  const getLineItem = db.prepare<[number], { description: string; estimated_cost: number; approved_cost: number | null }>(
    'SELECT description, estimated_cost, approved_cost FROM line_items WHERE id = ?'
  )
  const getBillingItem = db.prepare<[number], { description: string; amount: number }>(
    'SELECT description, amount FROM billing_items WHERE id = ?'
  )

  for (const spec of INVOICE_SPECS) {
    const claimId = claimIds[spec.claimIdx]
    if (!claimId) continue

    const lineIds = lineItemIdsByClaimIdx[spec.claimIdx] ?? []
    const billingIds = billingItemIdsByClaimIdx[spec.claimIdx] ?? []

    const items: ItemInput[] = []

    for (const idx of spec.lineItemIndices) {
      const id = lineIds[idx]
      if (id == null) continue
      const row = getLineItem.get(id)
      if (!row) continue
      const cost = row.approved_cost ?? row.estimated_cost
      items.push({ itemType: 'line_item', itemId: id, description: row.description, quantity: 1, unitPrice: cost, amount: cost })
    }

    for (const idx of spec.billingItemIndices) {
      const id = billingIds[idx]
      if (id == null) continue
      const row = getBillingItem.get(id)
      if (!row) continue
      items.push({ itemType: 'billing_item', itemId: id, description: row.description, quantity: 1, unitPrice: row.amount, amount: row.amount })
    }

    if (items.length === 0) continue

    // createInvoice handles invoice_number sequencing + DB insert
    const inv = createInvoice({
      claimId,
      issuedDate: spec.issuedDate,
      dueDate: spec.dueDate,
      notes: spec.notes,
      items,
    })

    // Set final status (createInvoice always creates as 'draft')
    updateInvoiceStatus(inv.id, spec.finalStatus)

    // Generate and store PDF (non-fatal if it fails)
    try {
      await generateInvoicePdf(inv.id)
    } catch {
      // Non-fatal — PDF generation failure should not block seeding
    }
  }
}
