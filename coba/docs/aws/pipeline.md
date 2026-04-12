<!-- Source: docs/AWS_DEPLOYMENT_PLAN.md — Section 9: GitHub Actions Deployment Pipeline -->

# AWS Deployment — GitHub Actions Pipeline

## 9. GitHub Actions Deployment Pipeline

### Strategy

Instead of building a Docker image and pushing to ECR/ECS, the pipeline:
1. Builds the TypeScript backend locally on the runner
2. Packages `backend/dist/` + `backend/node_modules/` into a zip
3. Copies the zip to EC2 via `scp`
4. SSHs in, extracts, and restarts pm2

ECR can optionally be used to store the zip as an OCI artifact, but for a POC direct `scp` is simpler.

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to AWS (Free Tier POC)
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: poc

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ vars.AWS_ACCOUNT_ID }}:role/GitHubActionsDeployRole
          aws-region: eu-west-1

      # ── Build backend ──────────────────────────────────────────────
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install backend dependencies
        run: npm ci --prefix backend

      - name: Build backend (TypeScript → dist/)
        run: npm run build --prefix backend

      - name: Package backend artifact
        run: |
          cd backend
          zip -r ../backend-artifact.zip dist/ node_modules/ package.json
          cd ..
          echo "Artifact size: $(du -sh backend-artifact.zip | cut -f1)"

      # ── Deploy backend to EC2 ──────────────────────────────────────
      - name: Write SSH key
        run: |
          echo "${{ secrets.EC2_SSH_PRIVATE_KEY }}" > /tmp/deploy_key
          chmod 600 /tmp/deploy_key

      - name: Copy artifact to EC2
        run: |
          scp -i /tmp/deploy_key \
            -o StrictHostKeyChecking=no \
            backend-artifact.zip \
            ec2-user@${{ vars.EC2_PUBLIC_IP }}:/tmp/backend-artifact.zip

      - name: Deploy and restart on EC2
        run: |
          ssh -i /tmp/deploy_key \
            -o StrictHostKeyChecking=no \
            ec2-user@${{ vars.EC2_PUBLIC_IP }} << 'ENDSSH'
            set -e

            # Fetch secrets from SSM
            ANTHROPIC_KEY=$(aws ssm get-parameter \
              --name /coba/poc/anthropic-key \
              --with-decryption \
              --query Parameter.Value --output text)
            DB_PATH=$(aws ssm get-parameter \
              --name /coba/poc/db-path \
              --query Parameter.Value --output text)
            S3_BUCKET=$(aws ssm get-parameter \
              --name /coba/poc/s3-files-bucket \
              --query Parameter.Value --output text)

            # Extract artifact
            mkdir -p /app
            cd /app
            unzip -o /tmp/backend-artifact.zip
            rm /tmp/backend-artifact.zip

            # Write pm2 ecosystem file
            cat > /app/ecosystem.config.cjs << 'EOF'
            module.exports = {
              apps: [{
                name: 'coba-backend',
                script: '/app/dist/server.js',
                cwd: '/app',
                env: {
                  NODE_ENV: 'production',
                  PORT: '3000',
                  USE_REAL_AI: 'true',
                  SERVE_STATIC: 'false',
                  AWS_REGION: 'eu-west-1',
                },
                log_date_format: 'YYYY-MM-DD HH:mm:ss',
                error_file: '/var/log/coba/err.log',
                out_file: '/var/log/coba/out.log',
                max_memory_restart: '800M',
              }]
            }
            EOF

            # Inject secrets and restart
            export ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
            export DB_PATH="$DB_PATH"
            export S3_FILES_BUCKET="$S3_BUCKET"

            pm2 reload ecosystem.config.cjs --update-env \
              || pm2 start ecosystem.config.cjs

            pm2 save

            # Verify health
            sleep 3
            curl -sf http://localhost:3000/api/health || (pm2 logs --lines 50 && exit 1)
          ENDSSH

      # ── Build and deploy frontend ──────────────────────────────────
      - name: Install frontend dependencies
        run: npm ci --prefix frontend

      - name: Build frontend (Vite)
        run: npm run build --prefix frontend
        env:
          # tRPC client uses relative URL — no VITE_API_URL needed
          NODE_ENV: production

      - name: Sync frontend to S3
        run: |
          # Long-cache for content-hashed assets
          aws s3 sync frontend/dist/_assets/ s3://${{ vars.FRONTEND_BUCKET_NAME }}/_assets/ \
            --cache-control "public,max-age=31536000,immutable" \
            --delete

          # Short-cache for index.html and other HTML files
          aws s3 sync frontend/dist/ s3://${{ vars.FRONTEND_BUCKET_NAME }}/ \
            --cache-control "no-cache,no-store,must-revalidate" \
            --exclude "_assets/*" \
            --delete

      - name: Invalidate CloudFront index.html
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/index.html" "/service-worker.js"
```

### GitHub Actions Repository Variables and Secrets

| Type | Name | Value |
|---|---|---|
| Variable | `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
| Variable | `EC2_PUBLIC_IP` | Elastic IP of the EC2 instance |
| Variable | `FRONTEND_BUCKET_NAME` | `coba-frontend-poc` |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | From Terraform output |
| Secret | `EC2_SSH_PRIVATE_KEY` | Private key for the EC2 key pair |

### OIDC Trust Policy for GitHub Actions

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": { "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/coba:ref:refs/heads/main" }
    }
  }]
}
```

The `GitHubActionsDeployRole` needs permissions to: `s3:Sync`/`s3:PutObject` on the frontend bucket, `cloudfront:CreateInvalidation`, `ssm:GetParameter` on `/coba/poc/*`, and `ec2:DescribeInstances` (for diagnostics).
