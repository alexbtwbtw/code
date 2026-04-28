import { z } from 'zod'

export const addDocumentCommentSchema = z.object({
  documentId: z.string().uuid(),
  text: z.string().min(1),
})

export const addClaimCommentSchema = z.object({
  claimId: z.number().int().positive(),
  text: z.string().min(1),
})
