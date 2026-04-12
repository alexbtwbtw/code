variable "ec2_origin_domain" {
  type        = string
  description = "DNS hostname of the EC2 Elastic IP — used as CloudFront backend origin"
}

variable "frontend_bucket_regional_domain" {
  type = string
}
