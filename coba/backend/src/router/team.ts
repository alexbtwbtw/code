import { z } from 'zod'
import { router, authedProcedure, managerProcedure, oversightProcedure } from '../trpc'
import { MemberInputSchema, HistoryInputSchema } from '../schemas/team'
import * as teamService from '../services/team'
import { logAudit } from '../services/audit'

export const teamRouter = router({

  list: authedProcedure
    .query(() => teamService.listMembers()),

  byId: authedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => teamService.getMemberById(input.id)),

  create: managerProcedure
    .input(MemberInputSchema.extend({
      cv: z.object({ filename: z.string(), fileSize: z.number().int(), fileData: z.string() }).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const member = teamService.createMember(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'team_members', (member as { id: number }).id)
      return member
    }),

  update: managerProcedure
    .input(MemberInputSchema.extend({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const member = teamService.updateMember(input)
      logAudit(ctx.userId, ctx.userName, 'update', 'team_members', input.id)
      return member
    }),

  delete: oversightProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = teamService.deleteMember(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'team_members', input.id)
      return result
    }),

  byProject: authedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => teamService.getMembersByProject(input.projectId)),

  tagProject: managerProcedure
    .input(z.object({ projectId: z.number().int(), teamMemberId: z.number().int(), roleOnProject: z.string().default('') }))
    .mutation(({ ctx, input }) => {
      const result = teamService.tagProject(input.projectId, input.teamMemberId, input.roleOnProject)
      logAudit(ctx.userId, ctx.userName, 'create', 'project_team', input.projectId)
      return result
    }),

  untagProject: managerProcedure
    .input(z.object({ projectId: z.number().int(), teamMemberId: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = teamService.untagProject(input.projectId, input.teamMemberId)
      logAudit(ctx.userId, ctx.userName, 'delete', 'project_team', input.projectId)
      return result
    }),

  addHistory: managerProcedure
    .input(HistoryInputSchema)
    .mutation(({ ctx, input }) => {
      const history = teamService.addHistory(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'member_history', (history as { id: number }).id)
      return history
    }),

  updateHistory: managerProcedure
    .input(HistoryInputSchema.extend({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const history = teamService.updateHistory(input)
      logAudit(ctx.userId, ctx.userName, 'update', 'member_history', input.id)
      return history
    }),

  deleteHistory: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = teamService.deleteHistory(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'member_history', input.id)
      return result
    }),

  getCvData: authedProcedure
    .input(z.object({ cvId: z.number().int() }))
    .query(({ input }) => teamService.getCvData(input.cvId)),

  attachCv: managerProcedure
    .input(z.object({
      teamMemberId: z.number().int(),
      filename:     z.string(),
      fileSize:     z.number().int(),
      fileData:     z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const result = teamService.attachCv(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'member_cvs', input.teamMemberId)
      return result
    }),

  createWithHistory: managerProcedure
    .input(z.object({
      member: MemberInputSchema,
      history: z.array(z.object({
        projectName:  z.string().default(''),
        macroRegion:  z.string().default(''),
        country:      z.string().default(''),
        place:        z.string().default(''),
        category:     z.string().default('other'),
        startDate:    z.string().optional(),
        endDate:      z.string().optional(),
        notes:        z.string().default(''),
        geoEntries:   z.array(z.any()).default([]),
        structures:   z.array(z.any()).default([]),
        features:     z.array(z.any()).default([]),
      })).default([]),
      cv: z.object({
        filename: z.string(),
        fileSize: z.number().int(),
        fileData: z.string(),
      }).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const member = teamService.createWithHistory(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'team_members', (member as { id: number }).id)
      return member
    }),

  parseCv: managerProcedure
    .input(z.object({ pdfBase64: z.string() }))
    .mutation(({ input }) => teamService.parseCvService(input.pdfBase64)),

  suggestMembers: managerProcedure
    .input(z.object({
      projectId: z.number().int(),
      mode:      z.enum(['ai', 'local']),
      topN:      z.number().int().min(1).max(20).default(5),
    }))
    .mutation(({ input }) => teamService.suggestMembers(input)),
})
