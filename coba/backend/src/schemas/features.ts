import { z } from 'zod'

export const CreateFeatureSchema = z.object({
  projectId:   z.number().int(),
  label:       z.string().default(''),
  description: z.string().default(''),
  macroRegion: z.string().default(''),
  country:     z.string().default(''),
  place:       z.string().default(''),
  latitude:    z.number().optional(),
  longitude:   z.number().optional(),
  notes:       z.string().default(''),
})

export type FeatureInput = Omit<z.infer<typeof CreateFeatureSchema>, 'projectId'>
