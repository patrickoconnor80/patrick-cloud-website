# resource "aws_route53_record" "snowplow" {
#   zone_id = data.aws_route53_zone.this.zone_id
#   name    = "snowplow-collector"
#   type    = "A"

#   alias {
#     name                   = "dualstack.${data.aws_alb.collector.dns_name}"
#     zone_id                = data.aws_alb.collector.zone_id
#     evaluate_target_health = true
#   }
# }

# resource "aws_route53_record" "iglu" {
#   zone_id = data.aws_route53_zone.this.zone_id
#   name    = "snowplow-iglu"
#   type    = "A"

#   alias {
#     name                   = "dualstack.${data.aws_alb.iglu.dns_name}"
#     zone_id                = data.aws_alb.iglu.zone_id
#     evaluate_target_health = true
#   }
# }

resource "aws_route53_record" "patirck_cloud" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = ""
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                   = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}