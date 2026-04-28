import { z } from 'zod'

export const PROPERTY_TYPES = ['residential', 'commercial', 'industrial', 'other'] as const
export const CLAIM_TYPES = ['property_damage', 'liability', 'auto', 'flood', 'fire', 'theft', 'other'] as const
export const CLAIM_STATUSES = ['new', 'assigned', 'inspection_scheduled', 'inspected', 'report_pending', 'submitted', 'closed', 'disputed'] as const

export const createClaimSchema = z.object({
  claimNumber: z.string().min(1).max(50),
  insurerId: z.number().int().positive().nullable().default(null),
  claimantName: z.string().max(200).default(''),
  claimantEmail: z.string().max(200).default(''),
  claimantPhone: z.string().max(50).default(''),
  propertyAddress: z.string().max(500).default(''),
  propertyType: z.enum(PROPERTY_TYPES).default('residential'),
  claimType: z.enum(CLAIM_TYPES).default('property_damage'),
  customTypeName: z.string().max(200).default(''),
  status: z.enum(CLAIM_STATUSES).default('new'),
  dateOpened: z.string().default(() => new Date().toISOString().slice(0, 10)),
  dateClosed: z.string().nullable().default(null),
  estimatedValue: z.number().nullable().default(null),
  finalSettlement: z.number().nullable().default(null),
  adjusterNotes: z.string().max(10000).default(''),
  description: z.string().max(10000).default(''),
})

export const updateClaimSchema = z.object({
  insurerId: z.number().int().positive().nullable().optional(),
  claimantName: z.string().max(200).optional(),
  claimantEmail: z.string().max(200).optional(),
  claimantPhone: z.string().max(50).optional(),
  propertyAddress: z.string().max(500).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  claimType: z.enum(CLAIM_TYPES).optional(),
  customTypeName: z.string().max(200).optional(),
  status: z.enum(CLAIM_STATUSES).optional(),
  dateOpened: z.string().optional(),
  dateClosed: z.string().nullable().optional(),
  estimatedValue: z.number().nullable().optional(),
  finalSettlement: z.number().nullable().optional(),
  adjusterNotes: z.string().max(10000).optional(),
  description: z.string().max(10000).optional(),
})

export const listClaimsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(CLAIM_STATUSES).optional(),
  claimType: z.enum(CLAIM_TYPES).optional(),
  insurerId: z.number().int().positive().optional(),
  sortBy: z.enum(['newest', 'oldest', 'value_desc', 'value_asc']).default('newest'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
})
