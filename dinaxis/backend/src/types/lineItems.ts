export type LineItemCategory = 'structure' | 'contents' | 'auto' | 'labor' | 'other'

export interface RawLineItem {
  id: number
  claim_id: number
  description: string
  category: string
  estimated_cost: number
  approved_cost: number | null
  notes: string
  created_at: string
}

export interface LineItem {
  id: number
  claimId: number
  description: string
  category: LineItemCategory
  estimatedCost: number
  approvedCost: number | null
  notes: string
  createdAt: string
}

export interface RawLineItemPhoto {
  id: string
  line_item_id: number
  filename: string
  mime_type: string
  storage_key: string
  storage_adapter: string
  size_bytes: number
  uploaded_at: string
}

export interface LineItemPhoto {
  id: string
  lineItemId: number
  filename: string
  mimeType: string
  storageKey: string
  storageAdapter: string
  sizeBytes: number
  uploadedAt: string
}

export function mapLineItemPhoto(r: RawLineItemPhoto): LineItemPhoto {
  return {
    id: r.id,
    lineItemId: r.line_item_id,
    filename: r.filename,
    mimeType: r.mime_type,
    storageKey: r.storage_key,
    storageAdapter: r.storage_adapter,
    sizeBytes: r.size_bytes,
    uploadedAt: r.uploaded_at,
  }
}

export function mapLineItem(r: RawLineItem): LineItem {
  return {
    id: r.id,
    claimId: r.claim_id,
    description: r.description,
    category: r.category as LineItemCategory,
    estimatedCost: r.estimated_cost,
    approvedCost: r.approved_cost,
    notes: r.notes,
    createdAt: r.created_at,
  }
}
