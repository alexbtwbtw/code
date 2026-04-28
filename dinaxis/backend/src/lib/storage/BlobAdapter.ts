import { randomUUID } from 'crypto'
import { db } from '../../db/client'
import type { IStorageAdapter } from './IStorageAdapter'

export class BlobAdapter implements IStorageAdapter {
  async save(_filename: string, data: Buffer, _mimeType: string): Promise<string> {
    const key = randomUUID()
    db.prepare('INSERT INTO document_blobs (id, data) VALUES (?, ?)').run(key, data.toString('base64'))
    return key
  }

  async get(key: string): Promise<Buffer> {
    const row = db.prepare('SELECT data FROM document_blobs WHERE id = ?').get(key) as { data: string } | undefined
    if (!row) throw new Error(`Blob not found: ${key}`)
    return Buffer.from(row.data, 'base64')
  }

  async getServeUrl(key: string): Promise<string> {
    // For blob adapter, the caller should use the /api/documents/:id/blob endpoint
    return `/api/documents/blob/${key}`
  }

  async delete(key: string): Promise<void> {
    db.prepare('DELETE FROM document_blobs WHERE id = ?').run(key)
  }
}
