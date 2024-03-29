## SNOWPLOW COLLECTOR ##

resource "aws_lb_listener_rule" "https_snowplow_collector" {
  listener_arn = aws_alb_listener.https.arn
  priority     = 3

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.snowplow_collector.arn
  }

    condition {
        host_header {
            values = ["snowplow.patrick-cloud.com"]
        }
    }

    condition {
        path_pattern {
            values = ["/collector*"]
        }
  }
}

resource "aws_alb_target_group" "snowplow_collector" {
    name = "${local.prefix}-snow-col-tg"
    port = 443
    protocol = "HTTPS"
    target_type = "instance"
    vpc_id = data.aws_vpc.golden_vpc.id

    health_check {
        healthy_threshold = 3
        interval = 30
        protocol = "HTTPS"
        matcher = "200"
        timeout = 10
        path = "/health"
        unhealthy_threshold = 2
    }

    tags = local.tags
}



## SNOWPLOW IGLU ##

resource "aws_lb_listener_rule" "https_snowplow_iglu" {
  listener_arn = aws_alb_listener.https.arn
  priority     = 4

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.snowplow_iglu.arn
  }

    condition {
        host_header {
            values = ["snowplow.patrick-cloud.com"]
        }
    }

    condition {
        path_pattern {
            values = ["/iglu*"]
        }
  }
}

resource "aws_alb_target_group" "snowplow_iglu" {
    name = "${local.prefix}-snow-iglu-tg"
    port = 443
    protocol = "HTTPS"
    target_type = "instance"
    vpc_id = data.aws_vpc.golden_vpc.id

    health_check {
        healthy_threshold = 3
        interval = 30
        protocol = "HTTPS"
        matcher = "200"
        timeout = 10
        path = "/api/meta/health"
        unhealthy_threshold = 2
    }

    tags = local.tags
}

resource "aws_autoscaling_attachment" "snowplow_iglu" {
  autoscaling_group_name = "${local.prefix}-snowplow-iglu"
  lb_target_group_arn    = aws_alb_target_group.snowplow_iglu.arn
}