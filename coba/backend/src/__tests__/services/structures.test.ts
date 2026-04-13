import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import { getStructuresByProject, createStructure, deleteStructure } from '../../services/structures'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProject(refCode = 'P-001') {
  return Number(db.prepare(`
    INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority, currency, project_manager, description, tags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(refCode, 'Test Project', 'ACME', 'EMEA', 'Portugal', 'Lisbon', 'transport', 'active', 'medium', 'EUR', 'PM', 'desc', '').lastInsertRowid)
}

function makeStructure(projectId: number, overrides: Record<string, unknown> = {}) {
  return createStructure({
    projectId,
    label: (overrides.label as string) ?? 'Bridge A',
    type: (overrides.type as 'bridge' | 'dam' | 'tunnel' | 'retaining_wall' | 'embankment' | 'building' | 'pipeline' | 'reservoir' | 'culvert' | 'road' | 'other') ?? 'bridge',
    material: '',
    macroRegion: '',
    country: 'Portugal',
    place: 'Lisbon',
    foundationType: '',
    notes: '',
    ...overrides,
  })
}

// ── getStructuresByProject ────────────────────────────────────────────────────

describe('getStructuresByProject', () => {
  it('returns empty array when no structures', () => {
    const pId = makeProject()
    expect(getStructuresByProject(pId)).toEqual([])
  })

  it('returns structures only for the specified project', () => {
    const pId1 = makeProject('P-001')
    const pId2 = makeProject('P-002')
    makeStructure(pId1, { label: 'S-1' })
    expect(getStructuresByProject(pId2)).toHaveLength(0)
    expect(getStructuresByProject(pId1)).toHaveLength(1)
  })

  it('returns structures ordered by label ASC', () => {
    const pId = makeProject()
    makeStructure(pId, { label: 'Zeta Bridge' })
    makeStructure(pId, { label: 'Alpha Tunnel' })
    makeStructure(pId, { label: 'Mango Dam' })
    const labels = getStructuresByProject(pId).map(s => s.label)
    expect(labels).toEqual(['Alpha Tunnel', 'Mango Dam', 'Zeta Bridge'])
  })

  it('maps snake_case to camelCase', () => {
    const pId = makeProject()
    makeStructure(pId, { label: 'Main Bridge', type: 'bridge', material: 'Concrete' })
    const [s] = getStructuresByProject(pId)
    expect(s).toHaveProperty('projectId', pId)
    expect(s).toHaveProperty('label', 'Main Bridge')
    expect(s).toHaveProperty('type', 'bridge')
    expect(s).toHaveProperty('material', 'Concrete')
  })
})

// ── createStructure ───────────────────────────────────────────────────────────

describe('createStructure', () => {
  it('creates a structure and returns it', () => {
    const pId = makeProject()
    const s = createStructure({
      projectId: pId,
      label: 'Main Dam',
      type: 'dam',
      material: 'Concrete',
      macroRegion: 'EMEA',
      country: 'Portugal',
      place: 'Alentejo',
      foundationType: 'Piled',
      notes: 'Test dam',
    })
    expect(s.id).toBeTypeOf('number')
    expect(s.projectId).toBe(pId)
    expect(s.label).toBe('Main Dam')
    expect(s.type).toBe('dam')
  })

  it('stores all optional numeric fields as null when omitted', () => {
    const pId = makeProject()
    const s = makeStructure(pId)
    expect(s.lengthM).toBeNull()
    expect(s.heightM).toBeNull()
    expect(s.spanM).toBeNull()
    expect(s.designLoad).toBeNull()
    expect(s.latitude).toBeNull()
    expect(s.longitude).toBeNull()
    expect(s.builtAt).toBeNull()
  })

  it('stores optional numeric fields when provided', () => {
    const pId = makeProject()
    const s = createStructure({
      projectId: pId,
      label: 'Long Bridge',
      type: 'bridge',
      material: 'Steel',
      macroRegion: '',
      country: '',
      place: '',
      lengthM: 450.5,
      heightM: 35.0,
      spanM: 120.0,
      foundationType: 'Caisson',
      designLoad: 5000,
      latitude: 38.7,
      longitude: -9.1,
      builtAt: '2010-01-01',
      notes: '',
    })
    expect(s.lengthM).toBe(450.5)
    expect(s.heightM).toBe(35.0)
    expect(s.spanM).toBe(120.0)
    expect(s.designLoad).toBe(5000)
    expect(s.latitude).toBe(38.7)
    expect(s.longitude).toBe(-9.1)
    expect(s.builtAt).toBe('2010-01-01')
  })

  it('accepts all structure types', () => {
    const pId = makeProject()
    const types = ['bridge', 'dam', 'tunnel', 'retaining_wall', 'embankment',
      'building', 'pipeline', 'reservoir', 'culvert', 'road', 'other'] as const
    for (const type of types) {
      const s = makeStructure(pId, { label: `Test ${type}`, type })
      expect(s.type).toBe(type)
    }
  })
})

// ── deleteStructure ───────────────────────────────────────────────────────────

describe('deleteStructure', () => {
  it('removes the structure from the database', () => {
    const pId = makeProject()
    const s = makeStructure(pId)
    expect(getStructuresByProject(pId)).toHaveLength(1)
    deleteStructure(s.id)
    expect(getStructuresByProject(pId)).toHaveLength(0)
  })

  it('returns { success: true }', () => {
    const pId = makeProject()
    const s = makeStructure(pId)
    expect(deleteStructure(s.id)).toEqual({ success: true })
  })

  it('is a no-op for non-existent id', () => {
    expect(() => deleteStructure(99999)).not.toThrow()
    expect(deleteStructure(99999)).toEqual({ success: true })
  })
})
