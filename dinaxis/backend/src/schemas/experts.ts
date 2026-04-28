import { z } from 'zod'

export const createExpertSchema = z.object({
  name:      z.string().min(1).max(200),
  specialty: z.string().max(200).default(''),
  email:     z.string().max(200).default(''),
  phone:     z.string().max(50).default(''),
  notes:     z.string().max(2000).default(''),
})

export const updateExpertSchema = createExpertSchema.partial()

export const addClaimExpertSchema = z.object({
  claimId:     z.number().int().positive(),
  expertId:    z.number().int().positive(),
  role:        z.string().max(200).default(''),
  workSummary: z.string().max(2000).default(''),
})

export const updateClaimExpertSchema = z.object({
  id:          z.number().int().positive(),
  role:        z.string().max(200).optional(),
  workSummary: z.string().max(2000).optional(),
})
