import { z } from 'zod'

export const LINE_ITEM_CATEGORIES = ['structure', 'contents', 'auto', 'labor', 'other'] as const

export const createLineItemSchema = z.object({
  claimId: z.number().int().positive(),
  description: z.string().min(1).max(500),
  category: z.enum(LINE_ITEM_CATEGORIES).default('other'),
  estimatedCost: z.number().min(0).default(0),
  approvedCost: z.number().nullable().default(null),
  notes: z.string().max(5000).default(''),
})

export const updateLineItemSchema = createLineItemSchema.partial().omit({ claimId: true })
