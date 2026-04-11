import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { DISCIPLINES, LEVELS, BookInputSchema, RequirementInputSchema, ReqAssignmentInputSchema } from '../schemas/requirements'
import * as requirementsService from '../services/requirements'
import { parseRequirementsFromPdf, parseRequirementsFromDocx } from '../lib/parseRequirements'

export { DISCIPLINES, LEVELS }

export const requirementsRouter = router({

  listBooks: publicProcedure
    .query(() => requirementsService.listBooks()),

  bookById: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => requirementsService.getBookById(input.id)),

  createBook: publicProcedure
    .input(BookInputSchema)
    .mutation(({ input }) => requirementsService.createBook(input)),

  updateBook: publicProcedure
    .input(BookInputSchema.extend({ id: z.number().int() }))
    .mutation(({ input }) => requirementsService.updateBook(input)),

  deleteBook: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => requirementsService.deleteBook(input.id)),

  createRequirement: publicProcedure
    .input(RequirementInputSchema)
    .mutation(({ input }) => requirementsService.createRequirement(input)),

  updateRequirement: publicProcedure
    .input(RequirementInputSchema.extend({ id: z.number().int() }))
    .mutation(({ input }) => requirementsService.updateRequirement(input)),

  deleteRequirement: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => requirementsService.deleteRequirement(input.id)),

  matchMembers: publicProcedure
    .input(z.object({
      requirementId: z.number().int(),
      mode:          z.enum(['ai', 'local']),
      topN:          z.number().int().min(1).max(20).default(5),
    }))
    .mutation(async ({ input }) => {
      if (input.mode === 'local') {
        return requirementsService.matchMembersLocal(input.requirementId, input.topN)
      }
      return requirementsService.matchMembersAi(input.requirementId, input.topN)
    }),

  addAssignment: publicProcedure
    .input(ReqAssignmentInputSchema)
    .mutation(({ input }) => requirementsService.addReqAssignment(input)),

  removeAssignment: publicProcedure
    .input(z.object({ requirementId: z.number().int(), teamMemberId: z.number().int() }))
    .mutation(({ input }) => requirementsService.removeReqAssignment(input.requirementId, input.teamMemberId)),

  parseFromPdf: publicProcedure
    .input(z.object({ fileBase64: z.string(), fileType: z.enum(['pdf', 'docx']).default('pdf') }))
    .mutation(({ input }) =>
      input.fileType === 'docx'
        ? parseRequirementsFromDocx(input.fileBase64)
        : parseRequirementsFromPdf(input.fileBase64)
    ),
})
