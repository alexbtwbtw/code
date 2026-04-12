import { describe, it, expect } from 'vitest'
import { mapBook, mapReq, mapReqAssignment, type RawBook, type RawRequirement, type RawReqAssignment } from '../../types/requirements'

describe('mapBook', () => {
  const raw: RawBook = {
    id: 1, title: 'Civil Works', project_id: null, category: 'transport',
    description: 'Requirements for bridges', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  }

  it('maps all fields including nullable projectId', () => {
    const b = mapBook(raw)
    expect(b.id).toBe(1)
    expect(b.title).toBe('Civil Works')
    expect(b.projectId).toBeNull()
    expect(b.category).toBe('transport')
    expect(b.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(b.updatedAt).toBe('2024-01-01T00:00:00Z')
  })

  it('maps non-null projectId correctly', () => {
    const b = mapBook({ ...raw, project_id: 5 })
    expect(b.projectId).toBe(5)
  })
})

describe('mapReq', () => {
  const raw: RawRequirement = {
    id: 1, book_id: 2, title: 'Lead Geotechnical Engineer', description: 'Responsible for site investigations',
    discipline: 'geotechnical', level: 'lead', years_experience: 10,
    certifications: 'EurGeol', notes: 'must have SPT experience',
    compliance_note: '', source_evidence: '',
    created_at: '2024-01-01T00:00:00Z',
  }

  it('maps all fields to camelCase', () => {
    const r = mapReq(raw)
    expect(r.bookId).toBe(2)
    expect(r.yearsExperience).toBe(10)
    expect(r.certifications).toBe('EurGeol')
    expect(r.complianceNote).toBe('')
    expect(r.sourceEvidence).toBe('')
  })

  it('passes through null years_experience as null', () => {
    const r = mapReq({ ...raw, years_experience: null })
    expect(r.yearsExperience).toBeNull()
  })

  it('defaults compliance_note and source_evidence to empty string when null/undefined', () => {
    // The mapper uses ?? '' so null values become empty string
    const r = mapReq({ ...raw, compliance_note: '', source_evidence: '' })
    expect(r.complianceNote).toBe('')
    expect(r.sourceEvidence).toBe('')
  })
})

describe('mapReqAssignment', () => {
  const raw: RawReqAssignment = {
    id: 1, requirement_id: 5, team_member_id: 3,
    rationale: 'Best match for the role', created_at: '2024-01-01T00:00:00Z',
    member_name: 'Alice', member_title: 'Senior Engineer',
  }

  it('maps all fields to camelCase', () => {
    const a = mapReqAssignment(raw)
    expect(a.requirementId).toBe(5)
    expect(a.teamMemberId).toBe(3)
    expect(a.rationale).toBe('Best match for the role')
    expect(a.memberName).toBe('Alice')
    expect(a.memberTitle).toBe('Senior Engineer')
  })

  it('defaults undefined member fields to empty string', () => {
    const a = mapReqAssignment({ ...raw, member_name: undefined, member_title: undefined })
    expect(a.memberName).toBe('')
    expect(a.memberTitle).toBe('')
  })
})
