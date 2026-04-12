import { describe, it, expect } from 'vitest'
import { mapGeo, type RawGeo } from '../../types/geo'

const baseRaw: RawGeo = {
  id: 1, project_id: 5, point_label: 'BH-1', type: 'borehole',
  macro_region: 'EMEA', country: 'Portugal', place: 'Lisbon',
  depth: 15.0, soil_type: 'sand', rock_type: 'granite',
  groundwater_depth: 4.5, bearing_capacity: 200, spt_n_value: 30,
  seismic_class: 'II', latitude: 38.72, longitude: -9.14,
  sampled_at: '2023-06-15', notes: 'clear water', created_at: '2024-01-01T00:00:00Z',
}

describe('mapGeo', () => {
  it('maps all snake_case fields to camelCase', () => {
    const g = mapGeo(baseRaw)
    expect(g.projectId).toBe(5)
    expect(g.pointLabel).toBe('BH-1')
    expect(g.soilType).toBe('sand')
    expect(g.rockType).toBe('granite')
    expect(g.groundwaterDepth).toBe(4.5)
    expect(g.bearingCapacity).toBe(200)
    expect(g.sptNValue).toBe(30)
    expect(g.seismicClass).toBe('II')
    expect(g.sampledAt).toBe('2023-06-15')
    expect(g.createdAt).toBe('2024-01-01T00:00:00Z')
  })

  it('passes through null lat/lng as null', () => {
    const g = mapGeo({ ...baseRaw, latitude: null, longitude: null })
    expect(g.latitude).toBeNull()
    expect(g.longitude).toBeNull()
  })

  it('passes through null depth as null', () => {
    const g = mapGeo({ ...baseRaw, depth: null })
    expect(g.depth).toBeNull()
  })
})
