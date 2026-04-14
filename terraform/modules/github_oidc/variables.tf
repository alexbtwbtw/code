variable "github_repo" {
  type        = string
  description = "GitHub repo in owner/name format, e.g. alexbtwbtw/code"
}

variable "frontend_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for frontend assets"
}

variable "cloudfront_distribution_arn" {
  type        = string
  description = "ARN of the CloudFront distribution this role is allowed to invalidate"
}

variable "files_bucket_name" {
  type        = string
  description = "Name of the S3 files bucket, used to upload backend deployment artifacts"
}

variable "ec2_instance_arn" {
  type        = string
  description = "ARN of the EC2 instance that SSM send-command is scoped to"
}

variable "environment_name" {
  type        = string
  description = "GitHub Actions environment name (e.g. poc). Jobs using this environment send sub=repo:owner/repo:environment:NAME."
}

variable "create_oidc_provider" {
  type        = bool
  default     = true
  description = "Set to false if the GitHub OIDC provider already exists in this AWS account"
}
