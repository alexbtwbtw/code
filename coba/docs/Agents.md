# COBA Agents

Specialist agents used in this project and what they do.

## AWS Cloud Agent

**Purpose:** Plans and maintains the AWS deployment architecture for COBA.

**Responsibilities:**
- Architecture decisions (compute, database, networking, storage)
- Cost estimation and service comparisons
- Terraform module design
- GitHub Actions deployment pipeline design
- Upgrade path planning (POC → production)

**Output:** `docs/aws/` — split into overview, Terraform, pipeline, codebase changes, and rollout files.

**Key decisions made:**
- EC2 t3.micro instead of ECS Fargate (~$12/month vs ~$65/month)
- SQLite on EBS instead of RDS (no query migration needed for POC)
- No ALB, no NAT Gateway (EC2 in public subnet behind CloudFront)
- SSM Parameter Store instead of Secrets Manager (free tier)
