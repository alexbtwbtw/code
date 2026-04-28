import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { createClaimSchema, updateClaimSchema, listClaimsSchema } from '../schemas/claims'
import {
  listClaims,
  getClaimById,
  createClaim,
  updateClaim,
  deleteClaim,
  getClaimStats,
  getRecentClaims,
  listCustomClaimTypes,
  addCustomClaimType,
} from '../services/claims'

export const claimsRouter = router({
  list: publicProcedure
    .input(listClaimsSchema)
    .query(({ input }) => listClaims(input)),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => getClaimById(input.id)),

  create: publicProcedure
    .input(createClaimSchema)
    .mutation(({ input }) => createClaim(input)),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(updateClaimSchema))
    .mutation(({ input }) => {
      const { id, ...rest } = input
      return updateClaim(id, rest)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteClaim(input.id)),

  stats: publicProcedure.query(() => getClaimStats()),

  recent: publicProcedure
    .input(z.object({ limit: z.number().int().positive().default(5) }))
    .query(({ input }) => getRecentClaims(input.limit)),

  customTypes: publicProcedure.query(() => listCustomClaimTypes()),

  addCustomType: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ input }) => addCustomClaimType(input.name)),
})
