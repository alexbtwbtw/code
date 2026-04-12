# AWS Deployment Plan — COBA Internal Portal

## Codebase Summary (What We Are Deploying)

Before diving into the plan, here is what the codebase actually does that influences every infrastructure decision:

- **Backend:** Hono on Node.js ≥25, served via `@hono/node-server`. All API is tRPC. One HTTP server on port 3000. In production (`SERVE_STATIC=true`) it also serves the compiled React SPA from the same process.
- **Database:** `better-sqlite3` in-memory — **all data is lost on restart.** Migrations to a persistent store are mandatory.
- **File storage:** CV PDF blobs are stored in the `member_cvs` table as base64 text (`file_data TEXT`). This must move to S3.
- **AI features:** Four Claude Sonnet 4.6 integrations — CV parse, requirements parse, member suggest, project parse — all via `@anthropic-ai/sdk`. Controlled by `USE_REAL_AI=true` and `ANTHROPIC_API_KEY`. These make outbound HTTPS calls to `api.anthropic.com`.
- **pdfkit:** Generates PDF CVs in-process and returns a `Buffer`. Currently returned to the client (not stored). Must decide whether to stream to S3 or return directly.
- **mammoth:** Converts uploaded `.docx` to text in-process. No storage needed.
- **Frontend:** Vite + React SPA. All API calls proxy to `/trpc` and `/api`. The `@backend` alias resolves to `backend/src` at build time for type safety — the backend URL must be baked into the Vite build.
- **17 tables:** Pure relational, heavy use of prepared statements with named `@param` binding (SQLite-specific syntax), transactions, and `db.prepare(...).all/get/run` pattern.

---

## 1. High-Level Architecture Summary

```
                     ┌─────────────────────────────────────────────────────────────┐
                     │  AWS Account: coba-prod                                     │
                     │                                                             │
  Browser            │  CloudFront Distribution                                   │
  ──────  ─HTTPS──►  │  ├─ /api/*  → ALB → ECS Fargate (Hono backend)            │
                     │  ├─ /trpc/* → ALB → ECS Fargate (Hono backend)            │
                     │  └─ /*      → S3 Origin (frontend SPA static assets)       │
                     │                                                             │
                     │  ECS Fargate (private subnet)                              │
                     │  ├─ Reads secrets from Secrets Manager at startup          │
                     │  ├─ Connects to RDS PostgreSQL (private subnet)            │
                     │  ├─ Reads/writes CV files to S3 via VPC endpoint           │
                     │  └─ Outbound to api.anthropic.com via NAT Gateway          │
                     │                                                             │
                     │  RDS PostgreSQL db.t4g.micro (private subnet)              │
                     │  S3 bucket: coba-files (CV PDFs, generated CVs)            │
                     │  S3 bucket: coba-frontend (Vite build output)              │
                     │  Secrets Manager: ANTHROPIC_API_KEY, DB credentials        │
                     └─────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

1. CloudFront sits in front of everything. The ALB is not internet-facing in the DNS sense — CloudFront is the only public entry point.
2. ECS does NOT serve the frontend. The frontend SPA goes to S3/CloudFront. The backend runs API-only (`SERVE_STATIC` stays `false`).
3. The ECS task is in a private subnet. It reaches S3 via a VPC Gateway endpoint (free), and reaches Anthropic's API via a NAT Gateway.

---

## 2. Database

### Choice: RDS PostgreSQL 17 on db.t4g.micro

Reject Aurora Serverless v2 — minimum 0.5 ACUs (~$43/month) even at idle. A single `db.t4g.micro` PostgreSQL instance ($15–18/month) is the right call for an internal tool.

### Schema Translation: SQLite → PostgreSQL

| SQLite pattern | PostgreSQL equivalent |
|---|---|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGSERIAL PRIMARY KEY` |
| `datetime('now')` default | `NOW()` |
| `TEXT NOT NULL DEFAULT ''` | unchanged |
| `REAL` for lat/lng/budget | `DOUBLE PRECISION` or `NUMERIC(12,6)` |
| `INTEGER` for booleans | `BOOLEAN` or keep as `INTEGER` |

The `member_cvs.file_data TEXT` column stores base64-encoded PDF blobs — **deleted entirely**, replaced by `s3_key TEXT`.

### Code Migration: `better-sqlite3` → `pg`

Every file under `backend/src/` that calls `db.prepare(...)` must change:

- `backend/src/db/client.ts` — replace `new Database(':memory:')` with a `pg.Pool`
- `backend/src/db/schema.ts` — run DDL via `pool.query(sql)` once at startup
- All `db.prepare(...)` calls use SQLite's `@param` named binding → PostgreSQL uses `$1, $2, ...` positional parameters
- All `db.transaction(fn)` blocks → `BEGIN` / `COMMIT` / `ROLLBACK`

**Recommendation:** Do not use Drizzle or Prisma. Keep raw SQL, install `pg` and `@types/pg`, create a thin wrapper:

```typescript
// db/client.ts (new)
import { Pool } from 'pg'
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
export const query = (text: string, values?: unknown[]) => pool.query(text, values)
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> { ... }
```

All service functions become `async`. Convert named `@param` to positional `$1` params table by table.

---

## 3. File Storage (CV PDFs and Generated Files)

### Schema Change: `member_cvs` table

Remove `file_data TEXT`. Add `s3_key TEXT NOT NULL DEFAULT ''`.

```sql
CREATE TABLE member_cvs (
  id             BIGSERIAL PRIMARY KEY,
  team_member_id BIGINT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  filename       TEXT NOT NULL DEFAULT '',
  file_size      INTEGER NOT NULL DEFAULT 0,
  s3_key         TEXT NOT NULL DEFAULT '',    -- e.g. "cvs/42/original/2024-01-15_cv.pdf"
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### S3 Key Convention

```
coba-files/
  cvs/{team_member_id}/original/{timestamp}_{filename}   ← uploaded CVs
  cvs/{team_member_id}/generated/{timestamp}_cv.pdf      ← pdfkit output
```

### Upload Flow (Uploaded CVs)

1. Frontend calls `team.getUploadUrl({ teamMemberId, filename, contentType })`.
2. Backend generates a presigned S3 `PutObject` URL (15-minute TTL) and returns it with the computed `s3Key`.
3. Frontend PUTs the file directly to S3.
4. Frontend calls `team.attachCv({ teamMemberId, filename, fileSize, s3Key })` to record metadata.

### Generated CVs

The `generateCv` router returns a pdfkit `Buffer`. Change to: upload to S3, return a presigned `GetObject` URL (15-minute TTL) for the frontend to trigger download.

### Two Buckets

- `coba-files` — CV uploads and generated PDFs. Private. ECS task role access only.
- `coba-frontend` — Vite build output. Private. CloudFront OAC access only.

---

## 4. Backend Hosting (ECS Fargate)

### Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY backend/package.json ./

RUN addgroup -S coba && adduser -S coba -G coba
USER coba

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Note: Node 22 LTS is used (no official Alpine image for Node 25). Works without issues for this codebase.

### ECS Task Definition

- **CPU:** 0.5 vCPU (512 units)
- **Memory:** 1 GB — pdfkit and Claude SDK responses can be large
- **Secrets (from Secrets Manager):** `DATABASE_URL`, `ANTHROPIC_API_KEY`
- **Plain env vars:** `PORT=3000`, `NODE_ENV=production`, `USE_REAL_AI=true`, `SERVE_STATIC=false`, `AWS_REGION=eu-west-1`, `S3_FILES_BUCKET=coba-files`

### ALB + Health Check

- Internet-facing ALB in public subnets, security group allows HTTPS only from CloudFront managed prefix list
- Target group: HTTP/3000, health check `GET /api/health`
- Auto-scaling: target tracking on 70% CPU, min 1 task, max 3 tasks

---

## 5. Frontend Hosting (S3 + CloudFront)

### CloudFront Behavior Rules

| Path pattern | Origin | Cache |
|---|---|---|
| `/api/*` | ALB | No cache (TTL=0) |
| `/trpc/*` | ALB | No cache (TTL=0) |
| `/_assets/*` | S3 | 1 year (content-hashed filenames) |
| `/*` | S3 | 5 minutes (index.html) |

**SPA routing:** CloudFront custom error: HTTP 403/404 from S3 → serve `/index.html` with HTTP 200.

**API URL:** tRPC client uses relative URL (`/trpc`). CloudFront routes to ALB. No env var needed.

---

## 6. Networking

### VPC Layout

- **CIDR:** `10.0.0.0/16`, **Region:** `eu-west-1`
- **AZs:** `eu-west-1a` and `eu-west-1b`

```
VPC 10.0.0.0/16
├── Public subnets (ALB, NAT Gateway)
│   ├── 10.0.0.0/24   eu-west-1a
│   └── 10.0.1.0/24   eu-west-1b
├── Private subnets (ECS tasks, RDS)
│   ├── 10.0.2.0/24   eu-west-1a
│   └── 10.0.3.0/24   eu-west-1b
└── Internet Gateway → public subnets
    NAT Gateway (one, in eu-west-1a) → private subnets
```

### Security Groups

**sg-alb:** Inbound HTTPS/443 from CloudFront prefix list → Outbound HTTP/3000 to sg-ecs

**sg-ecs:** Inbound HTTP/3000 from sg-alb → Outbound PostgreSQL/5432 to sg-rds, HTTPS/443 to 0.0.0.0/0 (Anthropic API via NAT)

**sg-rds:** Inbound PostgreSQL/5432 from sg-ecs only

### VPC Endpoints

1. **S3 Gateway Endpoint** — free, routes S3 traffic without hitting NAT
2. **Secrets Manager Interface Endpoint** — optional (~$7/month), avoids NAT for secret fetching

---

## 7. Secrets & Configuration

### Secrets Manager

| Secret name | Contents |
|---|---|
| `coba/prod/anthropic-key` | `{"api_key": "sk-ant-..."}` |
| `coba/prod/db-url` | `postgresql://coba:PASSWORD@rds-endpoint:5432/coba` |

ECS injects these as environment variables at container startup via the `secrets` array in the task definition.

---

## 8. Terraform Structure

```
terraform/
  modules/
    networking/    ← VPC, subnets, SGs, NAT, VPC endpoints
    database/      ← RDS, subnet group, parameter group, secrets
    storage/       ← S3 buckets (files + frontend), CORS, lifecycle
    compute/       ← ECR, ECS cluster, task def, service, ALB, auto-scaling
    cdn/           ← CloudFront, ACM cert (us-east-1), Route 53
    iam/           ← ECS task role, execution role, policies
  environments/
    prod/
      main.tf      ← instantiates all modules
      variables.tf
      outputs.tf
      backend.tf   ← S3 backend + DynamoDB lock table
```

### Terraform State Backend

Use S3 + DynamoDB (not Terraform Cloud). Create the state bucket and DynamoDB lock table manually before `terraform init`.

```hcl
terraform {
  backend "s3" {
    bucket         = "coba-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "coba-terraform-locks"
  }
}
```

---

## 9. GitHub Actions Deployment Pipeline

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::ACCOUNT_ID:role/GitHubActionsDeployRole
          aws-region: eu-west-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push backend image
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/coba-backend:$IMAGE_TAG -f Dockerfile .
          docker push $ECR_REGISTRY/coba-backend:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/coba-backend:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with: { terraform_version: "1.9.x" }

      - name: Terraform init + apply
        working-directory: terraform/environments/prod
        env:
          TF_VAR_backend_image: ${{ steps.build-image.outputs.image }}
        run: |
          terraform init
          terraform apply -auto-approve

      - name: Force new ECS deployment
        run: |
          aws ecs update-service --cluster coba-prod --service coba-backend --force-new-deployment
          aws ecs wait services-stable --cluster coba-prod --services coba-backend

      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }

      - name: Install and build frontend
        run: |
          npm ci --prefix frontend
          npm run build --prefix frontend

      - name: Sync frontend to S3
        run: |
          aws s3 sync frontend/dist/ s3://coba-frontend-prod/ \
            --delete \
            --cache-control "public,max-age=31536000,immutable" \
            --exclude "index.html"
          aws s3 cp frontend/dist/index.html s3://coba-frontend-prod/index.html \
            --cache-control "no-cache,no-store,must-revalidate"

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/index.html"
```

**Use OIDC instead of long-lived AWS access keys.** Create an IAM OIDC identity provider for `token.actions.githubusercontent.com` with a trust policy restricted to your repo and `main` branch.

---

## 10. Cost Estimate (Monthly, eu-west-1, Low Traffic)

| Service | Spec | Monthly (USD) |
|---|---|---|
| ECS Fargate | 1 task × 0.5 vCPU / 1 GB | ~$15 |
| RDS PostgreSQL | db.t4g.micro, 20 GB gp3, single-AZ | ~$15 |
| ALB | 1 ALB, ~1 LCU | ~$18 |
| CloudFront | 1 GB/month data transfer | ~$1 |
| S3 (files + frontend) | <5 GB storage | ~$1 |
| NAT Gateway | 1 NAT × 730h + ~1 GB data | ~$35 |
| Secrets Manager | 2 secrets | ~$1 |
| CloudWatch Logs | <1 GB/month | ~$1 |
| Route 53 | 1 hosted zone | ~$1 |
| **Total** | | **~$88/month** |

**NAT Gateway at ~$35/month is the biggest cost item.** Add an ECR VPC Interface Endpoint (~$7/month) to keep image pulls off NAT.

---

## 11. Recommended Rollout Order

**Step 1 — PostgreSQL migration (local)**
Translate SQLite schema to PostgreSQL DDL. Swap `better-sqlite3` for `pg`. Test against `docker run -p 5432:5432 postgres:17`.

**Step 2 — S3 file storage (local)**
Replace `file_data` blob with S3 presigned URLs. Test with LocalStack or a dev S3 bucket.

**Step 3 — Terraform bootstrap**
Create S3 state bucket and DynamoDB lock table manually. Apply `modules/networking`.

**Step 4 — Database in AWS**
Apply `modules/database` and `modules/iam`. Connect via SSM Session Manager port forwarding. Run schema migration SQL.

**Step 5 — ECR + first Docker build**
Write Dockerfile, push test image to ECR, verify it runs against RDS.

**Step 6 — ECS + ALB**
Apply `modules/compute`. ECS service starts, health check passes at ALB DNS.

**Step 7 — S3 + CloudFront for frontend**
Apply `modules/storage` and `modules/cdn`. Sync Vite build to S3. Verify SPA loads, tRPC calls reach backend.

**Step 8 — Custom domain + ACM**
Request ACM cert, DNS validate, attach to ALB and CloudFront, update Route 53.

**Step 9 — GitHub Actions pipeline**
Write `deploy.yml`. Set up OIDC trust. Full end-to-end deploy from `git push main`.

**Step 10 — Production hardening**
- RDS automated backups (7-day retention)
- CloudTrail for API auditing
- CloudWatch alarms on ECS CPU, RDS FreeStorageSpace, ALB 5xx rate
- S3 access logging on `coba-files`
- Confirm `deletion_protection = true` on RDS

---

## Critical Files for Implementation

| File | Change needed |
|---|---|
| `backend/src/db/client.ts` | Swap `better-sqlite3` for `pg.Pool` |
| `backend/src/db/schema.ts` | Translate SQLite DDL → PostgreSQL |
| `backend/src/router/team.ts` | Most complex — inline `db.prepare()`, transactions, `file_data` blob |
| `backend/src/index.ts` | Set `SERVE_STATIC=false` in production |
| `backend/src/lib/generateCv.ts` | Upload pdfkit Buffer to S3, return presigned URL |
