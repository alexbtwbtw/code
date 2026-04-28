import { z } from 'zod'

export const createInsurerSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).default(''),
  email: z.string().max(200).default(''),
  phone: z.string().max(50).default(''),
  address: z.string().max(500).default(''),
  notes: z.string().max(5000).default(''),
})

export const updateInsurerSchema = createInsurerSchema.partial()

export const createInsurerContactSchema = z.object({
  insurerId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  title: z.string().max(200).default(''),
  email: z.string().max(200).default(''),
  phone: z.string().max(50).default(''),
  isPrimary: z.boolean().default(false),
})

export const updateInsurerContactSchema = createInsurerContactSchema.partial().omit({ insurerId: true })
