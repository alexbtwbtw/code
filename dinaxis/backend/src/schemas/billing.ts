import { z } from 'zod'

export const BILLING_CATEGORIES = ['travel', 'expert', 'photos', 'admin', 'fees', 'other'] as const

export const createBillingItemSchema = z.object({
  claimId: z.number().int().positive(),
  description: z.string().min(1),
  category: z.enum(BILLING_CATEGORIES).default('other'),
  amount: z.number().min(0).default(0),
  notes: z.string().default(''),
})

export const updateBillingItemSchema = createBillingItemSchema.partial().omit({ claimId: true })
