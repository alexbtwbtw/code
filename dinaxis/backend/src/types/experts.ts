export interface RawExpert {
  id: number
  name: string
  specialty: string
  email: string
  phone: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Expert {
  id: number
  name: string
  specialty: string
  email: string
  phone: string
  notes: string
  createdAt: string
  updatedAt: string
}

export function mapExpert(r: RawExpert): Expert {
  return {
    id: r.id,
    name: r.name,
    specialty: r.specialty,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface RawClaimExpert {
  id: number
  claim_id: number
  expert_id: number
  role: string
  work_summary: string
  added_at: string
}

export interface ClaimExpert {
  id: number
  claimId: number
  expertId: number
  role: string
  workSummary: string
  addedAt: string
}

export function mapClaimExpert(r: RawClaimExpert): ClaimExpert {
  return {
    id: r.id,
    claimId: r.claim_id,
    expertId: r.expert_id,
    role: r.role,
    workSummary: r.work_summary,
    addedAt: r.added_at,
  }
}
