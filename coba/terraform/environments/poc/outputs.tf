output "elastic_ip"         { value = module.networking.elastic_ip }
output "cloudfront_domain"  { value = module.cdn.distribution_domain }
output "cloudfront_dist_id" { value = module.cdn.distribution_id }
output "files_bucket"       { value = module.storage.files_bucket_name }
output "frontend_bucket"    { value = module.storage.frontend_bucket_name }
