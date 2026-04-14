variable "region" {
  type        = string
  description = "AWS region"
}

variable "ec2_instance_id" {
  type        = string
  description = "ID of the EC2 instance to associate the Elastic IP with"
}
