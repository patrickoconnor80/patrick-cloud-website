resource "aws_route53_record" "alb" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = "*"
  type    = "A"

  alias {
    name                   = "dualstack.${aws_alb.this.dns_name}"
    zone_id                = aws_alb.this.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "patirck_cloud" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = ""
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}