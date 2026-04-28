export interface RawDocument {
  id: string
  claim_id: number
  filename: string
  mime_type: string
  storage_key: string
  storage_adapter: string
  size_bytes: number
  label: string
  description: string
  uploaded_at: string
}

export interface Document {
  id: string
  claimId: number
  filename: string
  mimeType: string
  storageKey: string
  storageAdapter: string
  sizeBytes: number
  label: string
  description: string
  uploadedAt: string
}

export function mapDocument(r: RawDocument): Document {
  return {
    id: r.id,
    claimId: r.claim_id,
    filename: r.filename,
    mimeType: r.mime_type,
    storageKey: r.storage_key,
    storageAdapter: r.storage_adapter,
    sizeBytes: r.size_bytes,
    label: r.label ?? '',
    description: r.description ?? '',
    uploadedAt: r.uploaded_at,
  }
}

export interface RawDocumentComment {
  id: string
  document_id: string
  text: string
  created_at: string
}

export interface DocumentComment {
  id: string
  documentId: string
  text: string
  createdAt: string
}

export function mapDocumentComment(r: RawDocumentComment): DocumentComment {
  return {
    id: r.id,
    documentId: r.document_id,
    text: r.text,
    createdAt: r.created_at,
  }
}

export interface RawClaimComment {
  id: string
  claim_id: number
  text: string
  created_at: string
}

export interface ClaimComment {
  id: string
  claimId: number
  text: string
  createdAt: string
}

export function mapClaimComment(r: RawClaimComment): ClaimComment {
  return {
    id: r.id,
    claimId: r.claim_id,
    text: r.text,
    createdAt: r.created_at,
  }
}
