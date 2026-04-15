resource "aws_s3_bucket" "files" {
  bucket = var.files_bucket_name
  tags   = { Name = "coba-poc-files" }
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket                  = aws_s3_bucket.files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "files" {
  bucket = aws_s3_bucket.files.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    # Allow any origin since the CloudFront domain isn't known at plan time.
    # The bucket is private — CORS only applies to presigned URL requests from the browser.
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
  tags   = { Name = "coba-poc-frontend" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Gateway VPC Endpoint — keeps EC2↔S3 traffic on AWS backbone (free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [var.public_route_table_id]
  tags              = { Name = "coba-poc-s3-endpoint" }
}
