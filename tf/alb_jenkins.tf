resource "aws_lb_listener_rule" "https_jenkins" {
  listener_arn = aws_alb_listener.https.arn
  priority     = 2

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.jenkins.arn
  }

  condition {
    host_header {
      values = ["jenkins.patrick-cloud.com"]
    }
  }

    tags = merge(local.tags, {"Name": "${local.prefix}-jenkins-listener"})
}

resource "aws_alb_target_group" "jenkins" {
    name = "${local.prefix}-jenkins-tg"
    port = 443
    protocol = "HTTPS"
    protocol_version = "HTTP1" # Nginx only support HTTP1
    target_type = "instance"
    vpc_id = data.aws_vpc.golden_vpc.id

    health_check {
        healthy_threshold = 3
        interval = 30
        protocol = "HTTPS"
        matcher = "200"
        timeout = 10
        path = "/login"
        unhealthy_threshold = 2
    }

    tags = local.tags
}

resource "aws_lb_target_group_attachment" "jenkins" {
  target_group_arn = aws_alb_target_group.jenkins.arn
  target_id        = data.aws_instance.jenkins.id
}
