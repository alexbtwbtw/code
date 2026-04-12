import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import {
  listMembers, getMemberById, createMember, updateMember,
  getMembersByProject, tagProject, untagProject,
  addHistory, updateHistory, deleteHistory, getCvData, attachCv,
} from '../../services/team'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProject(refCode = 'P-001') {
  return Number(db.prepare(`
    INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority, currency, project_manager, description, tags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(refCode, 'Test', 'C', 'EMEA', 'Portugal', 'Lisbon', 'transport', 'active', 'medium', 'EUR', 'PM', '', '').lastInsertRowid)
}

function baseMember(overrides: Record<string, string> = {}) {
  return { name: 'Alice', title: 'Engineer', email: 'a@co.com', phone: '', bio: 'Foundation expert specialist.', ...overrides }
}

// ── listMembers ────────────────────────────────────────────────────────────────

describe('listMembers', () => {
  it('returns empty when no members', () => {
    expect(listMembers()).toEqual([])
  })

  it('returns all members with projectCount', () => {
    createMember(baseMember({ name: 'Bob' }))
    createMember(baseMember({ name: 'Alice' }))
    const members = listMembers()
    expect(members).toHaveLength(2)
    expect(members.every(m => typeof m.projectCount === 'number')).toBe(true)
  })

  it('is ordered by name ASC', () => {
    createMember(baseMember({ name: 'Zara' }))
    createMember(baseMember({ name: 'Alice' }))
    const members = listMembers()
    expect(members[0].name).toBe('Alice')
    expect(members[1].name).toBe('Zara')
  })
})

// ── getMemberById ──────────────────────────────────────────────────────────────

describe('getMemberById', () => {
  it('returns member with empty history and cvs', () => {
    const m = createMember(baseMember())
    const fetched = getMemberById(m.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.name).toBe('Alice')
    expect(fetched!.history).toEqual([])
    expect(fetched!.cvs).toEqual([])
    expect(fetched!.taggedProjects).toEqual([])
  })

  it('returns null for missing id', () => {
    expect(getMemberById(9999)).toBeNull()
  })
})

// ── createMember ──────────────────────────────────────────────────────────────

describe('createMember', () => {
  it('creates a member and returns mapped object', () => {
    const m = createMember(baseMember())
    expect(m.id).toBeTypeOf('number')
    expect(m.name).toBe('Alice')
    expect(m.title).toBe('Engineer')
  })

  it('creates member with CV', () => {
    const m = createMember({
      ...baseMember(),
      cv: { filename: 'alice.pdf', fileSize: 1024, fileData: 'base64data==' },
    })
    const fetched = getMemberById(m.id)
    expect(fetched!.cvs).toHaveLength(1)
    expect(fetched!.cvs[0].filename).toBe('alice.pdf')
  })
})

// ── updateMember ──────────────────────────────────────────────────────────────

describe('updateMember', () => {
  it('updates member fields', () => {
    const m = createMember(baseMember({ name: 'Bob', title: 'Junior' }))
    const updated = updateMember({ id: m.id, name: 'Bob Updated', title: 'Senior', email: '', phone: '', bio: '' })
    expect(updated.name).toBe('Bob Updated')
    expect(updated.title).toBe('Senior')
  })
})

// ── getMembersByProject ───────────────────────────────────────────────────────

describe('getMembersByProject', () => {
  it('returns empty when no members tagged', () => {
    const pId = makeProject()
    expect(getMembersByProject(pId)).toEqual([])
  })

  it('returns members tagged to project with roleOnProject', () => {
    const pId = makeProject()
    const m = createMember(baseMember())
    tagProject(pId, m.id, 'lead_engineer')
    const result = getMembersByProject(pId)
    expect(result).toHaveLength(1)
    expect(result[0].roleOnProject).toBe('lead_engineer')
  })
})

// ── tagProject / untagProject ─────────────────────────────────────────────────

describe('tagProject', () => {
  it('tags member to project successfully', () => {
    const pId = makeProject()
    const m = createMember(baseMember())
    const result = tagProject(pId, m.id, 'engineer')
    expect(result).toEqual({ success: true })
    expect(getMembersByProject(pId)).toHaveLength(1)
  })

  it('is idempotent (INSERT OR REPLACE)', () => {
    const pId = makeProject()
    const m = createMember(baseMember())
    tagProject(pId, m.id, 'engineer')
    expect(() => tagProject(pId, m.id, 'lead')).not.toThrow()
    expect(getMembersByProject(pId)).toHaveLength(1)
  })
})

describe('untagProject', () => {
  it('removes tag from project', () => {
    const pId = makeProject()
    const m = createMember(baseMember())
    tagProject(pId, m.id, 'engineer')
    untagProject(pId, m.id)
    expect(getMembersByProject(pId)).toHaveLength(0)
  })

  it('no-op for non-existent tag', () => {
    const pId = makeProject()
    const m = createMember(baseMember())
    expect(() => untagProject(pId, m.id)).not.toThrow()
  })
})

// ── addHistory ────────────────────────────────────────────────────────────────

describe('addHistory', () => {
  it('creates history entry with sub-entries atomically', () => {
    const m = createMember(baseMember())
    const h = addHistory({
      teamMemberId: m.id, projectId: null, projectName: 'Bridge X',
      macroRegion: 'EMEA', country: 'Portugal', place: 'Porto',
      category: 'transport', notes: 'main contract',
      geoEntries: [
        { pointLabel: 'BH-1', type: 'borehole', macroRegion: 'EMEA', country: 'Portugal', place: 'Porto', soilType: 'sand', rockType: '', seismicClass: '', notes: '' },
      ],
      structures: [
        { label: 'Main Bridge', type: 'bridge', material: 'steel', macroRegion: 'EMEA', country: 'Portugal', place: 'Porto', foundationType: '', notes: '' },
      ],
      features: [
        { label: 'Fault Zone', description: 'geological feature', macroRegion: 'EMEA', country: 'Portugal', place: 'Porto', notes: '' },
      ],
    })
    expect(h.projectName).toBe('Bridge X')
    expect(h.geoEntries).toHaveLength(1)
    expect(h.geoEntries[0].pointLabel).toBe('BH-1')
    expect(h.structures).toHaveLength(1)
    expect(h.structures[0].label).toBe('Main Bridge')
    expect(h.features).toHaveLength(1)
    expect(h.features[0].label).toBe('Fault Zone')
  })

  it('getMemberById returns history with nested sub-entries', () => {
    const m = createMember(baseMember())
    addHistory({
      teamMemberId: m.id, projectId: null, projectName: 'Tunnel Y',
      macroRegion: 'EMEA', country: 'Portugal', place: 'Lisbon',
      category: 'transport', notes: '',
      geoEntries: [], structures: [], features: [],
    })
    const fetched = getMemberById(m.id)
    expect(fetched!.history).toHaveLength(1)
    expect(fetched!.history[0].projectName).toBe('Tunnel Y')
  })
})

// ── updateHistory ──────────────────────────────────────────────────────────────

describe('updateHistory', () => {
  it('replaces sub-entries on update', () => {
    const m = createMember(baseMember())
    const h = addHistory({
      teamMemberId: m.id, projectId: null, projectName: 'Old',
      macroRegion: 'EMEA', country: 'Portugal', place: 'Porto',
      category: 'transport', notes: '',
      geoEntries: [
        { pointLabel: 'BH-1', type: 'borehole', macroRegion: '', country: '', place: '', soilType: '', rockType: '', seismicClass: '', notes: '' },
        { pointLabel: 'BH-2', type: 'borehole', macroRegion: '', country: '', place: '', soilType: '', rockType: '', seismicClass: '', notes: '' },
      ],
      structures: [], features: [],
    })
    expect(h.geoEntries).toHaveLength(2)

    const updated = updateHistory({
      id: h.id, teamMemberId: m.id, projectId: null, projectName: 'New',
      macroRegion: 'EMEA', country: 'Portugal', place: 'Porto',
      category: 'transport', notes: '',
      geoEntries: [
        { pointLabel: 'BH-1', type: 'borehole', macroRegion: '', country: '', place: '', soilType: '', rockType: '', seismicClass: '', notes: '' },
      ],
      structures: [], features: [],
    })
    expect(updated.projectName).toBe('New')
    expect(updated.geoEntries).toHaveLength(1)
  })
})

// ── deleteHistory ──────────────────────────────────────────────────────────────

describe('deleteHistory', () => {
  it('deletes history and cascades to sub-entries', () => {
    const m = createMember(baseMember())
    const h = addHistory({
      teamMemberId: m.id, projectId: null, projectName: 'Old',
      macroRegion: '', country: '', place: '', category: 'other', notes: '',
      geoEntries: [
        { pointLabel: 'BH-1', type: 'borehole', macroRegion: '', country: '', place: '', soilType: '', rockType: '', seismicClass: '', notes: '' },
      ],
      structures: [], features: [],
    })
    deleteHistory(h.id)
    const fetched = getMemberById(m.id)
    expect(fetched!.history).toHaveLength(0)
    const geos = db.prepare(`SELECT * FROM member_history_geo WHERE history_id = ?`).all(h.id)
    expect(geos).toHaveLength(0)
  })
})

// ── getCvData / attachCv ──────────────────────────────────────────────────────

describe('getCvData', () => {
  it('returns null for missing cv', async () => {
    expect(await getCvData(9999)).toBeNull()
  })

  it('returns filename and fileData for existing cv', async () => {
    const m = createMember(baseMember())
    const cv = await attachCv({ teamMemberId: m.id, filename: 'test.pdf', fileSize: 512, fileData: 'abc123==' })
    const data = await getCvData(cv.id)
    expect(data).not.toBeNull()
    expect(data!.filename).toBe('test.pdf')
    expect((data as { fileData: string }).fileData).toBe('abc123==')
  })
})

describe('attachCv', () => {
  it('returns id, filename, fileSize', async () => {
    const m = createMember(baseMember())
    const cv = await attachCv({ teamMemberId: m.id, filename: 'cv.pdf', fileSize: 2048, fileData: 'data' })
    expect(cv.id).toBeTypeOf('number')
    expect(cv.filename).toBe('cv.pdf')
    expect(cv.fileSize).toBe(2048)
  })
})
