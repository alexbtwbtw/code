import { z } from 'zod'
import { router, authedProcedure, managerProcedure } from '../trpc'
import { type RawGeo, mapGeo } from '../types/geo'
import { CreateGeoEntrySchema } from '../schemas/geo'
import * as geoService from '../services/geo'
import { logAudit } from '../services/audit'

export { type RawGeo, mapGeo, CreateGeoEntrySchema }

export const geoRouter = router({
  byProject: authedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => geoService.getGeoByProject(input.projectId)),

  create: managerProcedure
    .input(CreateGeoEntrySchema)
    .mutation(({ ctx, input }) => {
      const entry = geoService.createGeoEntry(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'geo_entries', (entry as { id: number }).id)
      return entry
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = geoService.deleteGeoEntry(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'geo_entries', input.id)
      return result
    }),
})
