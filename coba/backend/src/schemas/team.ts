import { z } from 'zod'
import { STRUCTURE_TYPES } from '../types/structures'

export const MemberInputSchema = z.object({
  name: z.string().min(1), title: z.string().default(''),
  email: z.string().default(''), phone: z.string().default(''), bio: z.string().default(''),
})

export const HistoryGeoSchema = z.object({
  pointLabel:       z.string().default(''),
  type:             z.enum(['borehole', 'trial_pit', 'core_sample', 'field_survey']).default('borehole'),
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

export const HistoryStructureSchema = z.object({
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

export const HistoryFeatureSchema = z.object({
  label:       z.string().default(''),
  description: z.string().default(''),
  macroRegion: z.string().default(''),
  country:     z.string().default(''),
  place:       z.string().default(''),
  latitude:    z.number().optional(),
  longitude:   z.number().optional(),
  notes:       z.string().default(''),
})

export const HistoryInputSchema = z.object({
  teamMemberId: z.number().int(),
  projectId:    z.number().int().nullable().default(null),
  projectName:  z.string().default(''),
  macroRegion:  z.string().default(''),
  country:      z.string().default(''),
  place:        z.string().default(''),
  category:     z.string().default('other'),
  startDate:    z.string().optional(),
  endDate:      z.string().optional(),
  notes:        z.string().default(''),
  geoEntries:   z.array(HistoryGeoSchema).default([]),
  structures:   z.array(HistoryStructureSchema).default([]),
  features:     z.array(HistoryFeatureSchema).default([]),
})
