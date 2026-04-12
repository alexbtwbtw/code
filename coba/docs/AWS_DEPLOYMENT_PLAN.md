# AWS Deployment Plan — COBA Internal Portal

> **Minimum-cost plan for a paid AWS account.** Every service choice is driven by keeping the monthly bill as low as possible while still being production-viable. Estimated cost: **~$13/month** (eu-west-1, low traffic).
> If you later need high availability, containerised deploys, or a managed database, see Section 14 for the upgrade path to ECS Fargate + RDS PostgreSQL + ALB (~$88/month).

---

## Codebase Summary (What We Are Deploying)

- **Backend:** Hono on Node.js ≥25, served via `@hono/node-server`. All API is tRPC. One HTTP server on port 3000.
- **Database:** `better-sqlite3` — currently in-memory. For this deployment we switch to a **file on an EBS volume** so data survives restarts. No schema changes, no new dependencies.
- **File storage:** CV PDF blobs are stored in `member_cvs.file_data TEXT` (base64). Must move to S3 — same as original plan.
- **AI features:** Four Claude Sonnet 4.6 integrations via `@anthropic-ai/sdk`. Controlled by `USE_REAL_AI=true` and `ANTHROPIC_API_KEY`. Make outbound HTTPS calls to `api.anthropic.com`.
- **pdfkit:** Generates PDF CVs in-process and returns a `Buffer`. Will upload to S3 and return a presigned URL.
- **Frontend:** Vite + React SPA. All API calls proxy to `/trpc` and `/api`. Deployed to S3 + CloudFront.

---

## 1. High-Level Architecture

```
                     ┌──────────────────────────────────────────────────────────────┐
                     │  AWS Account: coba-poc                                        │
                     │                                                               │
  Browser            │  CloudFront Distribution                                     │
  ──────  ─HTTPS──►  │  ├─ /api/*  ──────────────► EC2 t2.micro (public subnet)    │
                     │  ├─ /trpc/* ──────────────► EC2 t2.micro (public subnet)    │
                     │  └─ /*      → S3 Origin (frontend SPA static assets)         │
                     │                                                               │
                     │  EC2 t2.micro (public subnet, Amazon Linux 2023)             │
                     │  ├─ Node.js process managed by pm2                           │
                     │  ├─ SQLite DB file on /data (EBS 30 GB gp2)                 │
                     │  ├─ Reads secrets from SSM Parameter Store                   │
                     │  ├─ Reads/writes CV files to S3 via Internet Gateway         │
                     │  └─ Outbound to api.anthropic.com via Internet Gateway       │
                     │                                                               │
                     │  S3 bucket: coba-files (CV PDFs, generated CVs)             │
                     │  S3 bucket: coba-frontend (Vite build output)               │
                     │  SSM Parameter Store: ANTHROPIC_API_KEY, DB_PATH            │
                     └──────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

1. **EC2 t3.micro instead of ECS Fargate** — ~$8.50/month vs ~$15/month for Fargate. No cold starts, runs continuously. See Section 14 for a full EC2 vs Fargate comparison.
2. **SQLite on EBS instead of RDS** — keeps the existing `better-sqlite3` code unchanged. File stored on a 30 GB EBS gp3 volume (~$2.40/month). Zero query rewrites vs RDS which costs ~$15/month AND requires migrating every query from `@param` syntax to PostgreSQL `$1` positional params.
3. **No ALB** — CloudFront uses the EC2 instance's public DNS as a custom HTTP origin. Saves $18/month.
4. **No NAT Gateway** — EC2 is in a public subnet. Outbound traffic (Anthropic API, S3, SSM) goes directly via the Internet Gateway. Inbound restricted by security group. Saves $32/month.
5. **SSM Parameter Store instead of Secrets Manager** — Secrets Manager costs $0.40/secret/month. SSM Standard tier is permanently free.

---

## 2. Database: SQLite on EBS

### Why Not RDS

RDS db.t3.micro is free for 12 months but costs ~$15–18/month after that. The existing codebase uses `better-sqlite3` with SQLite-specific syntax (`@param` named bindings, `db.prepare(...).all/get/run`, synchronous transactions). Migrating to PostgreSQL requires rewriting every query file. For a POC, that work is unnecessary.

### EBS Volume

- Mount a 30 GB `gp2` EBS volume at `/data` on the EC2 instance. This is within the free tier (30 GB gp2 free for 12 months).
- SQLite database file lives at `/data/coba.db`.
- Data survives EC2 reboots and `pm2 restart` cycles.
- The EBS volume is independent of the EC2 instance lifecycle — even if the instance is replaced, the volume can be re-attached.

### One-Line Code Change

The only required change is in `backend/src/db.ts` (or wherever `new Database(...)` is called):

```typescript
// Before (in-memory, data lost on restart):
const db = new Database(':memory:')

// After (file-based, persists across restarts):
const dbPath = process.env.DB_PATH ?? ':memory:'
const db = new Database(dbPath)
```

Set `DB_PATH=/data/coba.db` in the environment (via SSM Parameter Store, injected at pm2 startup). All 17 tables, all prepared statements, all transactions — unchanged.

### Backup Strategy (POC)

For a POC, daily EBS snapshots via AWS Backup are sufficient (~$0.05/GB/month, well under $2/month for a small DB file). Alternatively, add a cron job on the instance:

```bash
# /etc/cron.daily/coba-backup
sqlite3 /data/coba.db ".backup /data/coba-$(date +%F).db"
aws s3 cp /data/coba-$(date +%F).db s3://coba-files/backups/
find /data -name 'coba-*.db' -mtime +7 -delete
```

---

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

---

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

---

## 8. Terraform Structure

```
terraform/
  modules/
    networking/    ← VPC, public subnet, IGW, route table, security groups, Elastic IP
    storage/       ← S3 buckets (files + frontend), CORS, lifecycle, S3 Gateway VPC endpoint
    compute/       ← EC2 instance, EBS volume, IAM instance role + policies, SSM parameters
    cdn/           ← CloudFront distribution, ACM cert (us-east-1), Route 53 records
  environments/
    poc/
      main.tf      ← instantiates all modules
      variables.tf
      outputs.tf
      backend.tf   ← S3 backend + DynamoDB lock table
```

No `modules/database/` — SQLite on EC2. No `modules/iam/` separate from compute — the EC2 instance role lives in `modules/compute/`.

### Key Terraform Resources

#### `modules/networking/main.tf`

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "coba-poc-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.0.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = false  # we use an Elastic IP instead
  tags = { Name = "coba-poc-public" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "ec2" {
  name   = "coba-poc-ec2"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "API traffic from CloudFront"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  ingress {
    description = "SSH for deploys"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.deploy_ssh_cidr]  # restrict to your IP or GitHub Actions CIDR
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_eip" "ec2" {
  domain = "vpc"
  tags = { Name = "coba-poc-ec2-eip" }
}

resource "aws_eip_association" "ec2" {
  instance_id   = var.ec2_instance_id  # passed in from compute module
  allocation_id = aws_eip.ec2.id
}
```

#### `modules/compute/main.tf`

```hcl
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}

resource "aws_iam_role" "ec2" {
  name = "coba-poc-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ec2_permissions" {
  name = "coba-poc-ec2-policy"
  role = aws_iam_role.ec2.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # S3 access for CV files
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.files_bucket_name}",
          "arn:aws:s3:::${var.files_bucket_name}/*"
        ]
      },
      {
        # SSM Parameter Store for secrets
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = "arn:aws:ssm:${var.region}:${var.account_id}:parameter/coba/poc/*"
      },
      {
        # CloudWatch Logs
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.region}:${var.account_id}:log-group:/coba/*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "coba-poc-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = "t2.micro"
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [var.ec2_sg_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.ssh_key_name

  root_block_device {
    volume_size           = 8
    volume_type           = "gp2"
    delete_on_termination = true
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Install Node.js 22
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs

    # Install pm2
    npm install -g pm2

    # Mount data volume (assumes /dev/xvdf is the EBS data volume)
    mkdir -p /data
    if ! blkid /dev/xvdf; then
      mkfs.ext4 /dev/xvdf
    fi
    echo '/dev/xvdf /data ext4 defaults,nofail 0 2' >> /etc/fstab
    mount -a

    # Create app directory
    mkdir -p /app
    mkdir -p /var/log/coba
  EOF

  tags = { Name = "coba-poc-backend" }
}

resource "aws_ebs_volume" "data" {
  availability_zone = "${var.region}a"
  size              = 30
  type              = "gp2"
  tags = { Name = "coba-poc-data" }
}

resource "aws_volume_attachment" "data" {
  device_name  = "/dev/xvdf"
  volume_id    = aws_ebs_volume.data.id
  instance_id  = aws_instance.backend.id
  # stop_instance_before_detaching = true  # uncomment if needed
}

resource "aws_ssm_parameter" "anthropic_key" {
  name  = "/coba/poc/anthropic-key"
  type  = "SecureString"
  value = var.anthropic_api_key  # passed in via TF_VAR_anthropic_api_key env var, never in code
}

resource "aws_ssm_parameter" "db_path" {
  name  = "/coba/poc/db-path"
  type  = "String"
  value = "/data/coba.db"
}

resource "aws_ssm_parameter" "s3_files_bucket" {
  name  = "/coba/poc/s3-files-bucket"
  type  = "String"
  value = var.files_bucket_name
}
```

#### `modules/storage/main.tf`

```hcl
resource "aws_s3_bucket" "files" {
  bucket = var.files_bucket_name
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket                  = aws_s3_bucket.files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "files" {
  bucket = aws_s3_bucket.files.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["https://${var.domain_name}"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Allow CloudFront OAC to read the frontend bucket
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = var.cloudfront_distribution_arn
        }
      }
    }]
  })
}

# S3 Gateway VPC Endpoint (free — keeps S3 traffic on AWS network)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [var.public_route_table_id]
  tags = { Name = "coba-poc-s3-endpoint" }
}
```

#### `modules/cdn/main.tf`

```hcl
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "coba-poc-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]
  price_class         = "PriceClass_100"  # US, Canada, Europe only — reduces cost

  # Origin 1: EC2 backend
  origin {
    origin_id   = "ec2-backend"
    domain_name = var.ec2_public_dns  # e.g. ec2-1-2-3-4.eu-west-1.compute.amazonaws.com
    custom_origin_config {
      http_port              = 3000
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Origin 2: S3 frontend
  origin {
    origin_id                = "s3-frontend"
    domain_name              = var.frontend_bucket_regional_domain
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # Behavior: /api/* → EC2
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ec2-backend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled managed policy
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"  # AllViewerExceptHostHeader
  }

  # Behavior: /trpc/* → EC2
  ordered_cache_behavior {
    path_pattern           = "/trpc/*"
    target_origin_id       = "ec2-backend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  }

  # Default behavior: /* → S3 frontend
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # CachingOptimized
    compress               = true
  }

  # SPA routing: 403/404 from S3 → serve index.html
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }
}

# ACM cert must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "main" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "main" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

resource "aws_route53_record" "app" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
```

### Terraform State Backend

```hcl
# environments/poc/backend.tf
terraform {
  backend "s3" {
    bucket         = "coba-terraform-state"
    key            = "poc/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "coba-terraform-locks"
  }
}
```

Create the state bucket and DynamoDB table manually before `terraform init`. The state bucket itself does not count toward the "coba-files" bucket limits.

---

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

---

## 10. What Changes in the Codebase

### Required Changes

| File | Change | Effort |
|---|---|---|
| `backend/src/db.ts` | Make SQLite path configurable via `DB_PATH` env var (1 line) | Trivial |
| `backend/src/router/team.ts` | Remove `file_data` base64 blob; add S3 presigned URL upload for CV files | Medium |
| `backend/src/lib/generateCv.ts` | Upload pdfkit Buffer to S3; return presigned `GetObject` URL | Small |
| `backend/src/lib/parseCv.ts` | Read CV content from S3 by `s3_key` instead of from DB blob | Small |

### `backend/src/db.ts` — SQLite Path (the only infrastructure-forced change)

```typescript
// Find the line: const db = new Database(':memory:')
// Replace with:
const dbPath = process.env.DB_PATH ?? ':memory:'
const db = new Database(dbPath)
```

When `DB_PATH` is not set (local dev), behavior is identical to today — in-memory, resets on restart. When `DB_PATH=/data/coba.db` (EC2), data persists.

### S3 Integration for CV Files

Install the AWS SDK v3 S3 client:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --prefix backend
```

Create `backend/src/lib/s3.ts`:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' })
const BUCKET = process.env.S3_FILES_BUCKET ?? ''

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(s3, new PutObjectCommand({
    Bucket: BUCKET, Key: key, ContentType: contentType
  }), { expiresIn: 900 })
}

export async function getPresignedDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: BUCKET, Key: key
  }), { expiresIn: 900 })
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType
  }))
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
```

### No Other Backend Changes

- All tRPC routers remain synchronous (SQLite stays sync)
- No `pg` dependency, no query rewrites, no transaction rewrites
- No schema migration to PostgreSQL
- Seed data continues to work identically in local dev (in-memory) and on EC2 (file-based)

---

## 11. Cost Estimate (eu-west-1, paid account, low traffic)

| Service | Spec | Pricing basis | Monthly cost |
|---|---|---|---|
| EC2 t3.micro | 1 vCPU, 1 GB RAM, on-demand | $0.0114/hr × 730h | **~$8.30** |
| EBS 30 GB gp3 | Persistent SQLite DB | $0.08/GB/month | **~$2.40** |
| S3 — storage | <5 GB (CV files + frontend assets) | $0.023/GB/month | **~$0.12** |
| S3 — requests | ~5K PUT + ~50K GET/month | $0.0004–0.0005/1K | **~$0.03** |
| CloudFront — transfer | ~1 GB/month outbound | $0.0085/GB after 1 TB free | **~$0.01** |
| CloudFront — requests | ~100K HTTP requests/month | $0.0075/10K after 10M free | **~$0.08** |
| SSM Parameter Store | Standard tier, any number of params | Permanently free | **$0** |
| CloudWatch Logs | <1 GB ingestion/month | $0.50/GB ingestion | **~$0.50** |
| ACM certificate | SSL cert for CloudFront + domain | Free | **$0** |
| Route 53 | 1 hosted zone + ~1M DNS queries | $0.50/zone + $0.40/1M queries | **~$0.90** |
| **Total** | | | **~$12.34/month** |

**What this does NOT include:**
- Data transfer between EC2 and S3 within the same region: **$0** (free)
- Anthropic API costs (separate, depends on AI feature usage)
- EBS snapshot storage if you enable daily backups: ~$0.05/GB/month (~$0.50/month for a small DB)

**Comparison with alternative architectures (same region, same traffic):**

| Architecture | Monthly cost | Notes |
|---|---|---|
| **This plan** (EC2 t3.micro + SQLite + no ALB) | **~$12/month** | No HA, SSH deploy |
| EC2 t3.small (2 GB RAM, more headroom) | ~$18/month | Doubles RAM, useful if pdfkit is slow |
| ECS Fargate 0.5 vCPU / 1 GB | ~$15/month compute only | Add ALB ($18) + NAT ($32) = **~$65/month** |
| ECS Fargate + RDS t4g.micro + ALB + NAT | ~$88/month | Full original plan, HA, managed DB |

---

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

---

## 13. EC2 vs ECS Fargate — Full Comparison

| Factor | EC2 t3.micro (this plan) | ECS Fargate (upgrade path) |
|---|---|---|
| **Monthly compute cost** | ~$8.30 | ~$15 (0.5 vCPU / 1 GB) |
| **With ALB + NAT (required for Fargate HA)** | N/A | +$18 ALB + $32 NAT = **+$50/month** |
| **Full monthly cost** | **~$12** | **~$65–88** |
| **Deployment** | SSH + scp + pm2 reload | Docker build → ECR push → ECS rolling deploy |
| **Downtime on deploy** | ~2–5 seconds (pm2 graceful reload) | Zero downtime (rolling update) |
| **Auto-scaling** | Manual (resize or add instance) | Automatic (min/max task count) |
| **Redundancy** | Single instance — if it dies, ~5 min until ASG replaces it | Tasks restart automatically; run 2+ tasks for zero-downtime failover |
| **Cold start** | None — process is always running | None for Fargate (containers are always warm) |
| **Native modules (better-sqlite3)** | Works natively on EC2 | Requires Docker build on the right architecture (linux/amd64) |
| **SSH access for debugging** | Yes — `ssh ec2-user@...` | No direct shell; use ECS Exec (`aws ecs execute-command`) |
| **Resource limits** | t3.micro = 1 vCPU, 1 GB RAM. If pdfkit spikes memory, process may OOM | Can set exact CPU/RAM per task; easy to increase |
| **OS patching** | You manage (use Amazon Linux 2023 + SSM Patch Manager) | AWS manages (serverless — no OS to patch) |
| **Logs** | pm2 logs → CloudWatch via CloudWatch agent | Built-in: stdout/stderr → CloudWatch Logs automatically |
| **Complexity** | Low — it's just a Node.js process on a VM | Higher — Docker, ECR, task definitions, service config |
| **When to upgrade** | Today — good for POC and low-traffic internal tools | When you need zero-downtime deploys, auto-scaling, or >1 instance |

**Recommendation for this project:** Start with EC2. The app is an internal tool with a small team. At ~$12/month vs ~$65/month, the savings are significant and the operational difference for an internal tool is minimal. Switch to Fargate when/if you need rolling deploys without any downtime or horizontal scaling.

---

## 14. Limitations and Upgrade Path

| Limitation | Impact | Fix when upgrading |
|---|---|---|
| Single EC2 instance | No redundancy; ~10 min downtime if instance is replaced | Move to ECS Fargate (auto-scaling, rolling deploys) |
| SQLite single-writer | Cannot scale horizontally | Migrate to RDS PostgreSQL (see original plan for full migration guide) |
| EC2 in public subnet | Instance has a public IP (mitigated by security group) | Move EC2 to private subnet + NAT Gateway, or move to ECS |
| No HTTPS between CloudFront and EC2 | Traffic on AWS network unencrypted | Add Nginx on EC2 with a self-signed cert + `origin_protocol_policy = "https-only"` |
| pm2 deploy via SSH | No blue/green deploys; brief restart gap | Move to ECS rolling deploys |
| Single EC2 instance | No rolling deploys; ~5 sec restart on deploy | Move to ECS Fargate when zero-downtime deploys matter |

To upgrade from this POC to the full production plan, the main steps are:
1. Migrate SQLite → PostgreSQL (rewrite queries from `@param` to `$1` positional params)
2. Replace EC2 + pm2 with ECS Fargate + ALB
3. Add NAT Gateway for private subnets
4. Replace SSM Parameter Store with Secrets Manager (optional)
