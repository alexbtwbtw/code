import { z } from 'zod'

export const INVOICE_STATUSES = ['draft', 'sent', 'paid'] as const

const invoiceItemInputSchema = z.object({
  itemType: z.enum(['line_item', 'billing_item']),
  itemId: z.number().int().positive(),
  description: z.string().max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
})

export const createInvoiceSchema = z.object({
  claimId: z.number().int().positive(),
  issuedDate: z.string(),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).default(''),
  items: z.array(invoiceItemInputSchema).min(1),
})

export const updateInvoiceStatusSchema = z.object({
  id: z.string(),
  status: z.enum(INVOICE_STATUSES),
})
