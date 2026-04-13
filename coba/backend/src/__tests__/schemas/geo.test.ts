import { describe, it, expect } from 'vitest'
import { GeoTypeSchema, CreateGeoEntrySchema } from '../../schemas/geo'

describe('GeoTypeSchema', () => {
  it('accepts all four geo types', () => {
    for (const type of ['borehole', 'trial_pit', 'core_sample', 'field_survey']) {
      expect(() => GeoTypeSchema.parse(type)).not.toThrow()
    }
  })

  it('rejects unknown type', () => {
    expect(() => GeoTypeSchema.parse('excavation')).toThrow()
    expect(() => GeoTypeSchema.parse('')).toThrow()
    expect(() => GeoTypeSchema.parse('BOREHOLE')).toThrow()
  })
})

describe('CreateGeoEntrySchema', () => {
  const minimal = { projectId: 1, pointLabel: 'BH-1' }

  it('requires projectId — throws without it', () => {
    expect(() => CreateGeoEntrySchema.parse({ pointLabel: 'BH-1' })).toThrow()
  })

  it('requires pointLabel — throws without it', () => {
    expect(() => CreateGeoEntrySchema.parse({ projectId: 1 })).toThrow()
  })

  it('pointLabel cannot be empty string', () => {
    expect(() => CreateGeoEntrySchema.parse({ projectId: 1, pointLabel: '' })).toThrow()
  })

  it('defaults type to borehole', () => {
    const r = CreateGeoEntrySchema.parse(minimal)
    expect(r.type).toBe('borehole')
  })

  it('defaults string fields to empty string', () => {
    const r = CreateGeoEntrySchema.parse(minimal)
    expect(r.macroRegion).toBe('')
    expect(r.country).toBe('')
    expect(r.place).toBe('')
    expect(r.soilType).toBe('')
    expect(r.rockType).toBe('')
    expect(r.seismicClass).toBe('')
    expect(r.notes).toBe('')
  })

  it('optional numeric fields are undefined when omitted', () => {
    const r = CreateGeoEntrySchema.parse(minimal)
    expect(r.depth).toBeUndefined()
    expect(r.groundwaterDepth).toBeUndefined()
    expect(r.bearingCapacity).toBeUndefined()
    expect(r.sptNValue).toBeUndefined()
    expect(r.latitude).toBeUndefined()
    expect(r.longitude).toBeUndefined()
    expect(r.sampledAt).toBeUndefined()
  })

  it('accepts all optional numeric fields', () => {
    const r = CreateGeoEntrySchema.parse({
      ...minimal,
      depth: 25.5,
      groundwaterDepth: 10,
      bearingCapacity: 300,
      sptNValue: 42,
      latitude: 38.7,
      longitude: -9.1,
    })
    expect(r.depth).toBe(25.5)
    expect(r.groundwaterDepth).toBe(10)
    expect(r.bearingCapacity).toBe(300)
    expect(r.sptNValue).toBe(42)
    expect(r.latitude).toBe(38.7)
    expect(r.longitude).toBe(-9.1)
  })

  it('accepts sampledAt as a date string', () => {
    const r = CreateGeoEntrySchema.parse({ ...minimal, sampledAt: '2024-06-01' })
    expect(r.sampledAt).toBe('2024-06-01')
  })

  it('rejects invalid type enum', () => {
    expect(() => CreateGeoEntrySchema.parse({ ...minimal, type: 'excavation' })).toThrow()
  })
})
