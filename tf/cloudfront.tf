resource "aws_cloudfront_distribution" "this" {
  origin {
    domain_name = "patrick-cloud.com.s3.us-east-1.amazonaws.com"
    origin_id   = "patrick-cloud.com.s3-website.amazonaws.com"
  }

  enabled         = true
  is_ipv6_enabled = false

  aliases = ["patrick-cloud.com"]
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["HEAD", "GET"]
    cached_methods   = ["HEAD", "GET"]
    target_origin_id = "patrick-cloud.com.s3-website.amazonaws.com"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  price_class = "PriceClass_All"

  viewer_certificate {
    cloudfront_default_certificate = false
    minimum_protocol_version       = "TLSv1.2_2021"
    ssl_support_method             = "sni-only"
    acm_certificate_arn = "arn:aws:acm:us-east-1:948065143262:certificate/e8287206-84d2-470f-8843-c6d344cbf8e2"
  }

  tags = var.tags
}