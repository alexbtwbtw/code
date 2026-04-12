variable "region" {
  type = string
}

variable "public_subnet_id" {
  type = string
}

variable "ec2_sg_id" {
  type = string
}

variable "ssh_key_name" {
  type        = string
  description = "Name of the EC2 key pair for SSH access"
}

variable "files_bucket_name" {
  type = string
}

variable "anthropic_api_key" {
  type        = string
  sensitive   = true
  description = "Anthropic API key — pass via TF_VAR_anthropic_api_key env var, never hardcode"
}
