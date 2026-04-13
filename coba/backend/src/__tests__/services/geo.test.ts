import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import { getGeoByProject, createGeoEntry, deleteGeoEntry } from '../../services/geo'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProject(refCode = 'P-001') {
  return Number(db.prepare(`
    INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority, currency, project_manager, description, tags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(refCode, 'Test Project', 'ACME', 'EMEA', 'Portugal', 'Lisbon', 'transport', 'active', 'medium', 'EUR', 'PM', 'desc', '').lastInsertRowid)
}

function makeGeoEntry(projectId: number, overrides: Record<string, unknown> = {}) {
  return createGeoEntry({
    projectId,
    pointLabel: (overrides.pointLabel as string) ?? 'BH-1',
    type: (overrides.type as 'borehole' | 'trial_pit' | 'core_sample' | 'field_survey') ?? 'borehole',
    macroRegion: '',
    country: 'Portugal',
    place: 'Lisbon',
    soilType: '',
    rockType: '',
    seismicClass: '',
    notes: '',
    ...overrides,
  })
}

// ── getGeoByProject ───────────────────────────────────────────────────────────

describe('getGeoByProject', () => {
  it('returns empty array when no entries', () => {
    const pId = makeProject()
    expect(getGeoByProject(pId)).toEqual([])
  })

  it('returns entries for the correct project', () => {
    const pId = makeProject()
    makeGeoEntry(pId, { pointLabel: 'BH-1' })
    makeGeoEntry(pId, { pointLabel: 'BH-2' })
    const result = getGeoByProject(pId)
    expect(result).toHaveLength(2)
  })

  it('does not return entries from another project', () => {
    const pId1 = makeProject('P-001')
    const pId2 = makeProject('P-002')
    makeGeoEntry(pId1, { pointLabel: 'BH-1' })
    expect(getGeoByProject(pId2)).toHaveLength(0)
  })

  it('returns entries ordered by point_label ASC', () => {
    const pId = makeProject()
    makeGeoEntry(pId, { pointLabel: 'BH-3' })
    makeGeoEntry(pId, { pointLabel: 'BH-1' })
    makeGeoEntry(pId, { pointLabel: 'BH-2' })
    const labels = getGeoByProject(pId).map(e => e.pointLabel)
    expect(labels).toEqual(['BH-1', 'BH-2', 'BH-3'])
  })

  it('maps snake_case columns to camelCase', () => {
    const pId = makeProject()
    makeGeoEntry(pId, { pointLabel: 'TP-1', type: 'trial_pit' })
    const [entry] = getGeoByProject(pId)
    expect(entry).toHaveProperty('projectId', pId)
    expect(entry).toHaveProperty('pointLabel', 'TP-1')
    expect(entry).toHaveProperty('type', 'trial_pit')
  })
})

// ── createGeoEntry ────────────────────────────────────────────────────────────

describe('createGeoEntry', () => {
  it('stores mandatory fields and returns mapped object', () => {
    const pId = makeProject()
    const entry = createGeoEntry({
      projectId: pId,
      pointLabel: 'BH-1',
      type: 'borehole',
      macroRegion: 'EMEA',
      country: 'Portugal',
      place: 'Lisbon',
      soilType: 'Clay',
      rockType: '',
      seismicClass: 'A',
      notes: 'Test note',
    })
    expect(entry.id).toBeTypeOf('number')
    expect(entry.projectId).toBe(pId)
    expect(entry.pointLabel).toBe('BH-1')
    expect(entry.type).toBe('borehole')
    expect(entry.country).toBe('Portugal')
  })

  it('stores nullable numeric fields as null when omitted', () => {
    const pId = makeProject()
    const entry = makeGeoEntry(pId)
    expect(entry.depth).toBeNull()
    expect(entry.groundwaterDepth).toBeNull()
    expect(entry.bearingCapacity).toBeNull()
    expect(entry.sptNValue).toBeNull()
    expect(entry.latitude).toBeNull()
    expect(entry.longitude).toBeNull()
  })

  it('stores nullable numeric fields when provided', () => {
    const pId = makeProject()
    const entry = createGeoEntry({
      projectId: pId,
      pointLabel: 'BH-10',
      type: 'core_sample',
      macroRegion: '',
      country: '',
      place: '',
      depth: 25.5,
      soilType: '',
      rockType: 'Granite',
      groundwaterDepth: 10.0,
      bearingCapacity: 300,
      sptNValue: 42,
      seismicClass: '',
      latitude: 38.7,
      longitude: -9.1,
      notes: '',
    })
    expect(entry.depth).toBe(25.5)
    expect(entry.groundwaterDepth).toBe(10.0)
    expect(entry.bearingCapacity).toBe(300)
    expect(entry.sptNValue).toBe(42)
    expect(entry.latitude).toBe(38.7)
    expect(entry.longitude).toBe(-9.1)
  })

  it('stores sampledAt when provided', () => {
    const pId = makeProject()
    const entry = createGeoEntry({
      projectId: pId,
      pointLabel: 'FS-1',
      type: 'field_survey',
      macroRegion: '',
      country: '',
      place: '',
      soilType: '',
      rockType: '',
      seismicClass: '',
      notes: '',
      sampledAt: '2024-06-01',
    })
    expect(entry.sampledAt).toBe('2024-06-01')
  })

  it('all four geo types are accepted', () => {
    const pId = makeProject()
    const types = ['borehole', 'trial_pit', 'core_sample', 'field_survey'] as const
    for (const type of types) {
      const entry = makeGeoEntry(pId, { pointLabel: type, type })
      expect(entry.type).toBe(type)
    }
  })
})

// ── deleteGeoEntry ────────────────────────────────────────────────────────────

describe('deleteGeoEntry', () => {
  it('removes the row from the database', () => {
    const pId = makeProject()
    const entry = makeGeoEntry(pId)
    expect(getGeoByProject(pId)).toHaveLength(1)
    deleteGeoEntry(entry.id)
    expect(getGeoByProject(pId)).toHaveLength(0)
  })

  it('returns { success: true }', () => {
    const pId = makeProject()
    const entry = makeGeoEntry(pId)
    expect(deleteGeoEntry(entry.id)).toEqual({ success: true })
  })

  it('is a no-op for non-existent id', () => {
    expect(() => deleteGeoEntry(99999)).not.toThrow()
  })
})
