import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { addDocumentCommentSchema, addClaimCommentSchema } from '../schemas/documents'
import {
  getDocumentsByClaimId,
  getDocumentById,
  getDocumentServeUrl,
  deleteDocument,
  updateDocument,
  addDocumentComment,
  getDocumentComments,
  deleteDocumentComment,
  addClaimComment,
  getClaimComments,
  deleteClaimComment,
} from '../services/documents'

export const documentsRouter = router({
  byClaim: publicProcedure
    .input(z.object({ claimId: z.number().int().positive() }))
    .query(({ input }) => getDocumentsByClaimId(input.claimId)),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => getDocumentById(input.id)),

  serveUrl: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const url = await getDocumentServeUrl(input.id)
      return { url }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => deleteDocument(input.id)),

  update: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      label: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(({ input }) => updateDocument(input.id, { label: input.label, description: input.description })),

  addComment: publicProcedure
    .input(addDocumentCommentSchema)
    .mutation(({ input }) => addDocumentComment(input)),

  comments: publicProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(({ input }) => getDocumentComments(input.documentId)),

  deleteComment: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => deleteDocumentComment(input.id)),

  addClaimComment: publicProcedure
    .input(addClaimCommentSchema)
    .mutation(({ input }) => addClaimComment(input)),

  claimComments: publicProcedure
    .input(z.object({ claimId: z.number().int().positive() }))
    .query(({ input }) => getClaimComments(input.claimId)),

  deleteClaimComment: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => deleteClaimComment(input.id)),
})
