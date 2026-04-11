import { z } from 'zod'

export const ProjectStatusSchema = z.enum(['planning', 'active', 'completed', 'suspended', 'cancelled'])
export const ProjectCategorySchema = z.enum(['water', 'transport', 'energy', 'environment', 'planning', 'other'])

export const PROJECT_PRIORITIES = ['critical', 'very_high', 'high', 'medium', 'low', 'very_low', 'minimal'] as const
export const ProjectPrioritySchema = z.enum(PROJECT_PRIORITIES)

export const CreateProjectSchema = z.object({
  refCode: z.string().min(1),
  name: z.string().min(1),
  client: z.string().default(''),
  macroRegion: z.string().default(''),
  country: z.string().default(''),
  place: z.string().default(''),
  category: ProjectCategorySchema.default('other'),
  status: ProjectStatusSchema.default('planning'),
  priority: ProjectPrioritySchema.default('medium'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  currency: z.string().default('EUR'),
  projectManager: z.string().default(''),
  teamSize: z.number().int().default(0),
  description: z.string().default(''),
  tags: z.string().default(''),
})
