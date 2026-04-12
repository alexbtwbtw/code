variable "region"                      { type = string }
variable "vpc_id"                      { type = string }
variable "public_route_table_id"       { type = string }
variable "files_bucket_name"           { type = string }
variable "frontend_bucket_name"        { type = string }
variable "domain_name"                 { type = string }
variable "cloudfront_distribution_arn" { type = string; default = "" }
