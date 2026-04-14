resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "coba-poc-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Rewrites directory-style paths to their index.html:
#   /game        → /game/index.html
#   /game/       → /game/index.html
#   /game/<route> (no extension) → /game/index.html  (game SPA routing)
# All other paths pass through unchanged (COBA SPA handled by custom_error_response).
resource "aws_cloudfront_function" "spa_router" {
  name    = "coba-poc-spa-router"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var uri = event.request.uri;

      if (uri === '/game' || uri === '/game/') {
        event.request.uri = '/game/index.html';
        return event.request;
      }

      if (uri.startsWith('/game/')) {
        var lastSegment = uri.slice(uri.lastIndexOf('/') + 1);
        if (!lastSegment.includes('.')) {
          event.request.uri = '/game/index.html';
          return event.request;
        }
      }

      return event.request;
    }
  EOF
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US, Canada, Europe only

  # Origin 1: EC2 nginx reverse proxy (port 80)
  origin {
    origin_id   = "ec2-backend"
    domain_name = var.ec2_origin_domain
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Origin 2: S3 frontend SPA
  origin {
    origin_id                = "s3-frontend"
    domain_name              = var.frontend_bucket_regional_domain
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # /api/* → EC2 (no cache)
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
  }

  # /trpc/* → EC2 (no cache)
  ordered_cache_behavior {
    path_pattern             = "/trpc/*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
  }

  # /game/api/* → EC2 (no cache)
  ordered_cache_behavior {
    path_pattern             = "/game/api/*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
  }

  # /game/trpc/* → EC2 (no cache)
  ordered_cache_behavior {
    path_pattern             = "/game/trpc/*"
    target_origin_id         = "ec2-backend"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
  }

  # /* → S3 frontend (optimised cache) with SPA router function
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }
  }

  # COBA SPA routing: 403/404 from S3 → serve index.html with 200
  # (game SPA routing is handled upstream by the CloudFront Function)
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

  # Use the free default CloudFront certificate (*.cloudfront.net)
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  tags = { Name = "coba-poc-cdn" }
}
