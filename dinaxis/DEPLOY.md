# Dinaxis — Deployment Guide

Backend: Hono + tRPC on port **3002**, managed by PM2.  
Frontend: React/Vite static build, hosted on **S3** (served via CloudFront or nginx redirect).

---

## Prerequisites

- An EC2 instance (Ubuntu 22.04+ recommended) reachable via SSH
- Inbound security group rules: port 22 (SSH), port 80/443 (nginx), port 3002 locked to localhost only
- An S3 bucket for frontend assets (public-read or CloudFront OAC)
- AWS CLI configured on the machine running `deploy.sh` (CI or local)
- SSH key authorised on the EC2 instance

---

## First-time EC2 setup

Run these commands once on the server after provisioning.

```bash
# 1. Install Node 25 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 25
nvm alias default 25

# 2. Install PM2 globally
npm install -g pm2
pm2 startup    # follow the printed command to enable PM2 on boot

# 3. Create app directory
sudo mkdir -p /var/www/dinaxis/backend/{dist,node_modules}
sudo chown -R ubuntu:ubuntu /var/www/dinaxis

# 4. Create SQLite data directory
sudo mkdir -p /var/dinaxis
sudo chown ubuntu:ubuntu /var/dinaxis

# 5. Create log directory
sudo mkdir -p /var/log/dinaxis
sudo chown ubuntu:ubuntu /var/log/dinaxis

# 6. Set production environment variables
#    These are read by PM2 at startup (or inject via Secrets Manager + a wrapper).
cat >> ~/.bashrc <<'EOF'
export NODE_ENV=production
export PORT=3002
export DATABASE_URL=/var/dinaxis/dinaxis.db
export STORAGE=s3
export S3_BUCKET=your-bucket-name
export S3_REGION=eu-west-2
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
EOF
source ~/.bashrc
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | Must be `production` |
| `PORT` | Yes | Backend listen port — `3002` |
| `DATABASE_URL` | Yes | Absolute path to the SQLite file, e.g. `/var/dinaxis/dinaxis.db` |
| `STORAGE` | Yes | Storage adapter: `s3` for AWS, `blob` for dev, `filesystem` for Electron |
| `S3_BUCKET` | Yes (if `STORAGE=s3`) | S3 bucket name for document/file storage |
| `S3_REGION` | Yes (if `STORAGE=s3`) | AWS region, e.g. `eu-west-2` |
| `AWS_ACCESS_KEY_ID` | Yes (if `STORAGE=s3`) | IAM access key with S3 read/write on the bucket |
| `AWS_SECRET_ACCESS_KEY` | Yes (if `STORAGE=s3`) | Corresponding secret key |

The PM2 config at `backend/ecosystem.config.cjs` sets `NODE_ENV`, `PORT`, `DATABASE_URL`, and `STORAGE`. All AWS credentials should be injected at the OS level (environment, IAM instance role, or Secrets Manager) — do not hard-code them in the config file.

---

## GitHub Actions secrets

Add these in **Settings → Secrets and variables → Actions** for the repository:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM key with S3 sync permissions |
| `AWS_SECRET_ACCESS_KEY` | Corresponding secret |
| `AWS_REGION` | e.g. `eu-west-2` |
| `S3_BUCKET` | Bucket name |
| `EC2_HOST` | Public IP or hostname of the EC2 instance |
| `EC2_USER` | SSH user, typically `ubuntu` |
| `EC2_SSH_KEY` | Private key for SSH access (paste the full PEM contents) |

---

## Deploying

### Manual deploy

```bash
# From the repo root (D:/code or the CI runner)
export EC2_HOST=your-ec2-host
export EC2_USER=ubuntu
export S3_BUCKET=your-bucket-name

# Make the script executable on first use
chmod +x dinaxis/scripts/deploy.sh

dinaxis/scripts/deploy.sh
```

The script will:
1. Build the backend (`tsc`) and frontend (`tsc -b && vite build`)
2. `rsync` the backend `dist/` and `node_modules/` to `/var/www/dinaxis/backend/` on EC2
3. `rsync` the PM2 config to `/var/www/dinaxis/`
4. `aws s3 sync` the frontend `dist/` to `s3://$S3_BUCKET/dinaxis/`
   - Hashed assets: `Cache-Control: public,max-age=31536000,immutable`
   - `index.html`: `Cache-Control: no-cache,no-store,must-revalidate`
5. SSH in and run `pm2 reload ecosystem.config.cjs --update-env` (zero-downtime on subsequent deploys)

### Via GitHub Actions

Once the deploy job in `.github/workflows/dinaxis-ci.yml` is uncommented and secrets are configured (see above), pushes to `main` that touch `dinaxis/**` will trigger a full build + deploy automatically.

---

## Nginx config

Place this inside the `server {}` block of your nginx config (typically `/etc/nginx/sites-available/default`).  
Adjust `your-cloudfront-distribution.cloudfront.net` if using CloudFront, or serve from a local static path.

```nginx
# Dinaxis API — proxy to Node backend
location ~ ^/dinaxis/(api|trpc)/ {
    proxy_pass         http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}

# Dinaxis frontend — redirect to S3/CloudFront
# Option A: redirect to CloudFront
location /dinaxis/ {
    return 302 https://your-cloudfront-distribution.cloudfront.net/dinaxis$request_uri;
}

# Option B: serve from a local path (if you rsync dist/ to the server instead)
# location /dinaxis/ {
#     root /var/www;
#     try_files $uri $uri/ /dinaxis/index.html;
# }
```

After editing, test and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Enabling the deploy job in CI

The deploy job in `.github/workflows/dinaxis-ci.yml` is currently commented out. Once all GitHub Actions secrets are configured:

1. Open `.github/workflows/dinaxis-ci.yml`
2. Uncomment the `deploy:` job block (starting at the line that reads `# deploy:`)
3. Replace the placeholder deploy steps with calls to `dinaxis/scripts/deploy.sh`, passing secrets as environment variables — see `DEPLOY.md` (this file) and `dinaxis/scripts/deploy.sh` for the full list
4. Commit and push to `main`

The `deploy` job depends on `typecheck-backend` and `build-frontend`, so it only runs after both pass.
