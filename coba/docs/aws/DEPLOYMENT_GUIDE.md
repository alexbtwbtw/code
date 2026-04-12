# COBA — AWS Deployment Guide

## Overview

This guide walks you through deploying COBA to AWS from scratch. The stack is:

- **EC2 t3.micro** — runs the Hono backend + serves the built frontend
- **EBS 30 GB gp3** — persistent SQLite database (`/data/coba.db`)
- **S3 (two buckets)** — CV files (`coba-files-…`) and frontend assets (`coba-frontend-…`)
- **CloudFront** — CDN for the frontend S3 bucket (HTTPS via default `*.cloudfront.net` cert)
- **SSM Parameter Store** — secrets (Anthropic API key, etc.)
- **GitHub Actions** — OIDC-based CI/CD; no long-lived AWS keys

---

## Prerequisites

| Tool | Version |
|------|---------|
| Terraform | >= 1.6 |
| AWS CLI | >= 2.x (`aws configure` with an admin IAM user) |
| GitHub repo secrets/vars | see §3 |
| Node.js | >= 25 (local builds only) |

---

## Step 1 — Bootstrap IAM for GitHub Actions OIDC

GitHub Actions authenticates to AWS via OIDC — no static keys needed.

```bash
# One-time: create the OIDC provider and the deploy role
# (Terraform creates these, but you need admin credentials first)
aws configure   # enter your admin Access Key ID + Secret
```

Terraform will create the OIDC provider and `coba-github-actions-role` automatically in step 2.

---

## Step 2 — Provision Infrastructure with Terraform

```bash
cd terraform/environments/poc

# Initialise providers and modules
terraform init

# Preview what will be created (read the output carefully)
terraform plan

# Apply — this provisions EC2, EBS, S3, CloudFront, IAM
terraform apply
```

**What gets created:**

| Resource | Details |
|----------|---------|
| VPC + subnets | Public subnet in eu-west-2a |
| Security group | Port 22 (SSH), 3000 (backend), 80 (HTTP) |
| EC2 t3.micro | Amazon Linux 2023, Node 25, pm2 |
| EBS 30 GB gp3 | Mounted at `/data`, SQLite lives at `/data/coba.db` |
| S3 `coba-files-…` | CV file storage (private) |
| S3 `coba-frontend-…` | Static frontend assets (public via CloudFront) |
| CloudFront distribution | HTTPS with default `*.cloudfront.net` cert |
| SSM parameters | `/coba/poc/anthropic-api-key`, etc. |
| IAM role (EC2) | Grants EC2 access to S3, SSM, and CloudWatch Logs |

**Collect the outputs** (you'll need them in step 3):

```bash
terraform output
```

Key outputs:
- `ec2_public_ip` — SSH and backend address
- `cloudfront_domain` — your app URL (`https://xxxx.cloudfront.net`)
- `files_bucket_name` — S3 bucket for CVs
- `frontend_bucket_name` — S3 bucket for static assets
- `github_actions_role_arn` — paste into GitHub vars

---

## Step 3 — Configure GitHub Repository

Go to **Settings → Secrets and variables → Actions** in your GitHub repo.

### Variables (not secret)

| Variable | Value | Example |
|----------|-------|---------|
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID | `123456789012` |
| `AWS_REGION` | `eu-west-2` | |
| `EC2_HOST` | `ec2_public_ip` from Terraform output | `18.134.x.x` |
| `EC2_USER` | `ec2-user` | |
| `FILES_BUCKET` | `files_bucket_name` from Terraform output | `coba-files-poc-…` |
| `FRONTEND_BUCKET` | `frontend_bucket_name` from Terraform output | `coba-frontend-poc-…` |
| `CLOUDFRONT_DISTRIBUTION_ID` | From Terraform output | `EXXXXXXXXXX` |
| `GITHUB_ACTIONS_ROLE_ARN` | `github_actions_role_arn` from Terraform output | `arn:aws:iam::…` |

### Secrets

| Secret | Value |
|--------|-------|
| `EC2_SSH_KEY` | Private SSH key (PEM format, no passphrase) — see below |

**Saving the SSH key (Terraform generates it):**

```powershell
# Save the private key from Terraform output
terraform output -raw ec2_private_key > coba-ec2-key.pem

# Fix permissions if SSH complains about unprotected key file
icacls coba-ec2-key.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

Paste the contents of `coba-ec2-key.pem` into the `EC2_SSH_KEY` GitHub secret.

---

## Step 4 — Add SSH Public Key to EC2

Terraform generates the key pair and registers it with EC2 automatically via `aws_key_pair` — no manual step needed here. The key is ready to use as soon as `terraform apply` completes.

---

## Step 5 — Bootstrap the EC2 Instance

The EC2 instance is provisioned by Terraform's `user_data` script, which runs once on first boot. It:

1. Installs Node 25, pm2, git
2. Formats and mounts the EBS volume at `/data`
3. Creates `/data/coba.db` (empty — seeded on first backend start)
4. Creates `/app` for the backend code
5. Writes `/app/.env` with placeholder values

**After Terraform apply**, SSH in and fill in real values:

```bash
ssh -i coba-ec2-key.pem ec2-user@<ec2_public_ip>

# Edit the env file
sudo nano /app/.env
```

Set these values:

```env
PORT=3000
NODE_ENV=production
DB_PATH=/data/coba.db

# S3 bucket for CV files (from Terraform output)
S3_FILES_BUCKET=coba-files-poc-xxxx
AWS_REGION=eu-west-2

# Set to 'true' to enable Claude AI features (CV parsing, member matching)
# Leave unset or 'false' to run with mock AI responses
USE_REAL_AI=false

# Only needed if USE_REAL_AI=true
ANTHROPIC_API_KEY=sk-ant-...
```

Then fetch the key from SSM (if you stored it there):

```bash
export ANTHROPIC_API_KEY=$(aws ssm get-parameter --name /coba/poc/anthropic-api-key --with-decryption --query Parameter.Value --output text)
# Add it to /app/.env
```

---

## Step 6 — First Deployment

Push to the `main` branch or trigger the deploy workflow manually:

```bash
git push origin main
# Or: GitHub → Actions → Deploy to AWS → Run workflow
```

**What the deploy workflow does:**

1. **Build frontend** — `npm run build` produces `frontend/dist/`
2. **Sync to S3** — `aws s3 sync frontend/dist/ s3://$FRONTEND_BUCKET/`
3. **Invalidate CloudFront** — clears the CDN cache so users get new assets
4. **Bundle backend** — zips `backend/`, `package.json`, `package-lock.json`
5. **SCP to EC2** — copies the bundle via SSH
6. **Restart pm2** — `pm2 restart coba` picks up the new code

**First-time backend start** (seeding):

The backend checks if the `projects` table is empty. If so, it seeds:
- 5 sample projects with geo entries and structures
- 4 team members with project history and generated CV PDFs
- Sample requirement books and tasks

Seeding only runs once. On every subsequent pm2 restart the existing data is preserved.

---

## Step 7 — Verify the Deployment

```bash
# Check backend health
curl http://<ec2_public_ip>:3000/api/health

# Check pm2 status
ssh -i coba-ec2-key.pem ec2-user@<ec2_public_ip> 'pm2 list'

# Check backend logs
ssh -i coba-ec2-key.pem ec2-user@<ec2_public_ip> 'pm2 logs coba --lines 50'
```

Open `https://<cloudfront_domain>` in your browser — you should see the COBA login screen.

---

## Enabling AI Features

By default `USE_REAL_AI` is `false`. The UI shows Upload CV, AI suggest, and Import from PDF/DOCX buttons as disabled. To enable:

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Store it in SSM:

```bash
aws ssm put-parameter \
  --name /coba/poc/anthropic-api-key \
  --value "sk-ant-..." \
  --type SecureString \
  --region eu-west-2
```

3. SSH into EC2 and update `/app/.env`:

```env
USE_REAL_AI=true
ANTHROPIC_API_KEY=sk-ant-...
```

4. Restart the backend:

```bash
pm2 restart coba
```

---

## Ongoing Operations

### Deploy a new version

Just push to `main` — the workflow runs automatically.

### View logs

```bash
ssh -i coba-ec2-key.pem ec2-user@<ec2_public_ip>
pm2 logs coba --lines 100
```

### Restart the backend manually

```bash
pm2 restart coba
```

### Reset the database (wipe all data)

```bash
ssh -i coba-ec2-key.pem ec2-user@<ec2_public_ip>
pm2 stop coba
sudo rm /data/coba.db
pm2 start coba   # seeds fresh data on startup
```

### Destroy everything

```bash
cd terraform/environments/poc
terraform destroy -var="github_repo=YOUR_GITHUB_ORG/YOUR_REPO_NAME"
```

---

## Cost Estimate (eu-west-2, on-demand)

| Resource | Monthly cost |
|----------|-------------|
| EC2 t3.micro | ~$10 |
| EBS 30 GB gp3 | ~$2.50 |
| S3 + CloudFront (low traffic) | ~$1–2 |
| **Total** | **~$14/month** |

Use a t3.micro Reserved Instance (1-year, no upfront) to cut the EC2 cost to ~$6/month.
