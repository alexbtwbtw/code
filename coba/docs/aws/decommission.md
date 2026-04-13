# COBA AWS Decommission Guide

> **Audience:** The developer who provisioned the COBA POC infrastructure and now needs to tear it all down cleanly, leaving no orphaned resources and no ongoing charges.
>
> **Estimated time:** 30–60 minutes end-to-end (mostly waiting for CloudFront to disable).

---

## 1. Overview — What Exists and the Teardown Order

The following AWS resources were provisioned for the COBA POC. They must be torn down in **reverse dependency order** — things that depend on other things first.

### Complete Resource Inventory

| Layer | Resource | Terraform name | Region |
|-------|----------|----------------|--------|
| CDN | CloudFront distribution | `module.cdn / aws_cloudfront_distribution.main` | Global |
| CDN | CloudFront Origin Access Control | `module.cdn / aws_cloudfront_origin_access_control.frontend` | Global |
| Storage | S3 bucket — CV files | `module.storage / aws_s3_bucket.files` (`coba-files-poc`) | eu-west-2 |
| Storage | S3 bucket — frontend SPA | `module.storage / aws_s3_bucket.frontend` (`coba-frontend-poc`) | eu-west-2 |
| Storage | S3 Gateway VPC Endpoint | `module.storage / aws_vpc_endpoint.s3` | eu-west-2 |
| Compute | EC2 t3.micro instance | `module.compute / aws_instance.backend` (`coba-poc-backend`) | eu-west-2 |
| Compute | EBS 30 GB gp3 volume | `module.compute / aws_ebs_volume.data` (`coba-poc-data`) | eu-west-2a |
| Compute | EBS volume attachment | `module.compute / aws_volume_attachment.data` | eu-west-2 |
| Compute | IAM role — EC2 | `module.compute / aws_iam_role.ec2` (`coba-poc-ec2-role`) | Global |
| Compute | IAM inline policy | `module.compute / aws_iam_role_policy.ec2_permissions` (`coba-poc-ec2-policy`) | Global |
| Compute | IAM instance profile | `module.compute / aws_iam_instance_profile.ec2` (`coba-poc-ec2-profile`) | Global |
| Compute | SSM parameter — Anthropic key | `module.compute / aws_ssm_parameter.anthropic_key` (`/coba/poc/anthropic-key`) | eu-west-2 |
| Compute | SSM parameter — DB path | `module.compute / aws_ssm_parameter.db_path` (`/coba/poc/db-path`) | eu-west-2 |
| Compute | SSM parameter — S3 bucket | `module.compute / aws_ssm_parameter.s3_files_bucket` (`/coba/poc/s3-files-bucket`) | eu-west-2 |
| Networking | Elastic IP | `module.networking / aws_eip.ec2` (`coba-poc-eip`) | eu-west-2 |
| Networking | EIP association | `module.networking / aws_eip_association.ec2` | eu-west-2 |
| Networking | Security group | `module.networking / aws_security_group.ec2` (`coba-poc-ec2-sg`) | eu-west-2 |
| Networking | Route table + association | `module.networking / aws_route_table.public` (`coba-poc-public-rt`) | eu-west-2 |
| Networking | Internet Gateway | `module.networking / aws_internet_gateway.main` (`coba-poc-igw`) | eu-west-2 |
| Networking | Public subnet | `module.networking / aws_subnet.public` (`coba-poc-public`) | eu-west-2a |
| Networking | VPC | `module.networking / aws_vpc.main` (`coba-poc-vpc`) | eu-west-2 |
| IAM | GitHub Actions OIDC role | `module.github_oidc / aws_iam_role.github_actions` (`GitHubActionsDeployRole`) | Global |
| IAM | GitHub Actions inline policy | `module.github_oidc / aws_iam_role_policy.github_actions` | Global |
| IAM | OIDC provider (if created) | `module.github_oidc / aws_iam_openid_connect_provider.github` | Global |
| IAM | EC2 key pair | `aws_key_pair.ec2` (`coba-poc-ec2`) | eu-west-2 |
| State | Terraform state S3 bucket | `terraform/bootstrap` (`coba-terraform-state`) | eu-west-2 |
| State | Terraform DynamoDB lock table | `terraform/bootstrap` (`coba-terraform-locks`) | eu-west-2 |

### Teardown Dependency Order

```
1. CloudFront distribution   ← must be disabled first (takes ~15 min)
2. S3 buckets                ← must be emptied before deletion
3. EC2 instance              ← stop before detaching EBS
4. EBS data volume           ← detach from EC2, then delete
5. Elastic IP                ← release after EC2 is terminated
6. Security group            ← delete after EC2 is gone
7. VPC endpoint (S3 Gateway) ← delete before VPC
8. IAM roles and profiles    ← no dependencies
9. SSM parameters            ← no dependencies
10. EC2 key pair             ← no dependencies
11. Route table + IGW + subnet + VPC  ← inner-to-outer
12. GitHub OIDC IAM role     ← no dependencies
13. Terraform state bucket + DynamoDB ← absolutely last
```

---

## 2. Pre-Decommission Checklist

Complete every item here **before** running any teardown commands.

### 2.1 Data Backup — SQLite Database (EBS)

The SQLite database (`/data/coba.db`) is on the EBS volume. If you need to preserve the data:

```bash
# SSH into the EC2 instance
ssh -i coba-ec2-key.pem ec2-user@<EC2_PUBLIC_IP>

# Create a clean backup copy
sqlite3 /data/coba.db ".backup /data/coba-final-backup-$(date +%F).db"

# Upload the backup to S3 (or copy it locally first)
aws s3 cp /data/coba-final-backup-$(date +%F).db \
  s3://coba-files-poc/backups/coba-final-backup-$(date +%F).db

# OR: copy the backup to your local machine before deleting S3
# (run this on your local machine, not on EC2)
scp -i coba-ec2-key.pem \
  ec2-user@<EC2_PUBLIC_IP>:/data/coba-final-backup-$(date +%F).db \
  ./coba-final-backup.db
```

> If you only care about the schema and not the data, skip this. The in-memory seed data can be regenerated from `backend/src/seed/`.

### 2.2 Data Backup — S3 CV Files

Download any CV PDFs you want to keep before emptying the `coba-files-poc` bucket:

```bash
# Download all CV files to your local machine
aws s3 sync s3://coba-files-poc/cvs/ ./coba-cvs-backup/ \
  --region eu-west-2

# Verify the download completed
ls -lh ./coba-cvs-backup/
```

### 2.3 Confirm No Active Users

```bash
# Check pm2 for any active connections in recent logs
ssh -i coba-ec2-key.pem ec2-user@<EC2_PUBLIC_IP> \
  'pm2 logs coba-backend --lines 50 --nostream'

# Check CloudFront access logs if you enabled them (S3 → logging bucket)
# or just review CloudWatch metrics for recent request counts
```

### 2.4 Notify Stakeholders

- Send a decommission notice with the planned teardown time.
- Confirm no ongoing demos or data imports are in flight.
- Note: the app URL (`https://<xxxx>.cloudfront.net`) will become unreachable once the CloudFront distribution is deleted.

### 2.5 Collect Resource Identifiers

You will need these IDs during teardown. Collect them now:

```bash
cd terraform/environments/poc
terraform output

# Expected outputs:
# elastic_ip           = "x.x.x.x"
# cloudfront_domain    = "xxxx.cloudfront.net"
# cloudfront_dist_id   = "EXXXXXXXXXX"
# files_bucket         = "coba-files-poc"
# frontend_bucket      = "coba-frontend-poc"
# github_actions_role_arn = "arn:aws:iam::ACCOUNT_ID:role/GitHubActionsDeployRole"
```

Save these to a local scratch file. You will also need:

```bash
# EC2 instance ID
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=coba-poc-backend" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text --region eu-west-2

# EBS volume ID (the 30 GB data volume, NOT the 8 GB root volume)
aws ec2 describe-volumes \
  --filters "Name=tag:Name,Values=coba-poc-data" \
  --query "Volumes[0].VolumeId" \
  --output text --region eu-west-2

# Elastic IP allocation ID
aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=coba-poc-eip" \
  --query "Addresses[0].AllocationId" \
  --output text --region eu-west-2
```

---

## 3. Step-by-Step Teardown

> **Recommended approach:** Use `terraform destroy` (see Section 4) for the main infrastructure. The manual AWS CLI steps below are provided as a fallback if Terraform state is lost, or for resources that need manual pre-processing (bucket emptying, CloudFront disable) before Terraform can destroy them.

### 3.1 CloudFront Distribution — Disable then Delete

CloudFront distributions must be **disabled** before they can be deleted. Disabling takes up to 15 minutes to propagate globally.

**Step 1 — Disable the distribution:**

```bash
DIST_ID="EXXXXXXXXXX"   # your distribution ID from terraform output

# Get the current ETag (required for updates)
ETAG=$(aws cloudfront get-distribution --id $DIST_ID \
  --query 'ETag' --output text)

# Get the current config and set Enabled to false
aws cloudfront get-distribution-config --id $DIST_ID \
  --query 'DistributionConfig' > /tmp/cf-config.json

# Edit the config: change "Enabled": true → "Enabled": false
# Using Python for safe JSON manipulation:
python3 -c "
import json, sys
with open('/tmp/cf-config.json') as f:
    cfg = json.load(f)
cfg['Enabled'] = False
print(json.dumps(cfg))
" > /tmp/cf-config-disabled.json

# Apply the disabled config
aws cloudfront update-distribution \
  --id $DIST_ID \
  --distribution-config file:///tmp/cf-config-disabled.json \
  --if-match "$ETAG"
```

**Step 2 — Wait for it to deploy (status: Deployed, Enabled: false):**

```bash
# Poll until Status = Deployed
watch -n 30 "aws cloudfront get-distribution --id $DIST_ID \
  --query 'Distribution.{Status:Status,Enabled:DistributionConfig.Enabled}' \
  --output table"

# Or a one-liner that exits when done (may take 5–15 minutes):
aws cloudfront wait distribution-deployed --id $DIST_ID
```

**Step 3 — Delete the distribution:**

```bash
# Get fresh ETag after the update settled
ETAG=$(aws cloudfront get-distribution --id $DIST_ID \
  --query 'ETag' --output text)

aws cloudfront delete-distribution --id $DIST_ID --if-match "$ETAG"
```

> If you are using `terraform destroy`, Terraform handles the disable/wait/delete sequence automatically (it can be slow — give it 20 minutes).

---

### 3.2 S3 Buckets — Empty then Delete

S3 buckets must be empty before they can be deleted. Terraform **cannot** delete non-empty buckets.

**Frontend bucket (`coba-frontend-poc`):**

```bash
# Remove all objects (versioning was not enabled on this bucket)
aws s3 rm s3://coba-frontend-poc --recursive --region eu-west-2

# Confirm empty
aws s3 ls s3://coba-frontend-poc --region eu-west-2

# Delete the bucket
aws s3api delete-bucket --bucket coba-frontend-poc --region eu-west-2
```

**Files bucket (`coba-files-poc`):**

```bash
# Download backups first if you haven't (see 2.2)

# Remove all objects
aws s3 rm s3://coba-files-poc --recursive --region eu-west-2

# Confirm empty
aws s3 ls s3://coba-files-poc --region eu-west-2

# Delete the bucket
aws s3api delete-bucket --bucket coba-files-poc --region eu-west-2
```

> **Note on bucket versioning:** Versioning was not enabled on either application bucket (only on the Terraform state bucket). If you enabled versioning manually, you must also delete all versions and delete markers before the bucket can be removed:
> ```bash
> # Delete all object versions (if versioning was enabled)
> aws s3api delete-objects \
>   --bucket coba-files-poc \
>   --delete "$(aws s3api list-object-versions \
>     --bucket coba-files-poc \
>     --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
>     --output json)" \
>   --region eu-west-2
> ```

---

### 3.3 EC2 Instance and Elastic IP

**Step 1 — Stop the backend process:**

```bash
# SSH in and stop pm2 gracefully
ssh -i coba-ec2-key.pem ec2-user@<EC2_PUBLIC_IP> \
  'pm2 stop coba-backend && pm2 delete coba-backend && pm2 save'
```

**Step 2 — Terminate the EC2 instance:**

```bash
INSTANCE_ID="i-xxxxxxxxxxxxxxxxx"   # from pre-decommission step 2.5

aws ec2 terminate-instances \
  --instance-ids $INSTANCE_ID \
  --region eu-west-2

# Wait for the instance to fully terminate (2–3 minutes)
aws ec2 wait instance-terminated \
  --instance-ids $INSTANCE_ID \
  --region eu-west-2

echo "EC2 instance terminated"
```

**Step 3 — Release the Elastic IP:**

The Elastic IP accrues charges (~$3.60/month) when **not** attached to a running instance. Release it immediately after termination.

```bash
ALLOC_ID="eipalloc-xxxxxxxxxxxxxxxxx"   # from pre-decommission step 2.5

aws ec2 release-address \
  --allocation-id $ALLOC_ID \
  --region eu-west-2
```

---

### 3.4 EBS Data Volume

The EBS data volume (`coba-poc-data`, 30 GB gp3) is separate from the EC2 root volume. The root volume is configured with `delete_on_termination = true` and is deleted automatically when the instance terminates. The data volume is **not** and must be deleted manually.

```bash
VOLUME_ID="vol-xxxxxxxxxxxxxxxxx"   # from pre-decommission step 2.5

# Confirm the volume is no longer attached (state should be "available")
aws ec2 describe-volumes \
  --volume-ids $VOLUME_ID \
  --query "Volumes[0].{State:State,Attachments:Attachments}" \
  --output table --region eu-west-2

# Delete the volume
aws ec2 delete-volume --volume-id $VOLUME_ID --region eu-west-2
```

> **EBS snapshots:** If you enabled AWS Backup or created manual EBS snapshots, list and delete them too:
> ```bash
> # List snapshots for this volume
> aws ec2 describe-snapshots \
>   --filters "Name=volume-id,Values=$VOLUME_ID" \
>   --query "Snapshots[*].{SnapshotId:SnapshotId,StartTime:StartTime}" \
>   --output table --region eu-west-2
>
> # Delete each snapshot
> aws ec2 delete-snapshot --snapshot-id snap-xxxxxxxxxxxxxxxxx --region eu-west-2
> ```

---

### 3.5 Security Group

The security group (`coba-poc-ec2-sg`) cannot be deleted while any network interface or instance still references it. After the EC2 instance is terminated, it can be removed.

```bash
# Find the security group ID
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=coba-poc-ec2" \
  --query "SecurityGroups[0].GroupId" \
  --output text --region eu-west-2)

echo "Deleting security group: $SG_ID"
aws ec2 delete-security-group --group-id $SG_ID --region eu-west-2
```

---

### 3.6 S3 Gateway VPC Endpoint

The VPC endpoint must be deleted before the VPC can be destroyed.

```bash
# Find the endpoint ID
ENDPOINT_ID=$(aws ec2 describe-vpc-endpoints \
  --filters "Name=tag:Name,Values=coba-poc-s3-endpoint" \
  --query "VpcEndpoints[0].VpcEndpointId" \
  --output text --region eu-west-2)

aws ec2 delete-vpc-endpoints \
  --vpc-endpoint-ids $ENDPOINT_ID \
  --region eu-west-2
```

---

### 3.7 VPC, Subnets, Internet Gateway, Route Tables

These must be deleted inner-to-outer. If you are using `terraform destroy` these are handled automatically.

```bash
# Get VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=coba-poc-vpc" \
  --query "Vpcs[0].VpcId" \
  --output text --region eu-west-2)

echo "VPC: $VPC_ID"

# 1. Delete the route table association and route table
RT_ID=$(aws ec2 describe-route-tables \
  --filters "Name=tag:Name,Values=coba-poc-public-rt" \
  --query "RouteTables[0].RouteTableId" \
  --output text --region eu-west-2)

ASSOC_ID=$(aws ec2 describe-route-tables \
  --route-table-ids $RT_ID \
  --query "RouteTables[0].Associations[0].RouteTableAssociationId" \
  --output text --region eu-west-2)

aws ec2 disassociate-route-table --association-id $ASSOC_ID --region eu-west-2
aws ec2 delete-route-table --route-table-id $RT_ID --region eu-west-2

# 2. Detach and delete the Internet Gateway
IGW_ID=$(aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
  --query "InternetGateways[0].InternetGatewayId" \
  --output text --region eu-west-2)

aws ec2 detach-internet-gateway \
  --internet-gateway-id $IGW_ID \
  --vpc-id $VPC_ID \
  --region eu-west-2

aws ec2 delete-internet-gateway \
  --internet-gateway-id $IGW_ID \
  --region eu-west-2

# 3. Delete the subnet
SUBNET_ID=$(aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=coba-poc-public" \
  --query "Subnets[0].SubnetId" \
  --output text --region eu-west-2)

aws ec2 delete-subnet --subnet-id $SUBNET_ID --region eu-west-2

# 4. Delete the VPC itself
aws ec2 delete-vpc --vpc-id $VPC_ID --region eu-west-2
```

---

### 3.8 IAM — EC2 Role, Instance Profile, and Policies

Inline policies are deleted automatically when the role is deleted. The instance profile must be detached from the role before either can be deleted.

```bash
# Remove role from instance profile
aws iam remove-role-from-instance-profile \
  --instance-profile-name coba-poc-ec2-profile \
  --role-name coba-poc-ec2-role

# Delete the instance profile
aws iam delete-instance-profile \
  --instance-profile-name coba-poc-ec2-profile

# Delete the inline policy attached to the role
aws iam delete-role-policy \
  --role-name coba-poc-ec2-role \
  --policy-name coba-poc-ec2-policy

# Delete the role
aws iam delete-role --role-name coba-poc-ec2-role
```

---

### 3.9 IAM — GitHub Actions OIDC Role

```bash
# Delete the inline policy
aws iam delete-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-name GitHubActionsDeployPolicy

# Delete the role
aws iam delete-role --role-name GitHubActionsDeployRole

# Delete the OIDC provider (only if this was the only repo using it)
# WARNING: if other repositories in this AWS account use GitHub OIDC, skip this step.
OIDC_ARN=$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?ends_with(Arn,'token.actions.githubusercontent.com')].Arn" \
  --output text)

echo "OIDC provider ARN: $OIDC_ARN"
# Only delete if you are sure no other repos use this provider:
# aws iam delete-open-id-connect-provider --open-id-connect-provider-arn $OIDC_ARN
```

---

### 3.10 EC2 Key Pair

```bash
aws ec2 delete-key-pair --key-name coba-poc-ec2 --region eu-west-2
```

Also delete the local private key file:

```bash
# On your local machine
rm -f coba-ec2-key.pem
```

---

### 3.11 SSM Parameter Store Parameters

```bash
# Delete all three parameters
aws ssm delete-parameters \
  --names \
    "/coba/poc/anthropic-key" \
    "/coba/poc/db-path" \
    "/coba/poc/s3-files-bucket" \
  --region eu-west-2

# Confirm deletion
aws ssm get-parameters-by-path \
  --path "/coba/poc" \
  --region eu-west-2 \
  --query "Parameters[*].Name"
# Expected: []
```

---

### 3.12 CloudWatch Log Groups (if created)

If the CloudWatch agent was configured on EC2 to ship pm2 logs, delete the log group:

```bash
# Check for log groups under /coba/
aws logs describe-log-groups \
  --log-group-name-prefix "/coba/" \
  --query "logGroups[*].logGroupName" \
  --output table --region eu-west-2

# Delete if present
aws logs delete-log-group --log-group-name "/coba/backend" --region eu-west-2
```

---

### 3.13 ACM Certificate

The actual CDN module in `terraform/modules/cdn/main.tf` uses the **default CloudFront certificate** (`cloudfront_default_certificate = true`), so **no ACM certificate was provisioned for this stack**. The planning docs mentioned an ACM cert option, but the actual Terraform code does not create one.

If you manually provisioned a certificate outside of Terraform:

```bash
# List certificates in us-east-1 (required region for CloudFront certs)
aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?contains(DomainName,'your-domain.com')]"

# Delete the certificate
aws acm delete-certificate \
  --certificate-arn arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/xxxxx \
  --region us-east-1
```

---

### 3.14 Terraform State Bucket and DynamoDB Lock Table — LAST

These resources were created by `terraform/bootstrap/` and are **not** managed by the poc environment's `terraform destroy`. Delete them manually after everything else is confirmed gone.

> Do this **last** — once the state bucket is deleted, you lose the record of what Terraform managed.

**Empty and delete the state bucket:**

```bash
# The state bucket has versioning enabled — must delete all versions
STATE_BUCKET="coba-terraform-state"

# Delete all object versions
aws s3api list-object-versions \
  --bucket $STATE_BUCKET \
  --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
  --output json > /tmp/versions.json

# Only run if versions.json is non-empty:
aws s3api delete-objects \
  --bucket $STATE_BUCKET \
  --delete file:///tmp/versions.json \
  --region eu-west-2

# Delete all delete markers
aws s3api list-object-versions \
  --bucket $STATE_BUCKET \
  --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' \
  --output json > /tmp/markers.json

# Only run if markers.json is non-empty:
aws s3api delete-objects \
  --bucket $STATE_BUCKET \
  --delete file:///tmp/markers.json \
  --region eu-west-2

# Delete the now-empty bucket
aws s3api delete-bucket --bucket $STATE_BUCKET --region eu-west-2
```

**Delete the DynamoDB lock table:**

```bash
aws dynamodb delete-table \
  --table-name coba-terraform-locks \
  --region eu-west-2
```

---

## 4. Terraform Destroy — Recommended Approach

If the Terraform state file is intact and in the S3 backend, using `terraform destroy` is the cleanest approach. It will destroy all resources it provisioned and handle dependency ordering automatically.

### When to Use `terraform destroy`

Use `terraform destroy` when:
- The `terraform/environments/poc` state in `s3://coba-terraform-state/poc/terraform.tfstate` is current and uncorrupted.
- You have not manually created or deleted any resources outside of Terraform.

Use **manual AWS CLI steps** when:
- The state bucket is already deleted.
- State has drifted significantly from reality (resources were manually modified or deleted).
- A specific resource (like a non-empty S3 bucket) is blocking `terraform destroy` from proceeding.

### Pre-destroy: Empty S3 Buckets

`terraform destroy` will fail on non-empty S3 buckets. Empty them first (Section 3.2), then run destroy:

```bash
# 1. Empty both application buckets first (see Section 3.2)
aws s3 rm s3://coba-files-poc --recursive --region eu-west-2
aws s3 rm s3://coba-frontend-poc --recursive --region eu-west-2

# 2. Navigate to the poc environment
cd terraform/environments/poc

# 3. Ensure you have valid AWS credentials
aws sts get-caller-identity

# 4. Run destroy — review the plan carefully before confirming
terraform destroy \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="anthropic_api_key=placeholder"
```

Terraform will prompt you to type `yes`. Type it only after reviewing the plan output to confirm it is destroying the correct resources.

### Module Destroy Order (if targeting individually)

If you need to destroy modules one at a time (e.g., debugging a partial failure):

```bash
# Destroy CDN first (depends on storage and compute outputs)
terraform destroy -target=module.cdn \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="anthropic_api_key=placeholder"

# Then storage (depends on networking VPC ID)
terraform destroy -target=module.storage \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="anthropic_api_key=placeholder"

# Then compute (IAM, SSM, EC2, EBS)
terraform destroy -target=module.compute \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="anthropic_api_key=placeholder"

# Then networking (VPC, subnets, IGW, SG, EIP)
terraform destroy -target=module.networking \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="anthropic_api_key=placeholder"

# Then GitHub OIDC IAM
terraform destroy -target=module.github_oidc \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="anthropic_api_key=placeholder"

# Then the key pair (managed at the poc root, not in a module)
terraform destroy -target=aws_key_pair.ec2 \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="anthropic_api_key=placeholder"
```

After all poc resources are destroyed, manually delete the bootstrap resources (Section 3.14).

### Post-destroy: Destroy the Bootstrap

The bootstrap (`terraform/bootstrap/`) is a separate root module. Destroy it last:

```bash
# Only after the poc environment state bucket reference is gone
cd terraform/bootstrap
terraform init    # re-initialise with local state (bootstrap used local state)
terraform destroy
```

> The bootstrap module stores its own state in `terraform/bootstrap/terraform.tfstate` (local). Delete this file and the `.terraform/` directory after bootstrap is destroyed.

---

## 5. GitHub Cleanup — Remove Secrets and Variables

After the AWS infrastructure is gone, remove the repository secrets and variables so that the deploy workflow cannot accidentally run against a non-existent environment.

### Remove GitHub Actions Secrets

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions**:

| What to remove | Type | Name |
|----------------|------|------|
| EC2 SSH private key | Secret | `EC2_SSH_PRIVATE_KEY` |

Click the trash icon next to each secret and confirm deletion.

### Remove GitHub Actions Variables

| What to remove | Type | Name |
|----------------|------|------|
| AWS account ID | Variable | `AWS_ACCOUNT_ID` |
| EC2 public IP (Elastic IP) | Variable | `EC2_PUBLIC_IP` |
| Frontend S3 bucket name | Variable | `FRONTEND_BUCKET_NAME` |
| CloudFront distribution ID | Variable | `CLOUDFRONT_DISTRIBUTION_ID` |

### Disable or Delete the Deploy Workflow

The deploy workflow (`.github/workflows/deploy.yml`) will fail immediately on push to `main` if the secrets and variables above have been removed — this is safe and will produce clear error messages. Optionally, delete or disable the workflow file:

```bash
# Option A: Delete the workflow file entirely
git rm .github/workflows/deploy.yml
git commit -m "Remove AWS deploy workflow (infrastructure decommissioned)"
git push

# Option B: Rename to prevent accidental triggers
mv .github/workflows/deploy.yml .github/workflows/deploy.yml.disabled
git add -A && git commit -m "Disable AWS deploy workflow" && git push
```

---

## 6. Cost Verification — Confirm $0 Ongoing Charges

After teardown, verify that all metered resources are gone and no surprise charges will appear.

### 6.1 AWS Cost Explorer

1. Go to **AWS Console → Billing → Cost Explorer**.
2. Set the date range to cover today and the next 7 days (or use "Last 30 days" after the next billing cycle).
3. Group by **Service** — all COBA-related lines (EC2, EBS, S3, CloudFront, VPC) should show $0 for the period after the teardown date.

```bash
# CLI: Check current month costs by service
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query "ResultsByTime[0].Groups[?Metrics.BlendedCost.Amount != '0'].{Service:Keys[0],Cost:Metrics.BlendedCost.Amount}" \
  --output table
```

### 6.2 Check for Lingering EIPs (Most Likely Source of Surprise Charges)

Unattached Elastic IPs cost ~$3.60/month each:

```bash
aws ec2 describe-addresses \
  --query "Addresses[?AssociationId==null].{AllocationId:AllocationId,IP:PublicIp}" \
  --output table --region eu-west-2
# Expected output: empty table
```

### 6.3 Check for Lingering EBS Volumes

Unattached EBS volumes still incur storage charges:

```bash
aws ec2 describe-volumes \
  --filters "Name=status,Values=available" \
  --query "Volumes[*].{VolumeId:VolumeId,Size:Size,Name:Tags[?Key=='Name'].Value|[0]}" \
  --output table --region eu-west-2
# Expected output: empty table (or only volumes for other projects)
```

### 6.4 Check for Lingering EC2 Instances

```bash
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running,stopped,stopping,pending" \
  "Name=tag:Name,Values=coba-*" \
  --query "Reservations[*].Instances[*].{ID:InstanceId,State:State.Name,Name:Tags[?Key=='Name'].Value|[0]}" \
  --output table --region eu-west-2
# Expected output: empty table
```

### 6.5 Check for Orphaned CloudFront Distributions

```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='coba-poc-cdn' || contains(Origins.Items[0].DomainName,'coba')].{Id:Id,Status:Status,Enabled:Enabled}" \
  --output table
# Expected output: empty table
```

### 6.6 Set a Billing Alert

Create a $1 billing alert as a safety net to catch any unexpected charges:

```bash
# Create a billing alarm (requires CloudWatch in us-east-1)
aws cloudwatch put-metric-alarm \
  --alarm-name "coba-unexpected-charges" \
  --alarm-description "Alert if any AWS charges appear after COBA decommission" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 1.00 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:billing-alerts \
  --dimensions Name=Currency,Value=USD \
  --region us-east-1
```

> **Note:** The `EstimatedCharges` metric is only available in `us-east-1` regardless of where your resources were deployed.

---

## 7. What to Keep — Do NOT Delete

### Route 53 Hosted Zone

The CDN module in the planning docs mentions a Route 53 hosted zone and A record pointing the custom domain to CloudFront. The **actual** deployed Terraform (`terraform/modules/cdn/main.tf`) uses the default `*.cloudfront.net` certificate (no custom domain, no Route 53 records). So there is **no Route 53 hosted zone created by this stack** to worry about.

If you manually created a Route 53 hosted zone for this project (outside of Terraform):
- Keep the hosted zone if the domain is used by anything else (email, other apps).
- Delete only the A record that pointed to the CloudFront distribution.
- **Do not delete the hosted zone** if it contains MX, TXT, or other records for the domain.
- Note that Route 53 hosted zones cost $0.50/month each — there is no cost to keeping an empty one accidentally.

### GitHub OIDC Provider

The IAM OIDC provider for GitHub Actions (`token.actions.githubusercontent.com`) may be shared with other repositories in the same AWS account. Before deleting it (Section 3.9), check:

```bash
# List all roles that trust the GitHub OIDC provider
aws iam list-roles \
  --query "Roles[?contains(AssumeRolePolicyDocument.Statement[0].Principal.Federated,'token.actions.githubusercontent.com')].RoleName" \
  --output table
```

If other roles appear, **keep the OIDC provider** and only delete the `GitHubActionsDeployRole`.

### Terraform Local Files

The files in `terraform/` are source code and are already in git. They do not need to be deleted. You may want to archive or tag the repo to mark the point at which the infrastructure was decommissioned.

---

## 8. Quick-Reference Checklist

Use this as a final confirmation checklist after teardown:

- [ ] SQLite database backed up locally (`coba-final-backup.db`)
- [ ] S3 CV files downloaded locally (`./coba-cvs-backup/`)
- [ ] CloudFront distribution deleted (not just disabled)
- [ ] `coba-frontend-poc` S3 bucket emptied and deleted
- [ ] `coba-files-poc` S3 bucket emptied and deleted
- [ ] EC2 instance terminated
- [ ] EBS data volume (30 GB) deleted
- [ ] EBS snapshots deleted (if any)
- [ ] Elastic IP released (no unattached EIPs)
- [ ] Security group `coba-poc-ec2-sg` deleted
- [ ] S3 Gateway VPC endpoint deleted
- [ ] Route table, Internet Gateway, subnet, VPC deleted
- [ ] IAM role `coba-poc-ec2-role` and instance profile deleted
- [ ] IAM role `GitHubActionsDeployRole` deleted
- [ ] IAM OIDC provider deleted (or confirmed kept for other repos)
- [ ] EC2 key pair `coba-poc-ec2` deleted
- [ ] SSM parameters `/coba/poc/*` deleted (all 3)
- [ ] CloudWatch log groups under `/coba/` deleted (if present)
- [ ] Terraform state S3 bucket `coba-terraform-state` emptied and deleted
- [ ] DynamoDB table `coba-terraform-locks` deleted
- [ ] GitHub secret `EC2_SSH_PRIVATE_KEY` removed
- [ ] GitHub Actions variables removed (`EC2_PUBLIC_IP`, `CLOUDFRONT_DISTRIBUTION_ID`, etc.)
- [ ] Deploy workflow disabled or deleted
- [ ] Cost Explorer verified: $0 charges for all COBA resources
- [ ] No unattached Elastic IPs remaining
- [ ] Billing alert set to catch any unexpected charges
