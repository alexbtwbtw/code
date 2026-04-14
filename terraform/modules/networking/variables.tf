variable "region" {
  type        = string
  description = "AWS region"
}

variable "deploy_ssh_cidr" {
  type        = string
  description = "CIDR allowed to SSH to EC2 (e.g. your IP /32 or GitHub Actions IP ranges)"
}

variable "ec2_instance_id" {
  type        = string
  description = "ID of the EC2 instance to associate the Elastic IP with"
}
