export interface RawInspection {
  id: number
  claim_id: number
  scheduled_date: string | null
  completed_date: string | null
  findings: string
  adjuster_notes: string
  latitude: number | null
  longitude: number | null
  created_at: string
}

export interface Inspection {
  id: number
  claimId: number
  scheduledDate: string | null
  completedDate: string | null
  findings: string
  adjusterNotes: string
  latitude: number | null
  longitude: number | null
  createdAt: string
}

export function mapInspection(r: RawInspection): Inspection {
  return {
    id: r.id,
    claimId: r.claim_id,
    scheduledDate: r.scheduled_date,
    completedDate: r.completed_date,
    findings: r.findings,
    adjusterNotes: r.adjuster_notes,
    latitude: r.latitude,
    longitude: r.longitude,
    createdAt: r.created_at,
  }
}
