import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { type RawFeature, mapFeature } from '../types/features'
import { CreateFeatureSchema } from '../schemas/features'
import * as featuresService from '../services/features'

export { type RawFeature, mapFeature, CreateFeatureSchema }
export type { FeatureInput } from '../schemas/features'

export const featuresRouter = router({
  byProject: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => featuresService.getFeaturesByProject(input.projectId)),

  create: publicProcedure
    .input(CreateFeatureSchema)
    .mutation(({ input }) => featuresService.createFeature(input)),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => featuresService.deleteFeature(input.id)),
})
