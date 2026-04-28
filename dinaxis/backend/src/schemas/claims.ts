import { z } from 'zod'

export const PROPERTY_TYPES = ['residential', 'commercial', 'industrial', 'other'] as const
export const CLAIM_TYPES = ['property_damage', 'liability', 'auto', 'flood', 'fire', 'theft', 'other'] as const
export const CLAIM_STATUSES = ['new', 'assigned', 'inspection_scheduled', 'inspected', 'report_pending', 'submitted', 'closed', 'disputed'] as const

export const createClaimSchema = z.object({
  claimNumber: z.string().min(1),
  insurerId: z.number().int().positive().nullable().default(null),
  claimantName: z.string().default(''),
  claimantEmail: z.string().default(''),
  claimantPhone: z.string().default(''),
  propertyAddress: z.string().default(''),
  propertyType: z.enum(PROPERTY_TYPES).default('residential'),
  claimType: z.enum(CLAIM_TYPES).default('property_damage'),
  customTypeName: z.string().default(''),
  status: z.enum(CLAIM_STATUSES).default('new'),
  dateOpened: z.string().default(() => new Date().toISOString().slice(0, 10)),
  dateClosed: z.string().nullable().default(null),
  estimatedValue: z.number().nullable().default(null),
  finalSettlement: z.number().nullable().default(null),
  adjusterNotes: z.string().default(''),
  description: z.string().default(''),
})

export const updateClaimSchema = createClaimSchema.partial().omit({ claimNumber: true })

export const listClaimsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(CLAIM_STATUSES).optional(),
  claimType: z.enum(CLAIM_TYPES).optional(),
  insurerId: z.number().int().positive().optional(),
  sortBy: z.enum(['newest', 'oldest', 'value_desc', 'value_asc']).default('newest'),
})
