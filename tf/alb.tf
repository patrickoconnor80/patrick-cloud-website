resource "aws_alb" "this" {
    name = "${local.prefix}-alb"
    subnets = local.public_subnet_ids
    security_groups = [data.aws_security_group.alb_sg.id]
    # access_logs {
    #     bucket = "patrick-cloud-infra"
    #     prefix = "alb_logs/logs"
    #     enabled = true
    # }
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

resource "aws_security_group_rule" "egress_443" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow all outgoing traffic port 443"
  type              = "egress"
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_security_group_rule" "ingress_443" {
  security_group_id = data.aws_security_group.alb_sg.id
  type              = "ingress"
  description       = "Allow all incoming traffic port 443"
  protocol          = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_blocks       = local.ssh_ip_allowlist
}

resource "aws_security_group_rule" "ingress_80" {
  security_group_id = data.aws_security_group.alb_sg.id
  description       = "Allow all incoming traffic port 80"
  type              = "ingress"
  protocol          = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_blocks       = local.ssh_ip_allowlist
}