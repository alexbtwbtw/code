import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { createExpertSchema, updateExpertSchema, addClaimExpertSchema, updateClaimExpertSchema } from '../schemas/experts'
import {
  listExperts,
  getExpertById,
  createExpert,
  updateExpert,
  deleteExpert,
  getClaimExperts,
  getExpertClaims,
  addClaimExpert,
  updateClaimExpert,
  removeClaimExpert,
} from '../services/experts'

export const expertsRouter = router({
  list: publicProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(({ input }) => listExperts(input.search)),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => getExpertById(input.id)),

  claimsForExpert: publicProcedure
    .input(z.object({ expertId: z.number().int().positive() }))
    .query(({ input }) => getExpertClaims(input.expertId)),

  claimExperts: publicProcedure
    .input(z.object({ claimId: z.number().int().positive() }))
    .query(({ input }) => getClaimExperts(input.claimId)),

  create: publicProcedure
    .input(createExpertSchema)
    .mutation(({ input }) => createExpert(input)),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(updateExpertSchema))
    .mutation(({ input }) => {
      const { id, ...rest } = input
      return updateExpert(id, rest)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteExpert(input.id)),

  addToClaim: publicProcedure
    .input(addClaimExpertSchema)
    .mutation(({ input }) => addClaimExpert(input)),

  updateOnClaim: publicProcedure
    .input(updateClaimExpertSchema)
    .mutation(({ input }) => {
      const { id, ...rest } = input
      return updateClaimExpert(id, rest)
    }),

  removeFromClaim: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => removeClaimExpert(input.id)),
})
