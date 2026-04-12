<!-- Source: docs/AWS_DEPLOYMENT_PLAN.md — Section 10: What Changes in the Codebase -->

# AWS Deployment — Codebase Changes

## 10. What Changes in the Codebase

### Required Changes

| File | Change | Effort |
|---|---|---|
| `backend/src/db.ts` | Make SQLite path configurable via `DB_PATH` env var (1 line) | Trivial |
| `backend/src/router/team.ts` | Remove `file_data` base64 blob; add S3 presigned URL upload for CV files | Medium |
| `backend/src/lib/generateCv.ts` | Upload pdfkit Buffer to S3; return presigned `GetObject` URL | Small |
| `backend/src/lib/parseCv.ts` | Read CV content from S3 by `s3_key` instead of from DB blob | Small |

### `backend/src/db.ts` — SQLite Path (the only infrastructure-forced change)

```typescript
// Find the line: const db = new Database(':memory:')
// Replace with:
const dbPath = process.env.DB_PATH ?? ':memory:'
const db = new Database(dbPath)
```

When `DB_PATH` is not set (local dev), behavior is identical to today — in-memory, resets on restart. When `DB_PATH=/data/coba.db` (EC2), data persists.

### S3 Integration for CV Files

Install the AWS SDK v3 S3 client:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --prefix backend
```

Create `backend/src/lib/s3.ts`:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' })
const BUCKET = process.env.S3_FILES_BUCKET ?? ''

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(s3, new PutObjectCommand({
    Bucket: BUCKET, Key: key, ContentType: contentType
  }), { expiresIn: 900 })
}

export async function getPresignedDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: BUCKET, Key: key
  }), { expiresIn: 900 })
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType
  }))
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
```

### No Other Backend Changes

- All tRPC routers remain synchronous (SQLite stays sync)
- No `pg` dependency, no query rewrites, no transaction rewrites
- No schema migration to PostgreSQL
- Seed data continues to work identically in local dev (in-memory) and on EC2 (file-based)
