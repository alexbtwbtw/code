import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { type RawGeo, mapGeo } from '../types/geo'
import { CreateGeoEntrySchema } from '../schemas/geo'
import * as geoService from '../services/geo'

export { type RawGeo, mapGeo, CreateGeoEntrySchema }

export const geoRouter = router({
  byProject: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => geoService.getGeoByProject(input.projectId)),

  create: publicProcedure
    .input(CreateGeoEntrySchema)
    .mutation(({ input }) => geoService.createGeoEntry(input)),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => geoService.deleteGeoEntry(input.id)),
})
