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
            values = ["snowplow-collector.patrick-cloud.com"]
        }
    }

  tags = merge(local.tags, {"Name": "${local.prefix}-snowplow-collector-listener"})
}

resource "aws_alb_target_group" "snowplow_collector" {
    name = "${local.prefix}-snow-col-tg"
    port = 443
    protocol = "HTTPS"
    target_type = "instance"
    vpc_id = data.aws_vpc.this.id

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

# resource "aws_autoscaling_attachment" "snowplow_collector" {
#   autoscaling_group_name = "${local.prefix}-snowplow-collector"
#   lb_target_group_arn    = aws_alb_target_group.snowplow_collector.arn
# }


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
            values = ["snowplow-iglu.patrick-cloud.com"]
        }
    }

  tags = merge(local.tags, {"Name": "${local.prefix}-snowplow-iglu-listener"})

}

resource "aws_alb_target_group" "snowplow_iglu" {
    name = "${local.prefix}-snow-iglu-tg"
    port = 443
    protocol = "HTTPS"
    target_type = "instance"
    vpc_id = data.aws_vpc.this.id
    slow_start = 300

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

# resource "aws_autoscaling_attachment" "snowplow_iglu" {
#   autoscaling_group_name = "${local.prefix}-snowplow-iglu"
#   lb_target_group_arn    = aws_alb_target_group.snowplow_iglu.arn
# }


## ALARMS ##

resource "aws_cloudwatch_metric_alarm" "HealthyHostCountSnowplowCollector" {
  alarm_name          = "${local.prefix}-alb-snowplow-collector-healthy-host-count-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  datapoints_to_alarm = 5
  alarm_description   = "This alarm can detect when the ALB can't connect to the Snowplow Collector EC2 instance."
  alarm_actions       = [data.aws_sns_topic.email.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_alb.this.arn_suffix,
    TargetGroup = aws_alb_target_group.snowplow_collector.arn_suffix
  }

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "HealthyHostCountSnowplowIglu" {
  alarm_name          = "${local.prefix}-alb-snowplow-iglu-healthy-host-count-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  datapoints_to_alarm = 5
  alarm_description   = "This alarm can detect when the ALB can't connect to the Snowplow Iglu EC2 instance."
  alarm_actions       = [data.aws_sns_topic.email.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_alb.this.arn_suffix,
    TargetGroup = aws_alb_target_group.snowplow_collector.arn_suffix
  }

  tags = local.tags
}