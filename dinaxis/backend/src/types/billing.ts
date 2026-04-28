export interface RawBillingItem {
  id: number
  claim_id: number
  description: string
  category: string
  amount: number
  notes: string
  created_at: string
}

export type BillingCategory = 'travel' | 'expert' | 'photos' | 'admin' | 'fees' | 'other'

export interface BillingItem {
  id: number
  claimId: number
  description: string
  category: BillingCategory
  amount: number
  notes: string
  createdAt: string
}

export function mapBillingItem(r: RawBillingItem): BillingItem {
  return {
    id: r.id,
    claimId: r.claim_id,
    description: r.description,
    category: r.category as BillingCategory,
    amount: r.amount,
    notes: r.notes,
    createdAt: r.created_at,
  }
}
