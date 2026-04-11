import { z } from 'zod'

export const GeoTypeSchema = z.enum(['borehole', 'trial_pit', 'core_sample', 'field_survey'])

export const CreateGeoEntrySchema = z.object({
  projectId:        z.number().int(),
  pointLabel:       z.string().min(1),
  type:             GeoTypeSchema.default('borehole'),
  macroRegion:      z.string().default(''),
  country:          z.string().default(''),
  place:            z.string().default(''),
  depth:            z.number().optional(),
  soilType:         z.string().default(''),
  rockType:         z.string().default(''),
  groundwaterDepth: z.number().optional(),
  bearingCapacity:  z.number().optional(),
  sptNValue:        z.number().int().optional(),
  seismicClass:     z.string().default(''),
  latitude:         z.number().optional(),
  longitude:        z.number().optional(),
  sampledAt:        z.string().optional(),
  notes:            z.string().default(''),
})
