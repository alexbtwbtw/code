import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { createLineItemSchema, updateLineItemSchema } from '../schemas/lineItems'
import {
  getLineItemsByClaimId,
  getLineItemById,
  createLineItem,
  updateLineItem,
  deleteLineItem,
  getClaimTotals,
  listLineItemPhotos,
  deleteLineItemPhoto,
} from '../services/lineItems'

export const lineItemsRouter = router({
  byClaim: publicProcedure
    .input(z.object({ claimId: z.number().int().positive() }))
    .query(({ input }) => getLineItemsByClaimId(input.claimId)),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => getLineItemById(input.id)),

  create: publicProcedure
    .input(createLineItemSchema)
    .mutation(({ input }) => createLineItem(input)),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(updateLineItemSchema))
    .mutation(({ input }) => {
      const { id, ...rest } = input
      return updateLineItem(id, rest)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteLineItem(input.id)),

  totals: publicProcedure
    .input(z.object({ claimId: z.number().int().positive() }))
    .query(({ input }) => getClaimTotals(input.claimId)),

  photosByItem: publicProcedure
    .input(z.object({ lineItemId: z.number().int().positive() }))
    .query(({ input }) => listLineItemPhotos(input.lineItemId)),

  deletePhoto: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => deleteLineItemPhoto(input.id)),
})
