import { z } from 'zod'
import { router, authedProcedure, managerProcedure } from '../trpc'
import { TaskStatusSchema, TaskPrioritySchema } from '../schemas/tasks'
import * as tasksService from '../services/tasks'
import { logAudit } from '../services/audit'

export const tasksRouter = router({
  overdue: authedProcedure
    .query(() => tasksService.getOverdue()),

  nearDeadline: authedProcedure
    .query(() => tasksService.getNearDeadline()),

  blocked: authedProcedure
    .query(() => tasksService.getBlocked()),

  myOverdue: authedProcedure
    .input(z.object({ memberId: z.number() }))
    .query(({ input }) => tasksService.getMyOverdue(input.memberId)),

  myNearDeadline: authedProcedure
    .input(z.object({ memberId: z.number() }))
    .query(({ input }) => tasksService.getMyNearDeadline(input.memberId)),

  byProject: authedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => tasksService.getTasksByProject(input.projectId)),

  byMember: authedProcedure
    .input(z.object({ teamMemberId: z.number().int() }))
    .query(({ input }) => tasksService.getTasksByMember(input.teamMemberId)),

  byId: authedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => tasksService.getTaskById(input.id)),

  create: managerProcedure
    .input(z.object({
      projectId: z.number().int(),
      title: z.string().min(1),
      description: z.string().default(''),
      status: TaskStatusSchema.default('todo'),
      priority: TaskPrioritySchema.default('medium'),
      stateSummary: z.string().default(''),
      dueDate: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const task = tasksService.createTask(input)
      logAudit(ctx.userId, ctx.userName, 'create', 'tasks', (task as { id: number }).id)
      return task
    }),

  update: authedProcedure
    .input(z.object({
      id: z.number().int(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: TaskStatusSchema.optional(),
      priority: TaskPrioritySchema.optional(),
      stateSummary: z.string().optional(),
      dueDate: z.string().nullable().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const task = tasksService.updateTask(input)
      logAudit(ctx.userId, ctx.userName, 'update', 'tasks', input.id)
      return task
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = tasksService.deleteTask(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'tasks', input.id)
      return result
    }),

  assign: managerProcedure
    .input(z.object({ taskId: z.number().int(), teamMemberId: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = tasksService.assignTask(input.taskId, input.teamMemberId)
      logAudit(ctx.userId, ctx.userName, 'create', 'task_assignments', input.taskId)
      return result
    }),

  unassign: managerProcedure
    .input(z.object({ taskId: z.number().int(), teamMemberId: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = tasksService.unassignTask(input.taskId, input.teamMemberId)
      logAudit(ctx.userId, ctx.userName, 'delete', 'task_assignments', input.taskId)
      return result
    }),

  addComment: authedProcedure
    .input(z.object({
      taskId: z.number().int(),
      authorName: z.string().min(1),
      content: z.string().min(1),
    }))
    .mutation(({ ctx, input }) => {
      const comment = tasksService.addComment(input.taskId, input.authorName, input.content)
      logAudit(ctx.userId, ctx.userName, 'create', 'task_comments', input.taskId)
      return comment
    }),

  deleteComment: authedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const result = tasksService.deleteComment(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'task_comments', input.id)
      return result
    }),
})
