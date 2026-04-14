variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "deploy_ssh_cidr" {
  type        = string
  description = "CIDR allowed to SSH into the EC2 instance. Use your IP in CIDR notation (e.g. 1.2.3.4/32). Never use 0.0.0.0/0 in production."

  validation {
    condition     = var.deploy_ssh_cidr != "0.0.0.0/0"
    error_message = "deploy_ssh_cidr must not be 0.0.0.0/0 — supply a specific IP/CIDR (e.g. your workstation IP as 1.2.3.4/32)."
  }
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

variable "github_repo" {
  type        = string
  description = "GitHub repo in owner/name format, e.g. alexbtwbtw/code"
}
