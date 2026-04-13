import { z } from 'zod'
import { router, authedProcedure, managerProcedure } from '../trpc'
import { STRUCTURE_TYPES, type RawStructure, mapStructure } from '../types/structures'
import { CreateStructureSchema } from '../schemas/structures'
import * as structuresService from '../services/structures'
import { logAudit } from '../services/audit'

export { STRUCTURE_TYPES, type RawStructure, mapStructure, CreateStructureSchema }

export const structuresRouter = router({
  byProject: authedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => structuresService.getStructuresByProject(input.projectId)),

  create: managerProcedure
    .input(CreateStructureSchema)
    .mutation(({ ctx, input }) => {
      const structure = structuresService.createStructure(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'structures', (structure as { id: number }).id)
      return structure
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = structuresService.deleteStructure(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'structures', input.id)
      return result
    }),
})
