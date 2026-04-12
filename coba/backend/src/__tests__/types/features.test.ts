import { describe, it, expect } from 'vitest'
import { mapFeature, type RawFeature } from '../../types/features'

const baseRaw: RawFeature = {
  id: 1, project_id: 4, label: 'Landslide Risk Area', description: 'Historical sliding',
  macro_region: 'EMEA', country: 'Portugal', place: 'Braga',
  latitude: 41.55, longitude: -8.42, notes: 'seasonal instability',
  created_at: '2024-01-01T00:00:00Z',
}

describe('mapFeature', () => {
  it('maps all fields to camelCase', () => {
    const f = mapFeature(baseRaw)
    expect(f.id).toBe(1)
    expect(f.projectId).toBe(4)
    expect(f.label).toBe('Landslide Risk Area')
    expect(f.macroRegion).toBe('EMEA')
    expect(f.latitude).toBe(41.55)
    expect(f.longitude).toBe(-8.42)
    expect(f.createdAt).toBe('2024-01-01T00:00:00Z')
  })

  it('passes through null lat/lng as null', () => {
    const f = mapFeature({ ...baseRaw, latitude: null, longitude: null })
    expect(f.latitude).toBeNull()
    expect(f.longitude).toBeNull()
  })
})
