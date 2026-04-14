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

variable "deploy_branch" {
  type        = string
  default     = "main"
  description = "Git branch that is allowed to assume the deploy role (e.g. main)"
}

variable "create_oidc_provider" {
  type        = bool
  default     = true
  description = "Set to false if the GitHub OIDC provider already exists in this AWS account"
}
