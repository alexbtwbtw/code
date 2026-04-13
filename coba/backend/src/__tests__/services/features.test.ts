import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import { getFeaturesByProject, createFeature, deleteFeature } from '../../services/features'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProject(refCode = 'P-001') {
  return Number(db.prepare(`
    INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority, currency, project_manager, description, tags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(refCode, 'Test Project', 'ACME', 'EMEA', 'Portugal', 'Lisbon', 'transport', 'active', 'medium', 'EUR', 'PM', 'desc', '').lastInsertRowid)
}

function makeFeature(projectId: number, overrides: Record<string, unknown> = {}) {
  return createFeature({
    projectId,
    label: (overrides.label as string) ?? 'Feature A',
    description: '',
    macroRegion: '',
    country: '',
    place: '',
    notes: '',
    ...overrides,
  })
}

// ── getFeaturesByProject ──────────────────────────────────────────────────────

describe('getFeaturesByProject', () => {
  it('returns empty array when no features', () => {
    const pId = makeProject()
    expect(getFeaturesByProject(pId)).toEqual([])
  })

  it('returns features only for the specified project', () => {
    const pId1 = makeProject('P-001')
    const pId2 = makeProject('P-002')
    makeFeature(pId1, { label: 'F-1' })
    makeFeature(pId2, { label: 'F-2' })
    expect(getFeaturesByProject(pId1)).toHaveLength(1)
    expect(getFeaturesByProject(pId2)).toHaveLength(1)
  })

  it('returns features ordered by label ASC', () => {
    const pId = makeProject()
    makeFeature(pId, { label: 'Zeta' })
    makeFeature(pId, { label: 'Alpha' })
    makeFeature(pId, { label: 'Mango' })
    const labels = getFeaturesByProject(pId).map(f => f.label)
    expect(labels).toEqual(['Alpha', 'Mango', 'Zeta'])
  })

  it('maps snake_case to camelCase', () => {
    const pId = makeProject()
    makeFeature(pId, { label: 'Test Feature', description: 'desc', macroRegion: 'EMEA', country: 'Portugal' })
    const [f] = getFeaturesByProject(pId)
    expect(f).toHaveProperty('projectId', pId)
    expect(f).toHaveProperty('label', 'Test Feature')
    expect(f).toHaveProperty('macroRegion', 'EMEA')
  })
})

// ── createFeature ─────────────────────────────────────────────────────────────

describe('createFeature', () => {
  it('creates a feature and returns it', () => {
    const pId = makeProject()
    const f = createFeature({
      projectId: pId,
      label: 'Slope',
      description: 'A slope zone',
      macroRegion: 'EMEA',
      country: 'Portugal',
      place: 'Lisbon',
      notes: 'Watch for erosion',
    })
    expect(f.id).toBeTypeOf('number')
    expect(f.projectId).toBe(pId)
    expect(f.label).toBe('Slope')
    expect(f.description).toBe('A slope zone')
  })

  it('stores latitude and longitude when provided', () => {
    const pId = makeProject()
    const f = createFeature({
      projectId: pId,
      label: 'Fault Line',
      description: '',
      macroRegion: '',
      country: '',
      place: '',
      notes: '',
      latitude: 38.716,
      longitude: -9.139,
    })
    expect(f.latitude).toBe(38.716)
    expect(f.longitude).toBe(-9.139)
  })

  it('latitude and longitude are null when omitted', () => {
    const pId = makeProject()
    const f = makeFeature(pId)
    expect(f.latitude).toBeNull()
    expect(f.longitude).toBeNull()
  })
})

// ── deleteFeature ─────────────────────────────────────────────────────────────

describe('deleteFeature', () => {
  it('removes the feature from the database', () => {
    const pId = makeProject()
    const f = makeFeature(pId)
    expect(getFeaturesByProject(pId)).toHaveLength(1)
    deleteFeature(f.id)
    expect(getFeaturesByProject(pId)).toHaveLength(0)
  })

  it('returns { success: true }', () => {
    const pId = makeProject()
    const f = makeFeature(pId)
    expect(deleteFeature(f.id)).toEqual({ success: true })
  })

  it('is idempotent — does not throw for non-existent id', () => {
    expect(() => deleteFeature(99999)).not.toThrow()
    expect(deleteFeature(99999)).toEqual({ success: true })
  })
})
