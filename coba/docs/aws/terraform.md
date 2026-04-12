<!-- Source: docs/AWS_DEPLOYMENT_PLAN.md — Section 8: Terraform Structure -->

# AWS Deployment — Terraform

## 8. Terraform Structure

```
terraform/
  modules/
    networking/    ← VPC, public subnet, IGW, route table, security groups, Elastic IP
    storage/       ← S3 buckets (files + frontend), CORS, lifecycle, S3 Gateway VPC endpoint
    compute/       ← EC2 instance, EBS volume, IAM instance role + policies, SSM parameters
    cdn/           ← CloudFront distribution, ACM cert (us-east-1), Route 53 records
  environments/
    poc/
      main.tf      ← instantiates all modules
      variables.tf
      outputs.tf
      backend.tf   ← S3 backend + DynamoDB lock table
```

No `modules/database/` — SQLite on EC2. No `modules/iam/` separate from compute — the EC2 instance role lives in `modules/compute/`.

### Key Terraform Resources

#### `modules/networking/main.tf`

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "coba-poc-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.0.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = false  # we use an Elastic IP instead
  tags = { Name = "coba-poc-public" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "ec2" {
  name   = "coba-poc-ec2"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "API traffic from CloudFront"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  ingress {
    description = "SSH for deploys"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.deploy_ssh_cidr]  # restrict to your IP or GitHub Actions CIDR
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_eip" "ec2" {
  domain = "vpc"
  tags = { Name = "coba-poc-ec2-eip" }
}

resource "aws_eip_association" "ec2" {
  instance_id   = var.ec2_instance_id  # passed in from compute module
  allocation_id = aws_eip.ec2.id
}
```

#### `modules/compute/main.tf`

```hcl
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}

resource "aws_iam_role" "ec2" {
  name = "coba-poc-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ec2_permissions" {
  name = "coba-poc-ec2-policy"
  role = aws_iam_role.ec2.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # S3 access for CV files
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.files_bucket_name}",
          "arn:aws:s3:::${var.files_bucket_name}/*"
        ]
      },
      {
        # SSM Parameter Store for secrets
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = "arn:aws:ssm:${var.region}:${var.account_id}:parameter/coba/poc/*"
      },
      {
        # CloudWatch Logs
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.region}:${var.account_id}:log-group:/coba/*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "coba-poc-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = "t2.micro"
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [var.ec2_sg_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.ssh_key_name

  root_block_device {
    volume_size           = 8
    volume_type           = "gp2"
    delete_on_termination = true
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Install Node.js 22
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs

    # Install pm2
    npm install -g pm2

    # Mount data volume (assumes /dev/xvdf is the EBS data volume)
    mkdir -p /data
    if ! blkid /dev/xvdf; then
      mkfs.ext4 /dev/xvdf
    fi
    echo '/dev/xvdf /data ext4 defaults,nofail 0 2' >> /etc/fstab
    mount -a

    # Create app directory
    mkdir -p /app
    mkdir -p /var/log/coba
  EOF

  tags = { Name = "coba-poc-backend" }
}

resource "aws_ebs_volume" "data" {
  availability_zone = "${var.region}a"
  size              = 30
  type              = "gp2"
  tags = { Name = "coba-poc-data" }
}

resource "aws_volume_attachment" "data" {
  device_name  = "/dev/xvdf"
  volume_id    = aws_ebs_volume.data.id
  instance_id  = aws_instance.backend.id
  # stop_instance_before_detaching = true  # uncomment if needed
}

resource "aws_ssm_parameter" "anthropic_key" {
  name  = "/coba/poc/anthropic-key"
  type  = "SecureString"
  value = var.anthropic_api_key  # passed in via TF_VAR_anthropic_api_key env var, never in code
}

resource "aws_ssm_parameter" "db_path" {
  name  = "/coba/poc/db-path"
  type  = "String"
  value = "/data/coba.db"
}

resource "aws_ssm_parameter" "s3_files_bucket" {
  name  = "/coba/poc/s3-files-bucket"
  type  = "String"
  value = var.files_bucket_name
}
```

#### `modules/storage/main.tf`

```hcl
resource "aws_s3_bucket" "files" {
  bucket = var.files_bucket_name
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
    allowed_origins = ["https://${var.domain_name}"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Allow CloudFront OAC to read the frontend bucket
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = var.cloudfront_distribution_arn
        }
      }
    }]
  })
}

# S3 Gateway VPC Endpoint (free — keeps S3 traffic on AWS network)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [var.public_route_table_id]
  tags = { Name = "coba-poc-s3-endpoint" }
}
```

#### `modules/cdn/main.tf`

```hcl
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "coba-poc-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]
  price_class         = "PriceClass_100"  # US, Canada, Europe only — reduces cost

  # Origin 1: EC2 backend
  origin {
    origin_id   = "ec2-backend"
    domain_name = var.ec2_public_dns  # e.g. ec2-1-2-3-4.eu-west-1.compute.amazonaws.com
    custom_origin_config {
      http_port              = 3000
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Origin 2: S3 frontend
  origin {
    origin_id                = "s3-frontend"
    domain_name              = var.frontend_bucket_regional_domain
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # Behavior: /api/* → EC2
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ec2-backend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled managed policy
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"  # AllViewerExceptHostHeader
  }

  # Behavior: /trpc/* → EC2
  ordered_cache_behavior {
    path_pattern           = "/trpc/*"
    target_origin_id       = "ec2-backend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  }

  # Default behavior: /* → S3 frontend
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # CachingOptimized
    compress               = true
  }

  # SPA routing: 403/404 from S3 → serve index.html
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }
}

# ACM cert must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "main" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "main" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

resource "aws_route53_record" "app" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}
```

### Terraform State Backend

```hcl
# environments/poc/backend.tf
terraform {
  backend "s3" {
    bucket         = "coba-terraform-state"
    key            = "poc/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "coba-terraform-locks"
  }
}
```

Create the state bucket and DynamoDB table manually before `terraform init`. The state bucket itself does not count toward the "coba-files" bucket limits.
