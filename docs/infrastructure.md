# AWS Infrastructure

## Overview

The production environment runs on a single `t3.micro` EC2 instance (Amazon Linux 2023) with nginx as a reverse proxy, backed by CloudFront and S3 for frontend delivery. Three applications are hosted under a single CloudFront distribution: **home** (a static landing page at `/`), **coba** (the project management app at `/coba/`), and **game** (at `/game/`). All three frontends are built as static SPAs and served from a private S3 bucket via CloudFront. API and tRPC traffic is routed by CloudFront directly to the EC2 instance, where nginx forwards requests to two long-running Node.js processes managed by pm2: the COBA backend on port 3000 and the game backend on port 3001. The S3 bucket holding the frontend assets is never exposed to the public internet; CloudFront accesses it using Origin Access Control (OAC) with SigV4 signing.

---

## DNS & CDN (CloudFront)

The distribution (`coba-poc-cdn`) has two origins:

| Origin ID      | Target                              | Protocol       |
|----------------|-------------------------------------|----------------|
| `s3-frontend`  | Private S3 bucket (regional domain) | OAC / SigV4    |
| `ec2-backend`  | EC2 Elastic IP, port 80             | HTTP only       |

### URL routing rules

CloudFront evaluates ordered cache behaviours top-to-bottom; the first match wins.

| Path pattern    | Origin        | Cache policy         |
|-----------------|---------------|----------------------|
| `/api/*`        | EC2           | CachingDisabled      |
| `/trpc/*`       | EC2           | CachingDisabled      |
| `/game/api/*`   | EC2           | CachingDisabled      |
| `/game/trpc/*`  | EC2           | CachingDisabled      |
| `/*` (default)  | S3            | CachingOptimized     |

All HTTP requests are redirected to HTTPS. The `AllViewerExceptHostHeader` origin-request policy is applied to EC2 routes so that headers like `X-Real-IP` are forwarded.

### SPA router CloudFront Function

A lightweight CloudFront Function (`coba-poc-spa-router`, runtime `cloudfront-js-2.0`) runs on every viewer request before the cache is consulted. It rewrites extensionless paths to the corresponding `index.html` so that client-side routing works:

- `/coba`, `/coba/`, and any `/coba/<route>` with no file extension → `/coba/index.html`
- `/game`, `/game/`, and any `/game/<route>` with no file extension → `/game/index.html`

Paths that already contain a file extension (`.js`, `.css`, `.png`, etc.) pass through unchanged, so hashed asset filenames are resolved normally.

### Cache policies

- **Static assets** (`/coba/assets/*`, `/game/assets/*`, etc.): `CachingOptimized` — served with `Cache-Control: public, max-age=31536000, immutable` set during S3 sync. CloudFront caches these aggressively and compresses them (gzip/brotli).
- **API / tRPC routes**: `CachingDisabled` — every request reaches EC2. Full HTTP method support (DELETE, PATCH, POST, PUT) is allowed.

### default_root_object and SPA fallback

`default_root_object = "index.html"` handles bare requests to the CloudFront domain (i.e., the home app). For the `/coba/` and `/game/` paths the SPA router function handles rewriting before it reaches S3.

Two `custom_error_response` rules act as a secondary fallback: any 403 or 404 returned by S3 (for example a key that does not exist) is served as a 200 with `/coba/index.html`. This is intentionally lenient for the POC environment; a strict setup would handle each SPA separately.

---

## Frontend Hosting (S3)

Two S3 buckets exist:

| Bucket              | Purpose                                        |
|---------------------|------------------------------------------------|
| `coba-poc-frontend` | Static frontend assets served via CloudFront   |
| `coba-poc-files`    | Application file uploads (CVs, documents)       |

### Bucket structure (frontend bucket)

```
/               ← home app (index.html + assets/)
/coba/          ← COBA app (index.html + assets/)
/game/          ← game app (index.html + assets/)
```

Each app's Vite build is synced to its prefix with two separate `aws s3 sync` calls per app:

1. `<app>/dist/assets/` synced with `Cache-Control: public,max-age=31536000,immutable` — content-hashed filenames mean these can be cached forever.
2. `<app>/dist/` (excluding `assets/`) synced with `Cache-Control: no-cache,no-store,must-revalidate` — this covers `index.html` and any other root-level files that change on every deploy.

### Origin Access Control (OAC)

The frontend bucket has all public access blocked. CloudFront is granted `s3:GetObject` on the bucket via a bucket policy that restricts the `AWS:SourceArn` condition to the specific CloudFront distribution ARN. The OAC resource (`coba-poc-frontend-oac`) configures SigV4 signing so all CloudFront-to-S3 requests are authenticated without exposing the bucket publicly.

The files bucket (for application uploads) is also fully private. The EC2 instance accesses it directly via its IAM role, and the browser accesses it through presigned URLs generated by the COBA backend.

A Gateway VPC Endpoint for S3 is provisioned so that EC2-to-S3 traffic stays on the AWS private backbone at no extra cost.

---

## Backend (EC2)

**Instance:** `t3.micro`, Amazon Linux 2023, in a single public subnet with an Elastic IP. Port 22 (SSH) is not open in the security group; the only inbound rule allows port 80 from the CloudFront managed prefix list. All outbound traffic on port 443 is allowed (for SSM agent, S3, npm installs, and Anthropic API calls).

A separate 30 GB encrypted `gp3` EBS volume is attached at `/dev/xvdf` and mounted at `/data`. This volume persists across instance reboots and holds the SQLite database files (`/data/coba.db`, `/data/game.db`).

### Node.js processes (pm2)

Two processes are managed by pm2:

| pm2 name        | Working directory | Port | Log directory    | Memory limit |
|-----------------|-------------------|------|------------------|--------------|
| `coba-backend`  | `/app`            | 3000 | `/var/log/coba`  | 800 MB       |
| `game-backend`  | `/app-game`       | 3001 | `/var/log/game`  | 400 MB       |

Each process is defined in its own `ecosystem.config.cjs` (at `coba/backend/` and `game/backend/` in the repo). The `NODE_ENV`, `PORT`, `DB_PATH`, and `AWS_REGION` environment variables are set there. The `ANTHROPIC_API_KEY` and `S3_FILES_BUCKET` variables for the COBA backend are written to `/app/.env` at deploy time (see Secrets section below) and picked up by pm2 via `--update-env`.

pm2 is configured to restart automatically on reboot (`pm2 save` is called after every deploy, and pm2 startup is configured as part of the initial instance setup).

### nginx reverse proxy

nginx listens on port 80 and routes by path prefix. The configuration is written to `/etc/nginx/conf.d/apps.conf`:

| nginx location  | Proxied to                       |
|-----------------|----------------------------------|
| `/api/`         | `http://127.0.0.1:3000`          |
| `/trpc/`        | `http://127.0.0.1:3000`          |
| `/game/api/`    | `http://127.0.0.1:3001/api/`     |
| `/game/trpc/`   | `http://127.0.0.1:3001/trpc/`    |

Note that `/game/api/` is stripped of the `/game` prefix before forwarding: nginx rewrites `proxy_pass http://127.0.0.1:3001/api/` so the game backend receives requests at `/api/` rather than `/game/api/`. The default nginx server block is commented out to prevent conflicts.

`client_max_body_size` is set to 10 MB to accommodate PDF CV uploads.

---

## Secrets & Parameters (SSM Parameter Store)

All secrets and environment-specific configuration are stored under the `/coba/poc/` namespace in SSM Parameter Store:

| Parameter name              | Type           | Value                          |
|-----------------------------|----------------|--------------------------------|
| `/coba/poc/anthropic-key`   | SecureString   | Anthropic API key              |
| `/coba/poc/db-path`         | String         | `/data/coba.db`                |
| `/coba/poc/s3-files-bucket` | String         | Files S3 bucket name           |

The EC2 IAM role is granted `ssm:GetParameter` and `ssm:GetParameters` for `arn:aws:ssm:<region>:<account>:parameter/coba/poc/*`.

During the COBA backend deploy (run as a shell script on EC2 via SSM), the deploy script fetches these three parameters with `aws ssm get-parameter`, then writes them to `/app/.env` before calling `pm2 reload --update-env`. This means the process always starts with fresh secrets on every deploy, and the `.env` file is never stored in the repository or in the artifact.

The game backend currently has no secrets beyond what is embedded in `ecosystem.config.cjs`; it reads the S3 bucket name from SSM only to locate the artifact during deployment.

---

## CI/CD Pipeline

**Trigger:** any push to the `main` branch.

**Authentication:** GitHub Actions authenticates to AWS using OIDC (no stored AWS credentials). The workflow requests a short-lived token by assuming the `GitHubActionsDeployRole` IAM role, which is scoped to the `poc` GitHub environment. The role has permissions to: write to the frontend S3 bucket, write to the `deployments/` prefix of the files bucket, send SSM commands to the specific EC2 instance, and create CloudFront invalidations.

**Required GitHub environment variables** (set on the `poc` environment):
`AWS_ACCOUNT_ID`, `EC2_INSTANCE_ID`, `FILES_BUCKET_NAME`, `FRONTEND_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_DEPLOY_ROLE_ARN`.

### Steps in order

1. **nginx sync** — `scripts/update-nginx.sh` is uploaded to S3, then fetched and executed on EC2 via SSM `AWS-RunShellScript`. The sha256 hash of the script is verified on EC2 before execution to prevent tampering in transit.

2. **COBA backend deploy** — The COBA backend is built (`npm ci && npm run build`), zipped into `coba-backend-artifact.zip` (contains `dist/`, `package.json`, `package-lock.json`, `ecosystem.config.cjs`), and uploaded to `s3://<files-bucket>/deployments/`. A deploy shell script is generated, also uploaded to S3, and then executed on EC2 via SSM. On EC2 the deploy script: fetches the three SSM parameters, downloads the artifact, extracts it to `/app`, runs `npm ci --omit=dev`, writes `/app/.env`, and calls `pm2 reload --update-env` (or `pm2 start` on first run). A health check against `http://localhost/api/health` confirms the stack is live before the step completes.

3. **Game backend deploy** — Same pattern as COBA. Artifact extracted to `/app-game`, process managed under `game-backend`. Health check hits `http://localhost/game/api/health`.

4. **COBA frontend build + sync** — `npm ci && npm run build` in `coba/frontend`, then two `aws s3 sync` calls: assets with immutable cache headers, everything else with no-cache.

5. **Game frontend build + sync** — Same pattern, synced to the `game/` prefix of the frontend bucket.

6. **Home frontend build + sync** — Same pattern, synced to the bucket root (`/`).

7. **CloudFront invalidation** — Invalidates `/index.html`, `/coba/index.html`, `/coba/*`, `/game/index.html`, `/game/*` to flush stale HTML from the CDN edge.

### How the deploy reaches EC2 (no SSH)

EC2 has the `AmazonSSMManagedInstanceCore` policy attached, which lets the SSM agent receive commands. The GitHub Actions role is granted `ssm:SendCommand` against the specific instance ARN and the `AWS-RunShellScript` document ARN. No SSH key or open port 22 is required. SSM command output is polled via `ssm:GetCommandInvocation` and any failure causes the workflow step to exit non-zero.

### Artifact integrity check

Before executing any downloaded script on EC2, the deploy step computes the sha256 hash of the file on the GitHub Actions runner and passes it as part of the SSM command string. On EC2, `sha256sum -c` verifies the file matches before `bash` is invoked. This ensures the file was not corrupted or tampered with during the S3 upload/download round-trip.

---

## Adding a New App

To add a fourth application (e.g. `myapp` with backend on port 3002):

1. **Create `myapp/backend/ecosystem.config.cjs`** — set `name: 'myapp-backend'`, `cwd: '/app-myapp'`, `PORT: '3002'`.
2. **Update `scripts/update-nginx.sh`** — add `location /myapp/api/` and `location /myapp/trpc/` blocks proxying to `http://127.0.0.1:3002/api/` and `/trpc/` respectively.
3. **Update `terraform/modules/cdn/main.tf`** — add two `ordered_cache_behavior` blocks for `/myapp/api/*` and `/myapp/trpc/*` pointing to `ec2-backend` with `CachingDisabled`. If the frontend is a SPA, extend the `spa_router` CloudFront Function with a `/myapp/` branch identical to the existing `/coba/` or `/game/` blocks.
4. **Update `terraform/modules/cdn/main.tf` default behaviours** — add `custom_error_response` entries for the new path if needed.
5. **Add build/deploy steps to `.github/workflows/deploy.yml`** — copy the COBA backend deploy block (adjust paths, port, and health check URL) and a frontend sync block (adjust `working-directory` and S3 prefix). Add the new frontend paths to the final CloudFront invalidation step.
6. **Push to `main`** — the nginx sync and deploys run automatically. No manual SSH access is needed.

---

## Local Development

From the repo root, `npm run dev` starts all backends and frontends concurrently. The script `scripts/dev-proxy.mjs` runs a local reverse proxy that mirrors the production path structure (`/`, `/coba/`, `/game/`) so that routing behaviour matches production without needing CloudFront locally.
