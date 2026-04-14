output "instance_id"  { value = aws_instance.backend.id }
output "instance_arn" { value = "arn:aws:ec2:${var.region}:${data.aws_caller_identity.current.account_id}:instance/${aws_instance.backend.id}" }
output "iam_role_arn" { value = aws_iam_role.ec2.arn }
