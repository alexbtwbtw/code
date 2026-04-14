#!/bin/bash
# Usage: ./scripts/run-on-ec2.sh <script-to-run>
# Example: ./scripts/run-on-ec2.sh scripts/install-nginx.sh
# Run from repo root.
set -e

SCRIPT=${1:?Usage: $0 <script-path>}
REGION=eu-west-2
TF_DIR=terraform/environments/poc

INSTANCE_ID=$(terraform -chdir="$TF_DIR" output -raw ec2_instance_id)
FILES_BUCKET=$(terraform -chdir="$TF_DIR" output -raw files_bucket)

echo "Instance:  $INSTANCE_ID"
echo "Bucket:    $FILES_BUCKET"
echo "Script:    $SCRIPT"
echo ""

aws s3 cp "$SCRIPT" "s3://${FILES_BUCKET}/scripts/$(basename $SCRIPT)" --region "$REGION"

COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --region "$REGION" \
  --parameters "commands=[\"aws s3 cp s3://${FILES_BUCKET}/scripts/$(basename $SCRIPT) /tmp/$(basename $SCRIPT) && bash /tmp/$(basename $SCRIPT)\"]" \
  --query "Command.CommandId" \
  --output text)

echo "Command ID: $COMMAND_ID"
echo ""
echo "Polling for result..."

for i in $(seq 1 60); do
  RESULT=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query "[Status,StandardOutputContent,StandardErrorContent]" \
    --output text 2>/dev/null || echo "Pending		")

  STATUS=$(echo "$RESULT" | cut -f1)
  echo "[$i/60] $STATUS"

  case "$STATUS" in
    Success)
      echo ""
      echo "=== Output ==="
      echo "$RESULT" | cut -f2
      exit 0
      ;;
    Failed|Cancelled|TimedOut)
      echo ""
      echo "=== Error ==="
      echo "$RESULT" | cut -f3
      exit 1
      ;;
  esac

  sleep 5
done

echo "Timed out waiting for command."
exit 1
