import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import {
  listProjects, getProjectById, createProject, updateProject, getProjectStats, getMyProjects,
} from '../../services/projects'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeProject(overrides: Record<string, unknown> = {}) {
  return createProject({
    refCode: overrides.refCode as string ?? 'P-001',
    name: (overrides.name as string) ?? 'Test Project',
    client: (overrides.client as string) ?? 'ACME',
    macroRegion: (overrides.macroRegion as string) ?? 'EMEA',
    country: (overrides.country as string) ?? 'Portugal',
    place: (overrides.place as string) ?? 'Lisbon',
    category: (overrides.category as 'water' | 'transport' | 'energy' | 'environment' | 'planning' | 'other') ?? 'transport',
    status: (overrides.status as 'planning' | 'active' | 'completed' | 'suspended' | 'cancelled') ?? 'active',
    priority: (overrides.priority as 'critical' | 'very_high' | 'high' | 'medium' | 'low' | 'very_low' | 'minimal') ?? 'medium',
    budget: (overrides.budget as number) ?? 100000,
    currency: 'EUR',
    projectManager: 'PM',
    teamSize: 3,
    description: (overrides.description as string) ?? 'desc',
    tags: (overrides.tags as string) ?? '',
  })
}

// ── listProjects ──────────────────────────────────────────────────────────────

describe('listProjects', () => {
  it('returns empty array when no projects', () => {
    expect(listProjects({ search: '', status: '', category: '', country: '', sortBy: 'relevance' })).toEqual([])
  })

  it('returns all projects', () => {
    makeProject({ refCode: 'P-001' })
    makeProject({ refCode: 'P-002' })
    expect(listProjects({ search: '', status: '', category: '', country: '', sortBy: 'relevance' })).toHaveLength(2)
  })

  it('filters by status', () => {
    makeProject({ refCode: 'P-001', status: 'active' })
    makeProject({ refCode: 'P-002', status: 'planning' })
    const result = listProjects({ search: '', status: 'active', category: '', country: '', sortBy: 'relevance' })
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('active')
  })

  it('filters by comma-separated statuses', () => {
    makeProject({ refCode: 'P-001', status: 'active' })
    makeProject({ refCode: 'P-002', status: 'planning' })
    makeProject({ refCode: 'P-003', status: 'completed' })
    const result = listProjects({ search: '', status: 'active,planning', category: '', country: '', sortBy: 'relevance' })
    expect(result).toHaveLength(2)
  })

  it('filters by category', () => {
    makeProject({ refCode: 'P-001', category: 'water' })
    makeProject({ refCode: 'P-002', category: 'transport' })
    const result = listProjects({ search: '', status: '', category: 'water', country: '', sortBy: 'relevance' })
    expect(result).toHaveLength(1)
    expect(result[0].category).toBe('water')
  })

  it('filters by country (partial match)', () => {
    makeProject({ refCode: 'P-001', country: 'Portugal' })
    makeProject({ refCode: 'P-002', country: 'Spain' })
    const result = listProjects({ search: '', status: '', category: '', country: 'Port', sortBy: 'relevance' })
    expect(result).toHaveLength(1)
    expect(result[0].country).toBe('Portugal')
  })

  it('searches by project name', () => {
    makeProject({ refCode: 'P-001', name: 'Lisbon Bridge Project' })
    makeProject({ refCode: 'P-002', name: 'Porto Water Supply' })
    const result = listProjects({ search: 'Bridge', status: '', category: '', country: '', sortBy: 'relevance' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Lisbon Bridge Project')
  })

  it('sorts by most hours descending', () => {
    const p1 = makeProject({ refCode: 'P-001' })
    const p2 = makeProject({ refCode: 'P-002' })
    const p3 = makeProject({ refCode: 'P-003' })
    // Add time entries so P-002 has most hours, P-001 has some, P-003 has none
    const memberId = db.prepare(`INSERT INTO team_members (name, title, email, phone, bio) VALUES ('T','T','t@t.com','','') RETURNING id`).get() as { id: number }
    db.prepare(`INSERT INTO time_entries (project_id, member_id, hours, date, description) VALUES (?, ?, 5, '2024-01-01', '')`).run(p1.id, memberId.id)
    db.prepare(`INSERT INTO time_entries (project_id, member_id, hours, date, description) VALUES (?, ?, 20, '2024-01-01', '')`).run(p2.id, memberId.id)
    const result = listProjects({ search: '', status: '', category: '', country: '', sortBy: 'budget' })
    expect(result[0].totalHours).toBe(20)
    expect(result[1].totalHours).toBe(5)
    expect(result[2].totalHours).toBe(0)
  })

  it('sorts by relevance: active first, then planning', () => {
    makeProject({ refCode: 'P-001', status: 'planning' })
    makeProject({ refCode: 'P-002', status: 'active' })
    const result = listProjects({ search: '', status: '', category: '', country: '', sortBy: 'relevance' })
    expect(result[0].status).toBe('active')
    expect(result[1].status).toBe('planning')
  })
})

// ── getProjectById ────────────────────────────────────────────────────────────

describe('getProjectById', () => {
  it('returns mapped project', () => {
    const created = makeProject({ refCode: 'P-001', name: 'My Project' })
    const fetched = getProjectById(created.id)
    expect(fetched.refCode).toBe('P-001')
    expect(fetched.name).toBe('My Project')
  })

  it('throws for unknown id', () => {
    expect(() => getProjectById(9999)).toThrow('9999')
  })
})

// ── createProject ─────────────────────────────────────────────────────────────

describe('createProject', () => {
  it('returns camelCase object with correct fields', () => {
    const p = makeProject({ refCode: 'NEW-001', name: 'New Project' })
    expect(p.id).toBeTypeOf('number')
    expect(p.refCode).toBe('NEW-001')
    expect(p.name).toBe('New Project')
  })

  it('duplicate refCode throws SQLite unique constraint error', () => {
    makeProject({ refCode: 'DUP-001' })
    expect(() => makeProject({ refCode: 'DUP-001' })).toThrow()
  })

  it('null optional fields stored as null', () => {
    const p = makeProject({})
    // budget is not undefined so it's set; startDate/endDate are omitted
    expect(p.startDate).toBeNull()
    expect(p.endDate).toBeNull()
  })
})

// ── updateProject ─────────────────────────────────────────────────────────────

describe('updateProject', () => {
  it('updates only supplied fields, leaves others unchanged', () => {
    const p = makeProject({ refCode: 'U-001', name: 'Original', country: 'Portugal' })
    const updated = updateProject({ id: p.id, name: 'Changed Name' })
    expect(updated.name).toBe('Changed Name')
    expect(updated.country).toBe('Portugal') // unchanged
    expect(updated.refCode).toBe('U-001')     // unchanged
  })

  it('updated_at advances after update', async () => {
    const p = makeProject({ refCode: 'U-002' })
    await new Promise(r => setTimeout(r, 1100))
    const updated = updateProject({ id: p.id, name: 'Updated' })
    expect(updated.updatedAt).not.toBe(p.updatedAt)
  })
})

// ── getProjectStats ────────────────────────────────────────────────────────────

describe('getProjectStats', () => {
  it('returns zeros when no projects', () => {
    const stats = getProjectStats()
    expect(stats.total).toBe(0)
    expect(stats.byStatus).toHaveLength(0)
    expect(stats.totalBudget).toBe(0)
  })

  it('counts total projects correctly', () => {
    makeProject({ refCode: 'S-001' })
    makeProject({ refCode: 'S-002' })
    expect(getProjectStats().total).toBe(2)
  })

  it('sums EUR budgets correctly', () => {
    makeProject({ refCode: 'B-001', budget: 100000 })
    makeProject({ refCode: 'B-002', budget: 50000 })
    expect(getProjectStats().totalBudget).toBe(150000)
  })

  it('filters by status when provided', () => {
    makeProject({ refCode: 'FS-001', status: 'active' })
    makeProject({ refCode: 'FS-002', status: 'planning' })
    const stats = getProjectStats('active')
    expect(stats.total).toBe(1)
  })
})

// ── getMyProjects ──────────────────────────────────────────────────────────────

describe('getMyProjects', () => {
  it('returns empty for member not tagged to any project', () => {
    const mId = Number(db.prepare(`INSERT INTO team_members (name) VALUES ('Test')`).run().lastInsertRowid)
    expect(getMyProjects(mId)).toEqual([])
  })

  it('returns only projects where member is tagged', () => {
    const mId = Number(db.prepare(`INSERT INTO team_members (name) VALUES ('Test')`).run().lastInsertRowid)
    const p1 = makeProject({ refCode: 'MP-001' })
    makeProject({ refCode: 'MP-002' }) // not tagged
    db.prepare(`INSERT INTO project_team (project_id, team_member_id, role_on_project) VALUES (?,?,'engineer')`).run(p1.id, mId)
    const result = getMyProjects(mId)
    expect(result).toHaveLength(1)
    expect(result[0].refCode).toBe('MP-001')
  })
})
