variable "github_repo" {
  type        = string
  description = "GitHub repo in owner/name format, e.g. alexbtwbtw/code"
}

variable "frontend_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for frontend assets"
}

variable "create_oidc_provider" {
  type        = bool
  default     = true
  description = "Set to false if the GitHub OIDC provider already exists in this AWS account"
}
