import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { createInspectionSchema, updateInspectionSchema } from '../schemas/inspections'
import {
  getInspectionsByClaimId,
  getInspectionById,
  createInspection,
  updateInspection,
  deleteInspection,
  getUpcomingInspections,
} from '../services/inspections'

export const inspectionsRouter = router({
  byClaim: publicProcedure
    .input(z.object({ claimId: z.number().int().positive() }))
    .query(({ input }) => getInspectionsByClaimId(input.claimId)),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => getInspectionById(input.id)),

  create: publicProcedure
    .input(createInspectionSchema)
    .mutation(({ input }) => createInspection(input)),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(updateInspectionSchema))
    .mutation(({ input }) => {
      const { id, ...rest } = input
      return updateInspection(id, rest)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteInspection(input.id)),

  upcoming: publicProcedure
    .input(z.object({ limit: z.number().int().positive().default(10) }))
    .query(({ input }) => getUpcomingInspections(input.limit)),
})
