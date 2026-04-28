#!/usr/bin/env bash
# After cloning, make this executable: chmod +x scripts/deploy.sh
set -euo pipefail

# Dinaxis AWS deployment script
# Usage: ./scripts/deploy.sh
#
# Required env vars:
#   EC2_HOST      — public hostname or IP of the EC2 instance
#   EC2_USER      — SSH user (default: ubuntu)
#   S3_BUCKET     — S3 bucket name for frontend static assets
#
# SSH access must be configured before running (ssh-agent or SSH_KEY_PATH).
# All secrets should be pre-set on the EC2 instance in the PM2 environment
# or via AWS Secrets Manager; this script does not transmit secrets.

REMOTE="${EC2_USER:-ubuntu}@${EC2_HOST:?EC2_HOST must be set}"
APP_DIR="/var/www/dinaxis"

echo "==> Deploying Dinaxis to $REMOTE"

# 1. Build backend
echo "==> Building backend..."
npm --prefix backend run build

# 2. Build frontend
echo "==> Building frontend..."
npm --prefix frontend run build

# 3. Sync backend dist to EC2
echo "==> Syncing backend dist..."
rsync -az --delete \
  backend/dist/ "$REMOTE:$APP_DIR/backend/dist/"

# 4. Sync backend node_modules to EC2
#    Skip dev-only and build-time packages to keep the transfer lean.
echo "==> Syncing backend node_modules..."
rsync -az --delete \
  --exclude '.cache' \
  --exclude 'typescript' \
  --exclude 'tsx' \
  --exclude '@types' \
  --exclude 'electron' \
  backend/node_modules/ "$REMOTE:$APP_DIR/backend/node_modules/"

# 5. Sync PM2 config
echo "==> Syncing PM2 config..."
rsync -az backend/ecosystem.config.cjs "$REMOTE:$APP_DIR/"

# 6. Sync frontend dist to S3
#    Assets (hashed filenames) get long-lived caching; index.html must not be cached.
echo "==> Syncing frontend to S3..."
aws s3 sync frontend/dist/ "s3://${S3_BUCKET:?S3_BUCKET must be set}/dinaxis/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"
aws s3 cp frontend/dist/index.html "s3://${S3_BUCKET}/dinaxis/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

# 7. Reload PM2 on EC2
#    `pm2 reload` performs a zero-downtime restart; falls back to `pm2 start`
#    on first deploy when no process is registered yet.
echo "==> Reloading backend on EC2..."
ssh "$REMOTE" "cd $APP_DIR && pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs && pm2 save"

echo "==> Deploy complete!"
