import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import {
  listBooks, getBookById, createBook, updateBook, deleteBook,
  createRequirement, updateRequirement, deleteRequirement,
  scoreRequirement, matchMembersLocal,
} from '../../services/requirements'
import { mapReq } from '../../types/requirements'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProject(refCode = 'P-001') {
  return Number(db.prepare(`
    INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority, currency, project_manager, description, tags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(refCode, 'Test', 'C', 'EMEA', 'Portugal', 'Lisbon', 'transport', 'active', 'medium', 'EUR', 'PM', '', '').lastInsertRowid)
}

function makeBook(overrides: Record<string, unknown> = {}) {
  return createBook({
    title: (overrides.title as string) ?? 'Test Book',
    category: (overrides.category as 'water' | 'transport' | 'energy' | 'environment' | 'planning' | 'other') ?? 'other',
    description: (overrides.description as string) ?? '',
    projectId: (overrides.projectId as number | null | undefined) ?? null,
  })
}

function makeReq(bookId: number, overrides: Record<string, unknown> = {}) {
  return createRequirement({
    bookId,
    title: (overrides.title as string) ?? 'Lead Engineer',
    discipline: (overrides.discipline as 'geotechnical' | 'structural' | 'environmental' | 'hydraulic' | 'transport' | 'electrical' | 'planning' | 'other') ?? 'geotechnical',
    level: (overrides.level as 'any' | 'junior' | 'mid' | 'senior' | 'lead') ?? 'lead',
    certifications: (overrides.certifications as string) ?? '',
    description: '',
    notes: '',
    complianceNote: '',
    sourceEvidence: '',
    yearsExperience: (overrides.yearsExperience as number | null | undefined) ?? null,
  })
}

// ── listBooks ─────────────────────────────────────────────────────────────────

describe('listBooks', () => {
  it('returns empty list when no books', () => {
    expect(listBooks()).toEqual([])
  })

  it('returns books with requirementCount', () => {
    const b = makeBook()
    makeReq(b.id)
    makeReq(b.id)
    const books = listBooks()
    expect(books).toHaveLength(1)
    expect(books[0].requirementCount).toBe(2)
  })

  it('includes projectName/projectRefCode when linked', () => {
    const pId = makeProject('R-001')
    const b = makeBook({ projectId: pId })
    const books = listBooks()
    expect(books[0].projectName).toBe('Test')
    expect(books[0].projectRefCode).toBe('R-001')
    expect(books[0].projectId).toBe(pId)
  })

  it('projectName is undefined when not linked', () => {
    makeBook()
    const books = listBooks()
    expect(books[0].projectName).toBeUndefined()
    expect(books[0].projectRefCode).toBeUndefined()
  })
})

// ── getBookById ────────────────────────────────────────────────────────────────

describe('getBookById', () => {
  it('returns book with nested requirements', () => {
    const b = makeBook({ title: 'My Book' })
    makeReq(b.id, { title: 'Req 1' })
    makeReq(b.id, { title: 'Req 2' })
    const fetched = getBookById(b.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.title).toBe('My Book')
    expect(fetched!.requirements).toHaveLength(2)
  })

  it('returns null for missing id', () => {
    expect(getBookById(9999)).toBeNull()
  })

  it('includes linked project', () => {
    const pId = makeProject('R-002')
    const b = makeBook({ projectId: pId })
    const fetched = getBookById(b.id)
    expect(fetched!.project).not.toBeNull()
    expect(fetched!.project!.refCode).toBe('R-002')
  })
})

// ── createBook ────────────────────────────────────────────────────────────────

describe('createBook', () => {
  it('creates book with nullable projectId', () => {
    const b = makeBook()
    expect(b.id).toBeTypeOf('number')
    expect(b.projectId).toBeNull()
  })
})

// ── updateBook ────────────────────────────────────────────────────────────────

describe('updateBook', () => {
  it('updates book fields', () => {
    const b = makeBook({ title: 'Old Title' })
    const updated = updateBook({ id: b.id, title: 'New Title', category: 'water', description: 'updated desc' })
    expect(updated.title).toBe('New Title')
    expect(updated.category).toBe('water')
    expect(updated.description).toBe('updated desc')
  })
})

// ── deleteBook ────────────────────────────────────────────────────────────────

describe('deleteBook', () => {
  it('deletes book and cascades to requirements', () => {
    const b = makeBook()
    makeReq(b.id)
    deleteBook(b.id)
    expect(getBookById(b.id)).toBeNull()
    const reqs = db.prepare(`SELECT * FROM requirements WHERE book_id = ?`).all(b.id)
    expect(reqs).toHaveLength(0)
  })
})

// ── createRequirement ─────────────────────────────────────────────────────────

describe('createRequirement', () => {
  it('creates requirement with null yearsExperience', () => {
    const b = makeBook()
    const r = makeReq(b.id)
    expect(r.id).toBeTypeOf('number')
    expect(r.yearsExperience).toBeNull()
  })

  it('creates requirement with numeric yearsExperience', () => {
    const b = makeBook()
    const r = makeReq(b.id, { yearsExperience: 10 })
    expect(r.yearsExperience).toBe(10)
  })
})

// ── updateRequirement ─────────────────────────────────────────────────────────

describe('updateRequirement', () => {
  it('updates all fields', () => {
    const b = makeBook()
    const r = makeReq(b.id, { title: 'Old' })
    const updated = updateRequirement({
      id: r.id, bookId: b.id, title: 'New', description: 'new desc',
      discipline: 'structural', level: 'senior', yearsExperience: 5,
      certifications: 'PE', notes: '', complianceNote: '', sourceEvidence: '',
    })
    expect(updated.title).toBe('New')
    expect(updated.discipline).toBe('structural')
    expect(updated.yearsExperience).toBe(5)
  })
})

// ── deleteRequirement ─────────────────────────────────────────────────────────

describe('deleteRequirement', () => {
  it('removes the requirement', () => {
    const b = makeBook()
    const r = makeReq(b.id)
    deleteRequirement(r.id)
    const fetched = getBookById(b.id)
    expect(fetched!.requirements).toHaveLength(0)
  })
})

// ── scoreRequirement ──────────────────────────────────────────────────────────

describe('scoreRequirement', () => {
  function makeMappedReq(overrides: Record<string, unknown> = {}) {
    return mapReq({
      id: 1, book_id: 1, title: 'Test',
      description: '', discipline: 'geotechnical', level: 'any',
      years_experience: null, certifications: '', notes: '',
      compliance_note: '', source_evidence: '', created_at: '',
      ...overrides,
    })
  }

  it('scores 0 for member with no matching bio or history', () => {
    const req = makeMappedReq({ discipline: 'geotechnical' })
    const { score } = scoreRequirement(req, 'Expert in urban planning.', 'Planner', [])
    expect(score).toBe(0)
  })

  it('scores ≥ 3 for member whose bio contains discipline keyword', () => {
    const req = makeMappedReq({ discipline: 'geotechnical' })
    const { score } = scoreRequirement(req, 'I am a geotechnical specialist.', 'Engineer', [])
    expect(score).toBeGreaterThanOrEqual(3)
  })

  it('history category match adds score', () => {
    const req = makeMappedReq({ discipline: 'transport' })
    const { score } = scoreRequirement(req, '', '', ['transport'])
    expect(score).toBeGreaterThan(0)
  })

  it('level keyword match adds score', () => {
    const req = makeMappedReq({ discipline: 'geotechnical', level: 'senior' })
    const { score } = scoreRequirement(req, 'sénior engineer with 15 years.', 'Senior Geotechnical', [])
    expect(score).toBeGreaterThan(0)
  })

  it('certification word match adds score', () => {
    const req = makeMappedReq({ certifications: 'EurGeol' })
    const { score } = scoreRequirement(req, 'holds EurGeol certification.', '', [])
    expect(score).toBeGreaterThan(0)
  })
})

// ── matchMembersLocal ─────────────────────────────────────────────────────────

describe('matchMembersLocal', () => {
  it('throws NOT_FOUND for unknown requirement', () => {
    expect(() => matchMembersLocal(9999, 5)).toThrow()
  })

  it('returns ranked list when members exist', () => {
    // Create a member with matching bio
    db.prepare(`INSERT INTO team_members (name, title, bio) VALUES ('Alice', 'Geotechnical Specialist', 'Expert in geotechnical engineering and soil mechanics.')`).run()

    const b = makeBook()
    const r = makeReq(b.id, { discipline: 'geotechnical' })
    const results = matchMembersLocal(r.id, 5)
    expect(results.length).toBeGreaterThan(0)
    // Alice should rank first since she has geotechnical in bio
    expect(results[0].name).toBe('Alice')
    expect(results[0].score).toBeGreaterThan(0)
  })
})
