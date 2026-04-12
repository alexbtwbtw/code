<!-- Source: docs/AWS_DEPLOYMENT_PLAN.md — Section 3: File Storage (CV PDFs and Generated Files) -->

# AWS Deployment — Storage: CV PDFs and Generated Files

## 3. File Storage (CV PDFs and Generated Files)

This section is identical to the original plan. S3 is permanently free within limits and works the same regardless of whether the backend runs on Fargate or EC2.

### Schema Change: `member_cvs` table

Remove `file_data TEXT`. Add `s3_key TEXT NOT NULL DEFAULT ''`.

```sql
-- Run once at startup or as a migration:
ALTER TABLE member_cvs ADD COLUMN s3_key TEXT NOT NULL DEFAULT '';
-- Then drop file_data after migration (SQLite requires recreating the table):
-- CREATE TABLE member_cvs_new (...); INSERT INTO ... SELECT ...; DROP TABLE member_cvs; ALTER TABLE member_cvs_new RENAME TO member_cvs;
```

### S3 Key Convention

```
coba-files/
  cvs/{team_member_id}/original/{timestamp}_{filename}   ← uploaded CVs
  cvs/{team_member_id}/generated/{timestamp}_cv.pdf      ← pdfkit output
  backups/coba-{date}.db                                  ← optional DB snapshots
```

### Upload Flow (Uploaded CVs)

1. Frontend calls `team.getUploadUrl({ teamMemberId, filename, contentType })`.
2. Backend generates a presigned S3 `PutObject` URL (15-minute TTL) and returns it with the computed `s3Key`.
3. Frontend PUTs the file directly to S3 (no backend proxy needed, avoids t2.micro memory pressure).
4. Frontend calls `team.attachCv({ teamMemberId, filename, fileSize, s3Key })` to record metadata.

### Generated CVs

The `generateCv` function produces a pdfkit `Buffer`. Change to: upload the Buffer to S3, return a presigned `GetObject` URL (15-minute TTL) for the frontend to trigger a download.

### Two S3 Buckets

- `coba-files` — CV uploads, generated PDFs, optional DB backups. Private. EC2 instance role access only.
- `coba-frontend` — Vite build output. Private. CloudFront OAC access only.
