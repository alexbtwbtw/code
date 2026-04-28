import { randomUUID } from 'crypto'
import { mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { IStorageAdapter } from './IStorageAdapter'

function getStorageDir(): string {
  return process.env.FS_STORAGE_DIR?.replace('~', homedir())
    ?? join(homedir(), 'Documents', 'Dinaxis', 'documents')
}

export class FilesystemAdapter implements IStorageAdapter {
  async save(filename: string, data: Buffer, _mimeType: string): Promise<string> {
    const dir = getStorageDir()
    mkdirSync(dir, { recursive: true })
    const key = `${randomUUID()}-${filename}`
    writeFileSync(join(dir, key), data)
    return key
  }

  async get(key: string): Promise<Buffer> {
    return readFileSync(join(getStorageDir(), key))
  }

  async getServeUrl(key: string): Promise<string> {
    // The backend /api/documents/:id/blob endpoint serves the file
    return `/api/documents/blob/${key}`
  }

  async delete(key: string): Promise<void> {
    unlinkSync(join(getStorageDir(), key))
  }
}
