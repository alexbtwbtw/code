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

output "ec2_instance_id" {
  description = "Add this as the EC2_INSTANCE_ID variable in your GitHub repo environment"
  value       = module.compute.instance_id
}

output "github_actions_role_arn" {
  description = "Add this as the AWS_DEPLOY_ROLE_ARN variable in your GitHub repo"
  value       = module.github_oidc.role_arn
}
