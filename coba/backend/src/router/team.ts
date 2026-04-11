import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { MemberInputSchema, HistoryInputSchema } from '../schemas/team'
import * as teamService from '../services/team'

export const teamRouter = router({

  list: publicProcedure
    .query(() => teamService.listMembers()),

  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => teamService.getMemberById(input.id)),

  create: publicProcedure
    .input(MemberInputSchema.extend({
      cv: z.object({ filename: z.string(), fileSize: z.number().int(), fileData: z.string() }).optional(),
    }))
    .mutation(({ input }) => teamService.createMember(input)),

  update: publicProcedure
    .input(MemberInputSchema.extend({ id: z.number().int() }))
    .mutation(({ input }) => teamService.updateMember(input)),

  byProject: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => teamService.getMembersByProject(input.projectId)),

  tagProject: publicProcedure
    .input(z.object({ projectId: z.number().int(), teamMemberId: z.number().int(), roleOnProject: z.string().default('') }))
    .mutation(({ input }) => teamService.tagProject(input.projectId, input.teamMemberId, input.roleOnProject)),

  untagProject: publicProcedure
    .input(z.object({ projectId: z.number().int(), teamMemberId: z.number().int() }))
    .mutation(({ input }) => teamService.untagProject(input.projectId, input.teamMemberId)),

  addHistory: publicProcedure
    .input(HistoryInputSchema)
    .mutation(({ input }) => teamService.addHistory(input)),

  updateHistory: publicProcedure
    .input(HistoryInputSchema.extend({ id: z.number().int() }))
    .mutation(({ input }) => teamService.updateHistory(input)),

  deleteHistory: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => teamService.deleteHistory(input.id)),

  getCvData: publicProcedure
    .input(z.object({ cvId: z.number().int() }))
    .query(({ input }) => teamService.getCvData(input.cvId)),

  attachCv: publicProcedure
    .input(z.object({
      teamMemberId: z.number().int(),
      filename:     z.string(),
      fileSize:     z.number().int(),
      fileData:     z.string(),
    }))
    .mutation(({ input }) => teamService.attachCv(input)),

  createWithHistory: publicProcedure
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
    .mutation(({ input }) => teamService.createWithHistory(input)),

  parseCv: publicProcedure
    .input(z.object({ pdfBase64: z.string() }))
    .mutation(({ input }) => teamService.parseCvService(input.pdfBase64)),

  suggestMembers: publicProcedure
    .input(z.object({
      projectId: z.number().int(),
      mode:      z.enum(['ai', 'local']),
      topN:      z.number().int().min(1).max(20).default(5),
    }))
    .mutation(({ input }) => teamService.suggestMembers(input)),
})
