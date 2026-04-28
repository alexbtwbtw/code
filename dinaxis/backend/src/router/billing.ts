import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { createBillingItemSchema, updateBillingItemSchema } from '../schemas/billing'
import {
  getBillingItemsByClaimId, createBillingItem, updateBillingItem,
  deleteBillingItem, getBillingTotals,
} from '../services/billing'

export const billingRouter = router({
  byClaim: publicProcedure
    .input(z.object({ claimId: z.number().int().positive() }))
    .query(({ input }) => getBillingItemsByClaimId(input.claimId)),

  create: publicProcedure
    .input(createBillingItemSchema)
    .mutation(({ input }) => createBillingItem(input)),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(updateBillingItemSchema))
    .mutation(({ input }) => {
      const { id, ...rest } = input
      return updateBillingItem(id, rest)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteBillingItem(input.id)),

  totals: publicProcedure
    .input(z.object({ claimId: z.number().int().positive() }))
    .query(({ input }) => getBillingTotals(input.claimId)),
})
