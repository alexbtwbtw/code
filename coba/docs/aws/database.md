<!-- Source: docs/AWS_DEPLOYMENT_PLAN.md — Section 2: Database: SQLite on EBS -->

# AWS Deployment — Database: SQLite on EBS

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
