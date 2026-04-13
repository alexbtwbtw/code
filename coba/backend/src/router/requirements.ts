import { z } from 'zod'
import { router, authedProcedure, managerProcedure } from '../trpc'
import { DISCIPLINES, LEVELS, BookInputSchema, RequirementInputSchema, ReqAssignmentInputSchema } from '../schemas/requirements'
import * as requirementsService from '../services/requirements'
import { parseRequirementsFromPdf, parseRequirementsFromDocx } from '../lib/parseRequirements'
import { logAudit } from '../services/audit'

export { DISCIPLINES, LEVELS }

export const requirementsRouter = router({

  listBooks: authedProcedure
    .query(() => requirementsService.listBooks()),

  bookById: authedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => requirementsService.getBookById(input.id)),

  createBook: managerProcedure
    .input(BookInputSchema)
    .mutation(({ ctx, input }) => {
      const book = requirementsService.createBook(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'requirement_books', (book as { id: number }).id)
      return book
    }),

  updateBook: managerProcedure
    .input(BookInputSchema.extend({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const book = requirementsService.updateBook(input)
      logAudit(ctx.userId, ctx.userName, 'update', 'requirement_books', input.id)
      return book
    }),

  deleteBook: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = requirementsService.deleteBook(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'requirement_books', input.id)
      return result
    }),

  createRequirement: managerProcedure
    .input(RequirementInputSchema)
    .mutation(({ ctx, input }) => {
      const req = requirementsService.createRequirement(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'requirements', (req as { id: number }).id)
      return req
    }),

  updateRequirement: managerProcedure
    .input(RequirementInputSchema.extend({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const req = requirementsService.updateRequirement(input)
      logAudit(ctx.userId, ctx.userName, 'update', 'requirements', input.id)
      return req
    }),

  deleteRequirement: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = requirementsService.deleteRequirement(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'requirements', input.id)
      return result
    }),

  matchMembers: managerProcedure
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

  addAssignment: managerProcedure
    .input(ReqAssignmentInputSchema)
    .mutation(({ ctx, input }) => {
      const result = requirementsService.addReqAssignment(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'requirement_assignments', input.requirementId)
      return result
    }),

  removeAssignment: managerProcedure
    .input(z.object({ requirementId: z.number().int(), teamMemberId: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = requirementsService.removeReqAssignment(input.requirementId, input.teamMemberId)
      logAudit(ctx.userId, ctx.userName, 'delete', 'requirement_assignments', input.requirementId)
      return result
    }),

  parseFromPdf: managerProcedure
    .input(z.object({ fileBase64: z.string(), fileType: z.enum(['pdf', 'docx']).default('pdf') }))
    .mutation(({ input }) =>
      input.fileType === 'docx'
        ? parseRequirementsFromDocx(input.fileBase64)
        : parseRequirementsFromPdf(input.fileBase64)
    ),
})
