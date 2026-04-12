<!-- Source: docs/AWS_DEPLOYMENT_PLAN.md — Sections 4–7: Backend Hosting, Frontend Hosting, Networking, Secrets -->

# AWS Deployment — Compute, Frontend, Networking, and Secrets

## 4. Backend Hosting: EC2 t2.micro with pm2

### Instance Setup

- **AMI:** Amazon Linux 2023
- **Instance type:** t2.micro (1 vCPU, 1 GB RAM) — free tier
- **Storage:** 8 GB root EBS (included with instance) + 30 GB gp2 data volume for SQLite
- **Subnet:** Public subnet (has internet access via Internet Gateway)
- **Public IP:** Elastic IP (free when attached to a running instance)
- **Node.js:** Install Node.js 22 LTS via NodeSource (no official Amazon Linux package for Node 25 yet; Node 22 works fine)

### Process Management with pm2

```bash
# Install pm2 globally
npm install -g pm2

# Start the backend
pm2 start dist/server.js --name coba-backend \
  --env production \
  --time

# Persist across reboots
pm2 startup systemd
pm2 save
```

### pm2 ecosystem file (`/app/ecosystem.config.cjs`)

```javascript
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
      S3_FILES_BUCKET: 'coba-files-poc',
      // DB_PATH and ANTHROPIC_API_KEY injected at deploy time from SSM
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/coba/err.log',
    out_file: '/var/log/coba/out.log',
    max_memory_restart: '800M',
  }]
}
```

### Security Group: `sg-ec2-coba`

| Direction | Protocol | Port | Source / Destination | Purpose |
|---|---|---|---|---|
| Inbound | TCP | 3000 | CloudFront managed prefix list (`pl-4fa04526` for eu-west-1) | API traffic from CloudFront only |
| Inbound | TCP | 22 | Your office IP or 0.0.0.0/0 (restrict in production) | SSH for deploys |
| Outbound | TCP | 443 | 0.0.0.0/0 | S3, SSM, Anthropic API, package installs |
| Outbound | TCP | 80 | 0.0.0.0/0 | Package installs (Amazon Linux repos) |

> **Important:** Port 3000 is restricted to the CloudFront prefix list. The instance's public IP is not directly reachable by browsers on port 3000.

---

## 5. Frontend Hosting: S3 + CloudFront

### CloudFront Behavior Rules

| Path pattern | Origin | Cache |
|---|---|---|
| `/api/*` | EC2 public DNS (HTTP port 3000) | No cache (TTL=0, all methods forwarded) |
| `/trpc/*` | EC2 public DNS (HTTP port 3000) | No cache (TTL=0, all methods forwarded) |
| `/_assets/*` | S3 (OAC) | 1 year (content-hashed filenames) |
| `/*` | S3 (OAC) | 5 minutes (index.html and other HTML) |

**SPA routing:** CloudFront custom error response: HTTP 403 and 404 from S3 → serve `/index.html` with HTTP 200.

**API URL:** The tRPC client uses a relative URL (`/trpc`). CloudFront routes it to EC2. No environment variable change needed in the frontend code.

**EC2 as CloudFront origin:**
- Origin protocol: HTTP (port 3000)
- Origin domain: EC2 Elastic IP DNS name (e.g. `ec2-1-2-3-4.eu-west-1.compute.amazonaws.com`) or a Route 53 record pointing to the Elastic IP
- No HTTPS on the EC2↔CloudFront leg for a POC — CloudFront terminates TLS for the browser. Add an ACM cert + Nginx reverse proxy on EC2 if you need end-to-end encryption.

### ACM Certificate

Request a certificate in `us-east-1` (required for CloudFront) for your domain. DNS-validate via Route 53. Free.

---

## 6. Networking

### VPC Layout

- **CIDR:** `10.0.0.0/16`, **Region:** `eu-west-1`
- **AZs:** `eu-west-1a` only (POC — one AZ is fine, saves complexity)

```
VPC 10.0.0.0/16
└── Public subnet: 10.0.0.0/24  (eu-west-1a)
    └── Internet Gateway → default route 0.0.0.0/0
    └── EC2 t2.micro (Elastic IP)
```

No private subnets. No NAT Gateway. EC2 has direct internet access for outbound calls to Anthropic, S3, and SSM.

### VPC Endpoints

1. **S3 Gateway Endpoint** — free. Routes S3 traffic from the EC2 instance through AWS private network instead of public internet. Adds no cost, reduces data transfer charges.
2. **SSM Interface Endpoint** — optional for a POC. Without it, EC2 calls SSM over the public internet (still works, still secure via TLS). Add it later if you want to lock down outbound rules.

---

## 7. Secrets and Configuration

### SSM Parameter Store (Free)

| Parameter name | Type | Contents |
|---|---|---|
| `/coba/poc/anthropic-key` | `SecureString` | `sk-ant-...` |
| `/coba/poc/db-path` | `String` | `/data/coba.db` |
| `/coba/poc/s3-files-bucket` | `String` | `coba-files-poc` |

The EC2 instance IAM role is granted `ssm:GetParameters` on the `/coba/poc/*` prefix. The deploy script fetches these at startup and injects them into pm2's environment.

### Fetching Secrets at Deploy Time

```bash
# In the deploy script, after SSHing into EC2:
ANTHROPIC_KEY=$(aws ssm get-parameter --name /coba/poc/anthropic-key \
  --with-decryption --query Parameter.Value --output text)
DB_PATH=$(aws ssm get-parameter --name /coba/poc/db-path \
  --query Parameter.Value --output text)

pm2 set coba-backend:env:ANTHROPIC_API_KEY "$ANTHROPIC_KEY"
pm2 set coba-backend:env:DB_PATH "$DB_PATH"
pm2 reload coba-backend
```
