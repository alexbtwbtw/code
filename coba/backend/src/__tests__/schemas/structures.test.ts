import { describe, it, expect } from 'vitest'
import { CreateStructureSchema, STRUCTURE_TYPES } from '../../schemas/structures'

describe('CreateStructureSchema', () => {
  const minimal = { projectId: 1 }

  it('requires projectId — throws without it', () => {
    expect(() => CreateStructureSchema.parse({})).toThrow()
  })

  it('accepts minimal input with just projectId', () => {
    expect(() => CreateStructureSchema.parse(minimal)).not.toThrow()
  })

  it('defaults type to "other"', () => {
    const r = CreateStructureSchema.parse(minimal)
    expect(r.type).toBe('other')
  })

  it('defaults string fields to empty string', () => {
    const r = CreateStructureSchema.parse(minimal)
    expect(r.label).toBe('')
    expect(r.material).toBe('')
    expect(r.macroRegion).toBe('')
    expect(r.country).toBe('')
    expect(r.place).toBe('')
    expect(r.foundationType).toBe('')
    expect(r.notes).toBe('')
  })

  it('optional numeric dimensions are undefined when omitted', () => {
    const r = CreateStructureSchema.parse(minimal)
    expect(r.lengthM).toBeUndefined()
    expect(r.heightM).toBeUndefined()
    expect(r.spanM).toBeUndefined()
    expect(r.designLoad).toBeUndefined()
    expect(r.latitude).toBeUndefined()
    expect(r.longitude).toBeUndefined()
    expect(r.builtAt).toBeUndefined()
  })

  it('accepts all optional numeric fields', () => {
    const r = CreateStructureSchema.parse({
      ...minimal,
      lengthM: 500,
      heightM: 40,
      spanM: 200,
      designLoad: 10000,
      latitude: 38.7,
      longitude: -9.1,
    })
    expect(r.lengthM).toBe(500)
    expect(r.heightM).toBe(40)
    expect(r.spanM).toBe(200)
    expect(r.designLoad).toBe(10000)
    expect(r.latitude).toBe(38.7)
    expect(r.longitude).toBe(-9.1)
  })

  it('accepts builtAt as a date string', () => {
    const r = CreateStructureSchema.parse({ ...minimal, builtAt: '2000-01-01' })
    expect(r.builtAt).toBe('2000-01-01')
  })

  it('accepts all valid structure types', () => {
    for (const type of STRUCTURE_TYPES) {
      const r = CreateStructureSchema.parse({ ...minimal, type })
      expect(r.type).toBe(type)
    }
  })

  it('rejects invalid structure type', () => {
    expect(() => CreateStructureSchema.parse({ ...minimal, type: 'skyscraper' })).toThrow()
  })

  it('STRUCTURE_TYPES contains expected values', () => {
    expect(STRUCTURE_TYPES).toContain('bridge')
    expect(STRUCTURE_TYPES).toContain('dam')
    expect(STRUCTURE_TYPES).toContain('tunnel')
    expect(STRUCTURE_TYPES).toContain('retaining_wall')
    expect(STRUCTURE_TYPES).toContain('embankment')
    expect(STRUCTURE_TYPES).toContain('building')
    expect(STRUCTURE_TYPES).toContain('pipeline')
    expect(STRUCTURE_TYPES).toContain('reservoir')
    expect(STRUCTURE_TYPES).toContain('culvert')
    expect(STRUCTURE_TYPES).toContain('road')
    expect(STRUCTURE_TYPES).toContain('other')
  })
})
