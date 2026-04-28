import { db } from '../db'
import { getStorageAdapter } from '../lib/storage'
import { logAudit } from '../lib/audit'
import {
  type Document,
  type DocumentComment,
  type ClaimComment,
  type RawDocument,
  type RawDocumentComment,
  type RawClaimComment,
  mapDocument,
  mapDocumentComment,
  mapClaimComment,
} from '../types/documents'
import type { addDocumentCommentSchema, addClaimCommentSchema } from '../schemas/documents'
import type { z } from 'zod'

export function createDocument(params: {
  id: string
  claimId: number | string
  filename: string
  mimeType: string
  storageKey: string
  storageAdapter: string
  sizeBytes: number
  label?: string
  description?: string
}): Document {
  db.prepare(`
    INSERT INTO documents (id, claim_id, filename, mime_type, storage_key, storage_adapter, size_bytes, label, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.id,
    params.claimId,
    params.filename,
    params.mimeType,
    params.storageKey,
    params.storageAdapter,
    params.sizeBytes,
    params.label ?? '',
    params.description ?? '',
  )
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(params.id) as RawDocument
  logAudit('CREATE', 'document', params.id, { filename: params.filename, claimId: params.claimId })
  return mapDocument(row)
}

export function updateDocument(id: string, fields: { label?: string; description?: string }): Document | null {
  const doc = getDocumentById(id)
  if (!doc) return null
  const label = fields.label ?? doc.label
  const description = fields.description ?? doc.description
  db.prepare('UPDATE documents SET label = ?, description = ? WHERE id = ?').run(label, description, id)
  return getDocumentById(id)
}

export function getDocumentsByClaimId(claimId: number): Document[] {
  const rows = db
    .prepare('SELECT * FROM documents WHERE claim_id = ? ORDER BY uploaded_at DESC')
    .all(claimId) as RawDocument[]
  return rows.map(mapDocument)
}

export function getDocumentById(id: string): Document | null {
  const row = db
    .prepare('SELECT * FROM documents WHERE id = ?')
    .get(id) as RawDocument | undefined
  return row ? mapDocument(row) : null
}

export function deleteDocument(id: string): { deleted: boolean } {
  const doc = getDocumentById(id)
  if (!doc) return { deleted: false }

  try {
    getStorageAdapter().delete(doc.storageKey)
  } catch (err) {
    console.error(`[audit] storage delete failed for document ${id} (key: ${doc.storageKey}):`, err)
    return { deleted: false }
  }

  const result = db.prepare('DELETE FROM documents WHERE id = ?').run(id)
  logAudit('DELETE', 'document', id, { filename: doc.filename, claimId: doc.claimId })
  return { deleted: result.changes > 0 }
}

export async function getDocumentServeUrl(id: string): Promise<string> {
  const doc = getDocumentById(id)
  if (!doc) return `/api/documents/${id}/blob`

  if (doc.storageAdapter === 's3') {
    return getStorageAdapter().getServeUrl(doc.storageKey)
  }

  return `/api/documents/${id}/blob`
}

export function addDocumentComment(
  input: z.infer<typeof addDocumentCommentSchema>,
): DocumentComment {
  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO document_comments (id, document_id, text, created_at) VALUES (?, ?, ?, datetime(\'now\'))',
  ).run(id, input.documentId, input.text)
  const row = db
    .prepare('SELECT * FROM document_comments WHERE id = ?')
    .get(id) as RawDocumentComment
  return mapDocumentComment(row)
}

export function getDocumentComments(documentId: string): DocumentComment[] {
  const rows = db
    .prepare('SELECT * FROM document_comments WHERE document_id = ? ORDER BY created_at ASC')
    .all(documentId) as RawDocumentComment[]
  return rows.map(mapDocumentComment)
}

export function deleteDocumentComment(id: string): { deleted: boolean } {
  const result = db.prepare('DELETE FROM document_comments WHERE id = ?').run(id)
  return { deleted: result.changes > 0 }
}

export function addClaimComment(
  input: z.infer<typeof addClaimCommentSchema>,
): ClaimComment {
  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO claim_comments (id, claim_id, text, created_at) VALUES (?, ?, ?, datetime(\'now\'))',
  ).run(id, input.claimId, input.text)
  const row = db
    .prepare('SELECT * FROM claim_comments WHERE id = ?')
    .get(id) as RawClaimComment
  return mapClaimComment(row)
}

export function getClaimComments(claimId: number): ClaimComment[] {
  const rows = db
    .prepare('SELECT * FROM claim_comments WHERE claim_id = ? ORDER BY created_at ASC')
    .all(claimId) as RawClaimComment[]
  return rows.map(mapClaimComment)
}

export function deleteClaimComment(id: string): { deleted: boolean } {
  const result = db.prepare('DELETE FROM claim_comments WHERE id = ?').run(id)
  return { deleted: result.changes > 0 }
}
