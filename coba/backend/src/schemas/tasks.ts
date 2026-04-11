import { z } from 'zod'

export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'review', 'blocked', 'done'])
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high'])

export const CreateTaskSchema = z.object({
  projectId: z.number().int(),
  title: z.string().min(1),
  description: z.string().default(''),
  status: TaskStatusSchema.default('todo'),
  priority: TaskPrioritySchema.default('medium'),
  stateSummary: z.string().default(''),
  dueDate: z.string().optional(),
})

export const UpdateTaskSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  stateSummary: z.string().optional(),
  dueDate: z.string().nullable().optional(),
})
