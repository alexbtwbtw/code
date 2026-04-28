export interface RawClaim {
  id: number
  claim_number: string
  insurer_id: number | null
  claimant_name: string
  claimant_email: string
  claimant_phone: string
  property_address: string
  property_type: string
  claim_type: string
  custom_type_name: string
  status: string
  date_opened: string
  date_closed: string | null
  estimated_value: number | null
  final_settlement: number | null
  adjuster_notes: string
  description: string
  created_at: string
  updated_at: string
}

export type PropertyType = 'residential' | 'commercial' | 'industrial' | 'other'
export type ClaimType = 'property_damage' | 'liability' | 'auto' | 'flood' | 'fire' | 'theft' | 'other'
export type ClaimStatus = 'new' | 'assigned' | 'inspection_scheduled' | 'inspected' | 'report_pending' | 'submitted' | 'closed' | 'disputed'

export interface Claim {
  id: number
  claimNumber: string
  insurerId: number | null
  claimantName: string
  claimantEmail: string
  claimantPhone: string
  propertyAddress: string
  propertyType: PropertyType
  claimType: ClaimType
  customTypeName: string
  status: ClaimStatus
  dateOpened: string
  dateClosed: string | null
  estimatedValue: number | null
  finalSettlement: number | null
  adjusterNotes: string
  description: string
  createdAt: string
  updatedAt: string
}

export function mapClaim(r: RawClaim): Claim {
  return {
    id: r.id,
    claimNumber: r.claim_number,
    insurerId: r.insurer_id,
    claimantName: r.claimant_name,
    claimantEmail: r.claimant_email,
    claimantPhone: r.claimant_phone,
    propertyAddress: r.property_address,
    propertyType: r.property_type as PropertyType,
    claimType: r.claim_type as ClaimType,
    customTypeName: r.custom_type_name,
    status: r.status as ClaimStatus,
    dateOpened: r.date_opened,
    dateClosed: r.date_closed,
    estimatedValue: r.estimated_value,
    finalSettlement: r.final_settlement,
    adjusterNotes: r.adjuster_notes,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface RawCustomClaimType {
  id: number
  name: string
  created_at: string
}

export interface CustomClaimType {
  id: number
  name: string
  createdAt: string
}

export function mapCustomClaimType(r: RawCustomClaimType): CustomClaimType {
  return { id: r.id, name: r.name, createdAt: r.created_at }
}
