import { describe, it, expect } from 'vitest'
import {
  MemberInputSchema,
  HistoryInputSchema,
  HistoryGeoSchema,
  HistoryStructureSchema,
  HistoryFeatureSchema,
} from '../../schemas/team'

// ── MemberInputSchema ─────────────────────────────────────────────────────────

describe('MemberInputSchema', () => {
  it('requires name — throws without it', () => {
    expect(() => MemberInputSchema.parse({})).toThrow()
  })

  it('rejects empty name', () => {
    expect(() => MemberInputSchema.parse({ name: '' })).toThrow()
  })

  it('accepts name with only required field', () => {
    const r = MemberInputSchema.parse({ name: 'Alice' })
    expect(r.name).toBe('Alice')
  })

  it('defaults optional string fields to empty string', () => {
    const r = MemberInputSchema.parse({ name: 'Alice' })
    expect(r.title).toBe('')
    expect(r.email).toBe('')
    expect(r.phone).toBe('')
    expect(r.bio).toBe('')
  })

  it('accepts all optional fields', () => {
    const r = MemberInputSchema.parse({
      name: 'Bob',
      title: 'Engineer',
      email: 'bob@example.com',
      phone: '+351 123 456 789',
      bio: 'Experienced geo engineer',
    })
    expect(r.title).toBe('Engineer')
    expect(r.email).toBe('bob@example.com')
    expect(r.phone).toBe('+351 123 456 789')
    expect(r.bio).toBe('Experienced geo engineer')
  })
})

// ── HistoryInputSchema ────────────────────────────────────────────────────────

describe('HistoryInputSchema', () => {
  const minimal = { teamMemberId: 1, projectId: null }

  it('requires teamMemberId', () => {
    expect(() => HistoryInputSchema.parse({ projectId: null })).toThrow()
  })

  it('accepts minimal input', () => {
    expect(() => HistoryInputSchema.parse(minimal)).not.toThrow()
  })

  it('defaults geoEntries to empty array', () => {
    const r = HistoryInputSchema.parse(minimal)
    expect(r.geoEntries).toEqual([])
  })

  it('defaults structures to empty array', () => {
    const r = HistoryInputSchema.parse(minimal)
    expect(r.structures).toEqual([])
  })

  it('defaults features to empty array', () => {
    const r = HistoryInputSchema.parse(minimal)
    expect(r.features).toEqual([])
  })

  it('defaults projectId to null', () => {
    const r = HistoryInputSchema.parse({ teamMemberId: 1 })
    expect(r.projectId).toBeNull()
  })

  it('defaults string fields to empty string', () => {
    const r = HistoryInputSchema.parse(minimal)
    expect(r.projectName).toBe('')
    expect(r.macroRegion).toBe('')
    expect(r.country).toBe('')
    expect(r.place).toBe('')
    expect(r.category).toBe('other')
    expect(r.notes).toBe('')
  })

  it('startDate and endDate are undefined when omitted', () => {
    const r = HistoryInputSchema.parse(minimal)
    expect(r.startDate).toBeUndefined()
    expect(r.endDate).toBeUndefined()
  })

  it('accepts geoEntries, structures, features arrays', () => {
    const r = HistoryInputSchema.parse({
      ...minimal,
      geoEntries: [{ pointLabel: 'BH-1' }],
      structures: [{ label: 'Bridge A' }],
      features: [{ label: 'Fault Zone' }],
    })
    expect(r.geoEntries).toHaveLength(1)
    expect(r.structures).toHaveLength(1)
    expect(r.features).toHaveLength(1)
  })
})

// ── HistoryGeoSchema ──────────────────────────────────────────────────────────

describe('HistoryGeoSchema', () => {
  it('accepts empty object (all fields have defaults)', () => {
    expect(() => HistoryGeoSchema.parse({})).not.toThrow()
  })

  it('defaults type to borehole', () => {
    const r = HistoryGeoSchema.parse({})
    expect(r.type).toBe('borehole')
  })

  it('defaults string fields to empty string', () => {
    const r = HistoryGeoSchema.parse({})
    expect(r.pointLabel).toBe('')
    expect(r.macroRegion).toBe('')
    expect(r.country).toBe('')
    expect(r.place).toBe('')
    expect(r.soilType).toBe('')
    expect(r.rockType).toBe('')
    expect(r.seismicClass).toBe('')
    expect(r.notes).toBe('')
  })

  it('optional numeric fields are undefined when omitted', () => {
    const r = HistoryGeoSchema.parse({})
    expect(r.depth).toBeUndefined()
    expect(r.groundwaterDepth).toBeUndefined()
    expect(r.bearingCapacity).toBeUndefined()
    expect(r.sptNValue).toBeUndefined()
    expect(r.latitude).toBeUndefined()
    expect(r.longitude).toBeUndefined()
    expect(r.sampledAt).toBeUndefined()
  })

  it('accepts all four geo types', () => {
    for (const type of ['borehole', 'trial_pit', 'core_sample', 'field_survey'] as const) {
      const r = HistoryGeoSchema.parse({ type })
      expect(r.type).toBe(type)
    }
  })

  it('rejects invalid type', () => {
    expect(() => HistoryGeoSchema.parse({ type: 'unknown' })).toThrow()
  })
})

// ── HistoryStructureSchema ────────────────────────────────────────────────────

describe('HistoryStructureSchema', () => {
  it('accepts empty object (all fields have defaults)', () => {
    expect(() => HistoryStructureSchema.parse({})).not.toThrow()
  })

  it('defaults type to "other"', () => {
    const r = HistoryStructureSchema.parse({})
    expect(r.type).toBe('other')
  })

  it('defaults string fields to empty string', () => {
    const r = HistoryStructureSchema.parse({})
    expect(r.label).toBe('')
    expect(r.material).toBe('')
    expect(r.macroRegion).toBe('')
    expect(r.country).toBe('')
    expect(r.place).toBe('')
    expect(r.foundationType).toBe('')
    expect(r.notes).toBe('')
  })

  it('optional numeric fields are undefined when omitted', () => {
    const r = HistoryStructureSchema.parse({})
    expect(r.lengthM).toBeUndefined()
    expect(r.heightM).toBeUndefined()
    expect(r.spanM).toBeUndefined()
    expect(r.designLoad).toBeUndefined()
    expect(r.latitude).toBeUndefined()
    expect(r.longitude).toBeUndefined()
    expect(r.builtAt).toBeUndefined()
  })

  it('rejects invalid structure type', () => {
    expect(() => HistoryStructureSchema.parse({ type: 'skyscraper' })).toThrow()
  })
})

// ── HistoryFeatureSchema ──────────────────────────────────────────────────────

describe('HistoryFeatureSchema', () => {
  it('accepts empty object (all fields have defaults)', () => {
    expect(() => HistoryFeatureSchema.parse({})).not.toThrow()
  })

  it('defaults all string fields to empty string', () => {
    const r = HistoryFeatureSchema.parse({})
    expect(r.label).toBe('')
    expect(r.description).toBe('')
    expect(r.macroRegion).toBe('')
    expect(r.country).toBe('')
    expect(r.place).toBe('')
    expect(r.notes).toBe('')
  })

  it('latitude and longitude are undefined when omitted', () => {
    const r = HistoryFeatureSchema.parse({})
    expect(r.latitude).toBeUndefined()
    expect(r.longitude).toBeUndefined()
  })

  it('accepts latitude and longitude', () => {
    const r = HistoryFeatureSchema.parse({ latitude: 38.7, longitude: -9.1 })
    expect(r.latitude).toBe(38.7)
    expect(r.longitude).toBe(-9.1)
  })
})
