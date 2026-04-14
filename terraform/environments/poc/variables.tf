variable "region" {
  type    = string
  default = "eu-west-2"
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
