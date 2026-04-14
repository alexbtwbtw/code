# Usage: .\scripts\run-on-ec2.ps1 <script-path>
# Example: .\scripts\run-on-ec2.ps1 scripts\update-nginx.sh
# Run from repo root.
param(
    [Parameter(Mandatory)][string]$Script
)

$ErrorActionPreference = "Stop"
$Region = "eu-west-2"
$TfDir = "terraform/environments/poc"

$InstanceId = terraform -chdir="$TfDir" output -raw ec2_instance_id
$FilesBucket = terraform -chdir="$TfDir" output -raw files_bucket
$ScriptName = Split-Path $Script -Leaf

Write-Host "Instance:  $InstanceId"
Write-Host "Bucket:    $FilesBucket"
Write-Host "Script:    $Script"
Write-Host ""

aws s3 cp $Script "s3://$FilesBucket/scripts/$ScriptName" --region $Region

$CommandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --region $Region `
    --parameters "commands=[`"aws s3 cp s3://$FilesBucket/scripts/$ScriptName /tmp/$ScriptName && bash /tmp/$ScriptName`"]" `
    --query "Command.CommandId" `
    --output text

Write-Host "Command ID: $CommandId"
Write-Host ""
Write-Host "Polling for result..."

for ($i = 1; $i -le 60; $i++) {
    Start-Sleep -Seconds 5

    try {
        $Status = & aws ssm get-command-invocation --command-id $CommandId --instance-id $InstanceId --region $Region --query "Status" --output text 2>$null
        if (-not $Status) { $Status = "Pending" }
    } catch {
        $Status = "Pending"
    }

    Write-Host "[$i/60] $Status"

    if ($Status -eq "Success") {
        Write-Host ""
        Write-Host "=== Done ==="
        exit 0
    } elseif ($Status -in @("Failed", "Cancelled", "TimedOut")) {
        Write-Host ""
        Write-Host "=== Failed - fetching error output ==="
        & aws ssm get-command-invocation --command-id $CommandId --instance-id $InstanceId --region $Region --query "StandardErrorContent" --output text 2>$null
        exit 1
    }
}

Write-Host "Timed out waiting for command."
exit 1
