resource "aws_lb_listener_rule" "https_kubernetes" {
  listener_arn = aws_alb_listener.https.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.kubernetes.arn
  }

    condition {
        host_header {
            values = ["kubernetes.patrick-cloud.com"]
        }
    }
}

resource "aws_alb_target_group" "kubernetes" {
    name = "${local.prefix}-kubernetes-tg"
    port = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
    protocol = "HTTPS"
    target_type = "instance"
    vpc_id = data.aws_vpc.this.id

    health_check {
        port = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
        healthy_threshold = 3
        interval = 20
        protocol = "HTTP"
        matcher = "200"
        timeout = 15
        path = "/healthz/ready"
        unhealthy_threshold = 2
    }

    stickiness {
        enabled = true
        type = "lb_cookie"
        cookie_duration = 3600
    }

    tags = local.tags
}

# resource "aws_autoscaling_attachment" "autoscaling_attachment" {
#   autoscaling_group_name = data.aws_eks_node_group.this.resources[0].autoscaling_groups[0].name
#   lb_target_group_arn   = aws_alb_target_group.kubernetes.arn
# }

resource "aws_security_group_rule" "egress_kubernetes_nodeport" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow all outgoing traffic on port ${data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value}(Istio Gateway NodePort)"
  type              = "egress"
  protocol          = "tcp"
  from_port         = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
  to_port           = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "egress_kubernetes_statusport" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow all outgoing traffic port ${data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value}(Istio Gateway StatusPort)"
  type              = "egress"
  protocol          = "tcp"
  from_port         = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
  to_port           = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "ingress_kubernetes_nodeport" {
  security_group_id = data.aws_security_group.kubernetes.id
  description       = "Allow incoming traffic on port ${data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value}(Istio Gateway NodePort) from the ALB to the Kubernetes Cluster"
  type              = "ingress"
  protocol          = "tcp"
  from_port         = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
  to_port           = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
  source_security_group_id       = data.aws_security_group.alb_sg.id
}

resource "aws_security_group_rule" "ingress_kubernetes_statusport" {
  security_group_id = data.aws_security_group.kubernetes.id
  description       = "Allow incoming traffic on port ${data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value}(Istio Gateway StatusPort) from the ALB to the Kubernetes Cluster"
  type              = "ingress"
  protocol          = "tcp"
  from_port         = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
  to_port           = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
  source_security_group_id       = data.aws_security_group.alb_sg.id
}


## ALARMS ##

resource "aws_cloudwatch_metric_alarm" "HealthyHostCountKubernetes" {
  alarm_name          = "${local.prefix}-alb-kubernetes-healthy-host-count-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  datapoints_to_alarm = 5
  alarm_description   = "This alarm can detect when the ALB can't connect to EKS."
  alarm_actions       = [data.aws_sns_topic.email.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_alb.this.arn_suffix,
    TargetGroup = aws_alb_target_group.kubernetes.arn_suffix
  }

  tags = local.tags
}