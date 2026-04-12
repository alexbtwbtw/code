output "files_bucket_name"               { value = aws_s3_bucket.files.bucket }
output "frontend_bucket_name"            { value = aws_s3_bucket.frontend.bucket }
output "frontend_bucket_regional_domain" { value = aws_s3_bucket.frontend.bucket_regional_domain_name }
output "frontend_bucket_arn"             { value = aws_s3_bucket.frontend.arn }
