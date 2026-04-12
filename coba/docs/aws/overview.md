<!-- Source: docs/AWS_DEPLOYMENT_PLAN.md — intro, architecture, cost estimate, EC2 vs Fargate, limitations -->

# AWS Deployment Overview

> **Minimum-cost plan for a paid AWS account.** Every service choice is driven by keeping the monthly bill as low as possible while still being production-viable. Estimated cost: **~$13/month** (eu-west-1, low traffic).
> If you later need high availability, containerised deploys, or a managed database, see the Limitations section below for the upgrade path to ECS Fargate + RDS PostgreSQL + ALB (~$88/month).

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

1. **EC2 t3.micro instead of ECS Fargate** — ~$8.50/month vs ~$15/month for Fargate. No cold starts, runs continuously. See the EC2 vs ECS Fargate section below for a full comparison.
2. **SQLite on EBS instead of RDS** — keeps the existing `better-sqlite3` code unchanged. File stored on a 30 GB EBS gp3 volume (~$2.40/month). Zero query rewrites vs RDS which costs ~$15/month AND requires migrating every query from `@param` syntax to PostgreSQL `$1` positional params.
3. **No ALB** — CloudFront uses the EC2 instance's public DNS as a custom HTTP origin. Saves $18/month.
4. **No NAT Gateway** — EC2 is in a public subnet. Outbound traffic (Anthropic API, S3, SSM) goes directly via the Internet Gateway. Inbound restricted by security group. Saves $32/month.
5. **SSM Parameter Store instead of Secrets Manager** — Secrets Manager costs $0.40/secret/month. SSM Standard tier is permanently free.

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

---

## See Also

- [Database](database.md) — SQLite on EBS
- [Storage](storage.md) — S3 for CV files and frontend
- [Compute & Networking](compute.md) — EC2, CloudFront, networking, secrets
- [Terraform](terraform.md) — full HCL for all modules
- [Deploy Pipeline](pipeline.md) — GitHub Actions workflow
- [Codebase Changes](codebase-changes.md) — what to change in the app
- [Rollout Order](rollout.md) — step-by-step deployment sequence
