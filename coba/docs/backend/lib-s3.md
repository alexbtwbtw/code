# lib/s3.ts

**Path:** `backend/src/lib/s3.ts`
**Layer:** Backend
**Purpose:** AWS S3 helper functions for the AWS deployment path — presigned upload/download URLs, direct buffer uploads, and object deletion.

## Overview

This file wraps the AWS SDK v3 S3 client and provides four simple async helpers used when the app is deployed to AWS (EC2 + S3 for CV storage, as described in `docs/aws/`). In the local development mode, `s3Enabled()` returns false and this module is not called.

The S3 client is initialised at module load with `AWS_REGION` (defaults to `eu-west-2`) and `S3_FILES_BUCKET` from environment variables. The bucket name is empty by default, so calling any operation without setting `S3_FILES_BUCKET` will fail at the AWS SDK level.

## Key Exports

| Export | Type | Description |
|--------|------|-------------|
| `s3Enabled` | `() => boolean` | Returns true when `S3_FILES_BUCKET` env var is set |
| `getPresignedUploadUrl` | async function | Returns a 15-minute presigned PUT URL for a given S3 key and content type |
| `getPresignedDownloadUrl` | async function | Returns a 15-minute presigned GET URL for a given S3 key |
| `uploadBuffer` | async function | Directly uploads a `Buffer` to S3 with a given key and content type |
| `deleteObject` | async function | Deletes an S3 object by key |

## Dependencies

- `@aws-sdk/client-s3` — S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand
- `@aws-sdk/s3-request-presigner` — `getSignedUrl`

## Notes

- This module is only active in the AWS deployment; local dev uses base64-encoded file data stored directly in the SQLite `member_cvs.file_data` TEXT column.
- Presigned URLs expire after 900 seconds (15 minutes).
- For the full AWS storage architecture, see `docs/aws/storage.md`.
