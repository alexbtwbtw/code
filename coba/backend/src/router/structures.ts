import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { STRUCTURE_TYPES, type RawStructure, mapStructure } from '../types/structures'
import { CreateStructureSchema } from '../schemas/structures'
import * as structuresService from '../services/structures'

export { STRUCTURE_TYPES, type RawStructure, mapStructure, CreateStructureSchema }

export const structuresRouter = router({
  byProject: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => structuresService.getStructuresByProject(input.projectId)),

  create: publicProcedure
    .input(CreateStructureSchema)
    .mutation(({ input }) => structuresService.createStructure(input)),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => structuresService.deleteStructure(input.id)),
})
