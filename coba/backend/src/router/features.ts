import { z } from 'zod'
import { router, authedProcedure, managerProcedure } from '../trpc'
import { type RawFeature, mapFeature } from '../types/features'
import { CreateFeatureSchema } from '../schemas/features'
import * as featuresService from '../services/features'
import { logAudit } from '../services/audit'

export { type RawFeature, mapFeature, CreateFeatureSchema }
export type { FeatureInput } from '../schemas/features'

export const featuresRouter = router({
  byProject: authedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => featuresService.getFeaturesByProject(input.projectId)),

  create: managerProcedure
    .input(CreateFeatureSchema)
    .mutation(({ ctx, input }) => {
      const feature = featuresService.createFeature(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'project_features', (feature as { id: number }).id)
      return feature
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = featuresService.deleteFeature(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'project_features', input.id)
      return result
    }),
})
