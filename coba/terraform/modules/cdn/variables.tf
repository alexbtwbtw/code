variable "ec2_public_ip" {
  type        = string
  description = "Elastic IP of the EC2 instance — used as CloudFront backend origin"
}

variable "frontend_bucket_regional_domain" {
  type = string
}
