import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { parseProject } from '../lib/parseProject'
import { CreateProjectSchema } from '../schemas/projects'
import * as projectsService from '../services/projects'

export const projectsRouter = router({
  list: publicProcedure
    .input(z.object({
      search: z.string().default(''),
      status: z.string().default(''),
      category: z.string().default(''),
      country: z.string().default(''),
      sortBy: z.enum(['relevance', 'newest', 'budget', 'priority']).default('relevance'),
    }))
    .query(({ input }) => projectsService.listProjects(input)),

  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => projectsService.getProjectById(input.id)),

  create: publicProcedure
    .input(CreateProjectSchema)
    .mutation(({ input }) => projectsService.createProject(input)),

  update: publicProcedure
    .input(CreateProjectSchema.partial().extend({ id: z.number().int() }))
    .mutation(({ input }) => projectsService.updateProject(input)),

  parseProject: publicProcedure
    .input(z.object({ pdfBase64: z.string() }))
    .mutation(({ input }) => parseProject(input.pdfBase64)),

  stats: publicProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(({ input }) => projectsService.getProjectStats(input?.status)),

  myProjects: publicProcedure
    .input(z.object({ memberId: z.number() }))
    .query(({ input }) => projectsService.getMyProjects(input.memberId)),

  riskSummary: publicProcedure
    .query(() => projectsService.getRiskSummary()),

  priorityList: publicProcedure
    .query(() => projectsService.getPriorityList()),
})
