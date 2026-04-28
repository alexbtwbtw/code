import type { IStorageAdapter } from './IStorageAdapter'
import { BlobAdapter } from './BlobAdapter'
import { S3Adapter } from './S3Adapter'
import { FilesystemAdapter } from './FilesystemAdapter'

let _adapter: IStorageAdapter | null = null

export function getStorageAdapter(): IStorageAdapter {
  if (_adapter) return _adapter
  const type = process.env.STORAGE ?? 'blob'
  switch (type) {
    case 's3':         _adapter = new S3Adapter(); break
    case 'filesystem': _adapter = new FilesystemAdapter(); break
    default:           _adapter = new BlobAdapter(); break
  }
  return _adapter
}
