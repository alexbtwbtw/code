import { describe, it, expect } from 'vitest'
import { mapProject, type RawProject } from '../../types/projects'

const baseRaw: RawProject = {
  id: 1,
  ref_code: 'P-001',
  name: 'Test Project',
  client: 'ACME Corp',
  macro_region: 'EMEA',
  country: 'Portugal',
  place: 'Lisbon',
  category: 'transport',
  status: 'active',
  priority: 'high',
  start_date: '2024-01-01',
  end_date: null,
  budget: 150000,
  currency: 'EUR',
  project_manager: 'Alice',
  team_size: 5,
  description: 'A test project',
  tags: 'foo,bar',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('mapProject', () => {
  it('maps all snake_case fields to camelCase', () => {
    const p = mapProject(baseRaw)
    expect(p.id).toBe(1)
    expect(p.refCode).toBe('P-001')
    expect(p.macroRegion).toBe('EMEA')
    expect(p.startDate).toBe('2024-01-01')
    expect(p.projectManager).toBe('Alice')
    expect(p.teamSize).toBe(5)
    expect(p.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(p.updatedAt).toBe('2024-01-01T00:00:00Z')
  })

  it('passes through null end_date as null', () => {
    const p = mapProject(baseRaw)
    expect(p.endDate).toBeNull()
  })

  it('passes through null budget as null', () => {
    const p = mapProject({ ...baseRaw, budget: null })
    expect(p.budget).toBeNull()
  })

  it('passes through numeric budget unchanged', () => {
    const p = mapProject(baseRaw)
    expect(p.budget).toBe(150000)
  })

  it('preserves priority field', () => {
    const p = mapProject({ ...baseRaw, priority: 'critical' })
    expect(p.priority).toBe('critical')
  })

  it('maps tags string as-is', () => {
    const p = mapProject(baseRaw)
    expect(p.tags).toBe('foo,bar')
  })
})
