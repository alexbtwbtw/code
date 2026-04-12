import { describe, it, expect } from 'vitest'
import {
  mapMember, mapHistory, mapHistoryGeo, mapHistoryStructure, mapHistoryFeature,
  type RawMember, type RawHistory, type RawHistoryGeo, type RawHistoryStructure, type RawHistoryFeature,
} from '../../types/team'

describe('mapMember', () => {
  const raw: RawMember = {
    id: 1, name: 'Alice', title: 'Senior Engineer', email: 'alice@co.com',
    phone: '+351 900 000', bio: 'Expert in foundations.', role: 'user',
    created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  }

  it('maps all fields to camelCase', () => {
    const m = mapMember(raw)
    expect(m.id).toBe(1)
    expect(m.name).toBe('Alice')
    expect(m.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(m.updatedAt).toBe('2024-01-01T00:00:00Z')
  })

  it('casts role to union type', () => {
    const m = mapMember(raw)
    expect(m.role).toBe('user')
  })

  it('maps oversight role', () => {
    const m = mapMember({ ...raw, role: 'oversight' })
    expect(m.role).toBe('oversight')
  })
})

describe('mapHistory', () => {
  const raw: RawHistory = {
    id: 10, team_member_id: 1, project_id: null,
    project_name: 'Bridge X', macro_region: 'EMEA', country: 'Portugal',
    place: 'Porto', category: 'transport', start_date: '2022-01-01',
    end_date: '2023-01-01', notes: 'some notes', created_at: '2024-01-01T00:00:00Z',
  }

  it('maps camelCase correctly', () => {
    const h = mapHistory(raw)
    expect(h.teamMemberId).toBe(1)
    expect(h.projectId).toBeNull()
    expect(h.projectName).toBe('Bridge X')
    expect(h.macroRegion).toBe('EMEA')
    expect(h.startDate).toBe('2022-01-01')
    expect(h.endDate).toBe('2023-01-01')
  })
})

describe('mapHistoryGeo', () => {
  const raw: RawHistoryGeo = {
    id: 20, history_id: 10, point_label: 'S-1', type: 'borehole',
    macro_region: 'EMEA', country: 'Portugal', place: 'Porto',
    depth: 12.5, soil_type: 'clay', rock_type: '', groundwater_depth: 3.0,
    bearing_capacity: null, spt_n_value: null, seismic_class: 'II',
    latitude: 41.15, longitude: -8.61, sampled_at: '2022-06-01', notes: '',
    created_at: '2024-01-01T00:00:00Z',
  }

  it('maps all nullable numerics correctly', () => {
    const g = mapHistoryGeo(raw)
    expect(g.historyId).toBe(10)
    expect(g.pointLabel).toBe('S-1')
    expect(g.depth).toBe(12.5)
    expect(g.bearingCapacity).toBeNull()
    expect(g.sptNValue).toBeNull()
    expect(g.latitude).toBe(41.15)
    expect(g.longitude).toBe(-8.61)
  })
})

describe('mapHistoryStructure', () => {
  const raw: RawHistoryStructure = {
    id: 30, project_id: 5, history_id: 10, label: 'Bridge A', type: 'bridge',
    material: 'concrete', macro_region: 'EMEA', country: 'Portugal', place: 'Lisbon',
    length_m: 120.0, height_m: null, span_m: null,
    foundation_type: 'piled', design_load: 500,
    latitude: null, longitude: null, built_at: '2020-01-01', notes: '',
    created_at: '2024-01-01T00:00:00Z',
  }

  it('maps camelCase for dimensions', () => {
    const s = mapHistoryStructure(raw)
    expect(s.historyId).toBe(10)
    expect(s.lengthM).toBe(120.0)
    expect(s.heightM).toBeNull()
    expect(s.spanM).toBeNull()
    expect(s.foundationType).toBe('piled')
    expect(s.designLoad).toBe(500)
  })
})

describe('mapHistoryFeature', () => {
  const raw: RawHistoryFeature = {
    id: 40, history_id: 10, label: 'Fault Zone', description: 'Known fault zone',
    macro_region: 'EMEA', country: 'Portugal', place: 'Faro',
    latitude: 37.0, longitude: -7.9, notes: '', created_at: '2024-01-01T00:00:00Z',
  }

  it('maps camelCase correctly', () => {
    const f = mapHistoryFeature(raw)
    expect(f.historyId).toBe(10)
    expect(f.label).toBe('Fault Zone')
    expect(f.latitude).toBe(37.0)
    expect(f.longitude).toBe(-7.9)
  })
})
