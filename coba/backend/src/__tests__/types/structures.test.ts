import { describe, it, expect } from 'vitest'
import { mapStructure, type RawStructure } from '../../types/structures'

const baseRaw: RawStructure = {
  id: 1, project_id: 3, label: 'Main Bridge', type: 'bridge', material: 'steel',
  macro_region: 'EMEA', country: 'Portugal', place: 'Porto',
  length_m: 250.0, height_m: 15.0, span_m: 50.0,
  foundation_type: 'piled', design_load: 1000,
  latitude: 41.15, longitude: -8.61,
  built_at: '2010-06-01', notes: 'landmark structure',
  created_at: '2024-01-01T00:00:00Z',
}

describe('mapStructure', () => {
  it('maps all snake_case fields to camelCase', () => {
    const s = mapStructure(baseRaw)
    expect(s.projectId).toBe(3)
    expect(s.lengthM).toBe(250.0)
    expect(s.heightM).toBe(15.0)
    expect(s.spanM).toBe(50.0)
    expect(s.foundationType).toBe('piled')
    expect(s.designLoad).toBe(1000)
    expect(s.builtAt).toBe('2010-06-01')
    expect(s.createdAt).toBe('2024-01-01T00:00:00Z')
  })

  it('passes through null geo coords as null', () => {
    const s = mapStructure({ ...baseRaw, latitude: null, longitude: null })
    expect(s.latitude).toBeNull()
    expect(s.longitude).toBeNull()
  })

  it('passes through null dimensions as null', () => {
    const s = mapStructure({ ...baseRaw, length_m: null, height_m: null, span_m: null })
    expect(s.lengthM).toBeNull()
    expect(s.heightM).toBeNull()
    expect(s.spanM).toBeNull()
  })
})
