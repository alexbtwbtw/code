import { z } from 'zod'

export const createInsurerSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  address: z.string().default(''),
  notes: z.string().default(''),
})

export const updateInsurerSchema = createInsurerSchema.partial()

export const createInsurerContactSchema = z.object({
  insurerId: z.number().int().positive(),
  name: z.string().min(1),
  title: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  isPrimary: z.boolean().default(false),
})

export const updateInsurerContactSchema = createInsurerContactSchema.partial().omit({ insurerId: true })
