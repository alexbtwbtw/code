// ── Raw DB → camelCase ────────────────────────────────────────────────────────

export type RawBook = {
  id: number; title: string; project_id: number | null; category: string
  description: string; created_at: string; updated_at: string
}

export type RawRequirement = {
  id: number; book_id: number; title: string; description: string
  discipline: string; level: string; years_experience: number | null
  certifications: string; notes: string; compliance_note: string
  source_evidence: string; created_at: string
}

export type RawReqAssignment = {
  id: number; requirement_id: number; team_member_id: number
  rationale: string; created_at: string
  // joined fields from team_members
  member_name?: string; member_title?: string
}

export function mapBook(r: RawBook) {
  return {
    id: r.id, title: r.title, projectId: r.project_id, category: r.category,
    description: r.description, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

export function mapReq(r: RawRequirement) {
  return {
    id: r.id, bookId: r.book_id, title: r.title, description: r.description,
    discipline: r.discipline, level: r.level, yearsExperience: r.years_experience,
    certifications: r.certifications, notes: r.notes,
    complianceNote: r.compliance_note ?? '',
    sourceEvidence: r.source_evidence ?? '',
    createdAt: r.created_at,
  }
}

export function mapReqAssignment(r: RawReqAssignment) {
  return {
    id: r.id, requirementId: r.requirement_id, teamMemberId: r.team_member_id,
    rationale: r.rationale, createdAt: r.created_at,
    memberName: r.member_name ?? '', memberTitle: r.member_title ?? '',
  }
}
