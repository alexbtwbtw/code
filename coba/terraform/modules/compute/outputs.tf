output "instance_id"  { value = aws_instance.backend.id }
output "public_dns"   { value = aws_instance.backend.public_dns }
output "iam_role_arn" { value = aws_iam_role.ec2.arn }
