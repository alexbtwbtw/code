variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "account_id" {
  type        = string
  description = "12-digit AWS account ID"
}

variable "deploy_ssh_cidr" {
  type        = string
  description = "CIDR allowed to SSH — restrict to your IP or GitHub Actions IPs in production"
  default     = "0.0.0.0/0"
}

variable "files_bucket_name" {
  type    = string
  default = "coba-files-poc"
}

variable "frontend_bucket_name" {
  type    = string
  default = "coba-frontend-poc"
}

variable "anthropic_api_key" {
  type        = string
  sensitive   = true
  description = "Pass via TF_VAR_anthropic_api_key env var — never hardcode"
}
