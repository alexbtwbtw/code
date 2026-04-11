import { z } from 'zod'

export const DISCIPLINES = ['geotechnical', 'structural', 'environmental', 'hydraulic',
  'transport', 'electrical', 'planning', 'other'] as const

export const LEVELS = ['any', 'junior', 'mid', 'senior', 'lead'] as const

export const BookInputSchema = z.object({
  title:       z.string().min(1),
  projectId:   z.number().int().nullable().optional(),
  category:    z.enum(['water','transport','energy','environment','planning','other']).default('other'),
  description: z.string().default(''),
})

export const RequirementInputSchema = z.object({
  bookId:          z.number().int(),
  title:           z.string().min(1),
  description:     z.string().default(''),
  discipline:      z.enum(DISCIPLINES).default('other'),
  level:           z.enum(LEVELS).default('any'),
  yearsExperience: z.number().int().nullable().optional(),
  certifications:  z.string().default(''),
  notes:           z.string().default(''),
  complianceNote:  z.string().default(''),
  sourceEvidence:  z.string().default(''),
})

export const ReqAssignmentInputSchema = z.object({
  requirementId: z.number().int(),
  teamMemberId:  z.number().int(),
  rationale:     z.string().default(''),
})
