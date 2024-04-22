resource "aws_cloudfront_distribution" "this" {
  origin {
    domain_name = "patrick-cloud.com.s3.us-east-1.amazonaws.com"
    origin_id   = "patrick-cloud.com.s3-website.amazonaws.com"
  }

  enabled         = true
  is_ipv6_enabled = false
  web_acl_id      = aws_wafv2_web_acl.cloudfront.arn

  aliases             = ["patrick-cloud.com"]
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
    acm_certificate_arn            = "arn:aws:acm:us-east-1:948065143262:certificate/e8287206-84d2-470f-8843-c6d344cbf8e2"
  }

  logging_config {
    include_cookies = false
    bucket          = "${aws_s3_bucket.website_logs.bucket}.s3.amazonaws.com"
    prefix          = "cloudfront"
  }

  tags = local.tags
}


## WAF ##

resource "aws_wafv2_web_acl" "cloudfront" {
  name        = "${local.prefix}-cloudfront-waf"
  description = "WAF to limit activity"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Log4j Vulnerability
  rule {
    name     = "AWS-AWSManagedRulesAnonymousIpList"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAnonymousIpList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "cloudfront-log4j-anonymous-ip-metric"
      sampled_requests_enabled   = false
    }
  }

  # Log4j2 Vulnerability
  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "cloudfront-log4j2-bad-inputs-metric"
      sampled_requests_enabled   = false
    }
  }

  # Rate Limit
  rule {
    name     = "rule-3"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
          geo_match_statement {
            country_codes = ["US", "NL"]
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "cloudfront-rate-limit-metric"
      sampled_requests_enabled   = false
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = false
    metric_name                = "cloudfront-metric"
    sampled_requests_enabled   = false
  }

  tags = local.tags
}