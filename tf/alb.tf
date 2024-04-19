resource "aws_alb" "this" {
    name = "${local.prefix}-alb"
    subnets = local.public_subnet_ids
    security_groups = [data.aws_security_group.alb_sg.id]
    enable_deletion_protection = true
    drop_invalid_header_fields = true

    access_logs {
      bucket  = aws_s3_bucket.website_logs.bucket
      prefix  = "alb"
      enabled = true
    }

    tags = local.tags
}

resource "aws_alb_listener" "http" {
    load_balancer_arn = aws_alb.this.id
    port = 80
    protocol = "HTTP"

    default_action {
      type = "redirect"
      redirect {
        host        = "#{host}"
        path        = "/#{path}"
        port        = "443"
        protocol    = "HTTPS"
        query       = "#{query}"
        status_code = "HTTP_301"
      }
    }

    tags = local.tags
}

resource "aws_alb_listener" "https" {
    load_balancer_arn = aws_alb.this.id
    port = 443
    protocol = "HTTPS"
    certificate_arn = "arn:aws:acm:us-east-1:948065143262:certificate/e8287206-84d2-470f-8843-c6d344cbf8e2"
    ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"

    default_action {
        type = "forward"
        target_group_arn = aws_alb_target_group.jenkins.arn
    }

    tags = local.tags
}


## SECURITY GROUP RULES ##

resource "aws_security_group_rule" "ingress_80" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow all incoming traffic on port 80"
  type              = "ingress"
  protocol          = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_blocks       = local.ssh_ip_allowlist
}

resource "aws_security_group_rule" "ingress_443" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow all incoming traffic on port 443"
  type              = "ingress"
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "egress_443_snowplow_collector" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow outgoing traffic to snowplow collector sg on port 443"
  type              = "egress"
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  source_security_group_id = data.aws_security_group.snowplow_collector.id
}

resource "aws_security_group_rule" "egress_443_snowplow_iglu" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow outgoing traffic to snowplow iglu sg on port 443"
  type              = "egress"
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  source_security_group_id = data.aws_security_group.snowplow_iglu.id
}

resource "aws_security_group_rule" "egress_443_jenkins" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow outgoing traffic to jenkins sg on port 443"
  type              = "egress"
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  source_security_group_id = data.aws_security_group.jenkins.id
}

resource "aws_security_group_rule" "egress_443_kubernetes" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow outgoing traffic to kubernetes sg on port 443"
  type              = "egress"
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  source_security_group_id = data.aws_security_group.kubernetes.id
}


## ALARMS ##

resource "aws_cloudwatch_metric_alarm" "httpCodeTarget4xxCount" {
  alarm_name          = "${local.prefix}-alb-http-4xx-count-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "HTTPCode_Target_4XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 5
  alarm_description   = "This alarm helps us report the total number of 4xx error status codes that are made in response to client requests. 403 error codes might indicate an incorrect IAM policy, and 404 error codes might indicate mis-behaving client application"
  alarm_actions       = [data.aws_sns_topic.email.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_alb.this.arn_suffix
  }

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "httpCodeTarget5xxCount" {
  alarm_name          = "${local.prefix}-alb-http-5xx-count-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 5
  alarm_description   = "This alarm helps you detect a high number of server-side errors. These errors indicate that a client made a request that the server couldn’t complete."
  alarm_actions       = [data.aws_sns_topic.email.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_alb.this.arn_suffix
  }

  tags = local.tags
}