import { z } from 'zod'

export const createInspectionSchema = z.object({
  claimId: z.number().int().positive(),
  scheduledDate: z.string().nullable().default(null),
  completedDate: z.string().nullable().default(null),
  findings: z.string().default(''),
  adjusterNotes: z.string().default(''),
  latitude: z.number().nullable().default(null),
  longitude: z.number().nullable().default(null),
})

export const updateInspectionSchema = createInspectionSchema.partial().omit({ claimId: true })
