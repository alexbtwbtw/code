output "elastic_ip" {
  value = module.networking.elastic_ip
}

output "cloudfront_domain" {
  value = module.cdn.distribution_domain
}

output "cloudfront_dist_id" {
  value = module.cdn.distribution_id
}

output "files_bucket" {
  value = module.storage.files_bucket_name
}

output "frontend_bucket" {
  value = module.storage.frontend_bucket_name
}

output "ec2_private_key" {
  description = "Private SSH key for EC2 access — save this to coba-ec2-key.pem"
  value       = tls_private_key.ec2.private_key_openssh
  sensitive   = true
}
