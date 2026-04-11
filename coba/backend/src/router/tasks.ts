import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { TaskStatusSchema, TaskPrioritySchema } from '../schemas/tasks'
import * as tasksService from '../services/tasks'

export const tasksRouter = router({
  overdue: publicProcedure
    .query(() => tasksService.getOverdue()),

  nearDeadline: publicProcedure
    .query(() => tasksService.getNearDeadline()),

  blocked: publicProcedure
    .query(() => tasksService.getBlocked()),

  myOverdue: publicProcedure
    .input(z.object({ memberId: z.number() }))
    .query(({ input }) => tasksService.getMyOverdue(input.memberId)),

  myNearDeadline: publicProcedure
    .input(z.object({ memberId: z.number() }))
    .query(({ input }) => tasksService.getMyNearDeadline(input.memberId)),

  byProject: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => tasksService.getTasksByProject(input.projectId)),

  byMember: publicProcedure
    .input(z.object({ teamMemberId: z.number().int() }))
    .query(({ input }) => tasksService.getTasksByMember(input.teamMemberId)),

  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => tasksService.getTaskById(input.id)),

  create: publicProcedure
    .input(z.object({
      projectId: z.number().int(),
      title: z.string().min(1),
      description: z.string().default(''),
      status: TaskStatusSchema.default('todo'),
      priority: TaskPrioritySchema.default('medium'),
      stateSummary: z.string().default(''),
      dueDate: z.string().optional(),
    }))
    .mutation(({ input }) => tasksService.createTask(input)),

  update: publicProcedure
    .input(z.object({
      id: z.number().int(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: TaskStatusSchema.optional(),
      priority: TaskPrioritySchema.optional(),
      stateSummary: z.string().optional(),
      dueDate: z.string().nullable().optional(),
    }))
    .mutation(({ input }) => tasksService.updateTask(input)),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => tasksService.deleteTask(input.id)),

  assign: publicProcedure
    .input(z.object({ taskId: z.number().int(), teamMemberId: z.number().int() }))
    .mutation(({ input }) => tasksService.assignTask(input.taskId, input.teamMemberId)),

  unassign: publicProcedure
    .input(z.object({ taskId: z.number().int(), teamMemberId: z.number().int() }))
    .mutation(({ input }) => tasksService.unassignTask(input.taskId, input.teamMemberId)),

  addComment: publicProcedure
    .input(z.object({
      taskId: z.number().int(),
      authorName: z.string().min(1),
      content: z.string().min(1),
    }))
    .mutation(({ input }) => tasksService.addComment(input.taskId, input.authorName, input.content)),

  deleteComment: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => tasksService.deleteComment(input.id)),
})
