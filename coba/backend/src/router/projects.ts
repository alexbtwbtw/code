import { z } from 'zod'
import { router, authedProcedure, managerProcedure, oversightProcedure } from '../trpc'
import { parseProject } from '../lib/parseProject'
import { CreateProjectSchema } from '../schemas/projects'
import * as projectsService from '../services/projects'
import { logAudit } from '../services/audit'

export const projectsRouter = router({
  list: authedProcedure
    .input(z.object({
      search: z.string().default(''),
      status: z.string().default(''),
      category: z.string().default(''),
      country: z.string().default(''),
      sortBy: z.enum(['relevance', 'newest', 'budget', 'priority']).default('relevance'),
    }))
    .query(({ input }) => projectsService.listProjects(input)),

  byId: authedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => projectsService.getProjectById(input.id)),

  create: managerProcedure
    .input(CreateProjectSchema)
    .mutation(({ ctx, input }) => {
      const project = projectsService.createProject(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'projects', (project as { id: number }).id)
      return project
    }),

  update: managerProcedure
    .input(CreateProjectSchema.partial().extend({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const project = projectsService.updateProject(input)
      logAudit(ctx.userId, ctx.userName, 'update', 'projects', input.id)
      return project
    }),

  parseProject: managerProcedure
    .input(z.object({ pdfBase64: z.string() }))
    .mutation(({ input }) => parseProject(input.pdfBase64)),

  stats: authedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(({ input }) => projectsService.getProjectStats(input?.status)),

  myProjects: authedProcedure
    .input(z.object({ memberId: z.number() }))
    .query(({ input }) => projectsService.getMyProjects(input.memberId)),

  riskSummary: authedProcedure
    .query(() => projectsService.getRiskSummary()),

  priorityList: authedProcedure
    .query(() => projectsService.getPriorityList()),

  delete: oversightProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = projectsService.deleteProject(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'projects', input.id)
      return result
    }),
})
