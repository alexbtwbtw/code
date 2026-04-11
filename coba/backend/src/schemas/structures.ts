import { z } from 'zod'
import { STRUCTURE_TYPES } from '../types/structures'

export { STRUCTURE_TYPES }

export const CreateStructureSchema = z.object({
  projectId:      z.number().int(),
  label:          z.string().default(''),
  type:           z.enum(STRUCTURE_TYPES).default('other'),
  material:       z.string().default(''),
  macroRegion:    z.string().default(''),
  country:        z.string().default(''),
  place:          z.string().default(''),
  lengthM:        z.number().optional(),
  heightM:        z.number().optional(),
  spanM:          z.number().optional(),
  foundationType: z.string().default(''),
  designLoad:     z.number().optional(),
  latitude:       z.number().optional(),
  longitude:      z.number().optional(),
  builtAt:        z.string().optional(),
  notes:          z.string().default(''),
})
