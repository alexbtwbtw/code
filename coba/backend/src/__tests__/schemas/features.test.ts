import { describe, it, expect } from 'vitest'
import { CreateFeatureSchema } from '../../schemas/features'

describe('CreateFeatureSchema', () => {
  const minimal = { projectId: 1 }

  it('requires projectId — throws without it', () => {
    expect(() => CreateFeatureSchema.parse({})).toThrow()
  })

  it('accepts minimal input with just projectId', () => {
    expect(() => CreateFeatureSchema.parse(minimal)).not.toThrow()
  })

  it('defaults string fields to empty string', () => {
    const r = CreateFeatureSchema.parse(minimal)
    expect(r.label).toBe('')
    expect(r.description).toBe('')
    expect(r.macroRegion).toBe('')
    expect(r.country).toBe('')
    expect(r.place).toBe('')
    expect(r.notes).toBe('')
  })

  it('latitude and longitude are undefined when omitted', () => {
    const r = CreateFeatureSchema.parse(minimal)
    expect(r.latitude).toBeUndefined()
    expect(r.longitude).toBeUndefined()
  })

  it('accepts optional latitude and longitude', () => {
    const r = CreateFeatureSchema.parse({ ...minimal, latitude: 38.7, longitude: -9.1 })
    expect(r.latitude).toBe(38.7)
    expect(r.longitude).toBe(-9.1)
  })

  it('accepts all optional string fields', () => {
    const r = CreateFeatureSchema.parse({
      ...minimal,
      label: 'Fault Zone',
      description: 'Geological fault',
      macroRegion: 'EMEA',
      country: 'Portugal',
      place: 'Alentejo',
      notes: 'High risk',
    })
    expect(r.label).toBe('Fault Zone')
    expect(r.description).toBe('Geological fault')
    expect(r.macroRegion).toBe('EMEA')
    expect(r.country).toBe('Portugal')
    expect(r.place).toBe('Alentejo')
    expect(r.notes).toBe('High risk')
  })

  it('projectId must be an integer — rejects float', () => {
    expect(() => CreateFeatureSchema.parse({ projectId: 1.5 })).toThrow()
  })
})
