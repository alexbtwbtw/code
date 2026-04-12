<!-- Source: docs/AWS_DEPLOYMENT_PLAN.md — Section 12: Rollout Order -->

# AWS Deployment — Rollout Order

## 12. Rollout Order

**Step 1 — Code change: SQLite path (local, 10 minutes)**
Add `process.env.DB_PATH ?? ':memory:'` to `backend/src/db.ts`. Run `npm run dev` locally and verify nothing breaks. Commit.

**Step 2 — S3 file storage (local/dev S3 bucket)**
Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`. Write `backend/src/lib/s3.ts`. Modify `team.ts` CV upload flow to use presigned URLs. Modify `generateCv.ts` to upload to S3. Test with a real dev S3 bucket or LocalStack.

**Step 3 — Terraform bootstrap**
Create S3 state bucket and DynamoDB lock table manually:
```bash
aws s3 mb s3://coba-terraform-state --region eu-west-1
aws dynamodb create-table --table-name coba-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1
```

**Step 4 — Apply networking + compute**
`terraform init && terraform apply -target=module.networking -target=module.compute`

SSH into the EC2 instance. Verify Node.js is installed. Mount the EBS volume. Manually run the backend once to verify it starts (`pm2 start`).

**Step 5 — Apply storage**
`terraform apply -target=module.storage`

Upload a test file to S3 from the EC2 instance. Verify the IAM role has access.

**Step 6 — Apply CDN**
`terraform apply -target=module.cdn`

Build the frontend locally. Upload to S3. Verify the CloudFront URL loads the SPA and tRPC calls reach the backend.

**Step 7 — Custom domain + ACM**
Request ACM cert, DNS validate, attach to CloudFront. Update Route 53 A record.

**Step 8 — GitHub Actions pipeline**
Add `deploy.yml`. Configure OIDC trust. Set repository variables. Push to main. Watch the deploy run end-to-end.

**Step 9 — POC hardening (optional)**
- Enable CloudWatch Logs agent on EC2 to ship pm2 logs to `/coba/backend` log group
- Add a CloudWatch alarm on the `/api/health` endpoint via a Route 53 health check
- Set up daily EBS snapshots via AWS Backup
