# resource "aws_lb_listener_rule" "https_kubernetes" {
#   listener_arn = aws_alb_listener.https.arn
#   priority     = 1

#   action {
#     type             = "forward"
#     target_group_arn = aws_alb_target_group.kubernetes.arn
#   }

#     condition {
#         host_header {
#             values = ["kubernetes.patrick-cloud.com"]
#         }
#     }
# }

# resource "aws_alb_target_group" "kubernetes" {
#     name = "${local.prefix}-kubernetes-tg"
#     port = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
#     protocol = "HTTPS"
#     target_type = "instance"
#     vpc_id = data.aws_vpc.golden_vpc.id

#     health_check {
#         port = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
#         healthy_threshold = 3
#         interval = 20
#         protocol = "HTTP"
#         matcher = "200"
#         timeout = 15
#         path = "/healthz/ready"
#         unhealthy_threshold = 2
#     }

#     stickiness {
#         enabled = true
#         type = "lb_cookie"
#         cookie_duration = 3600
#     }

#     tags = local.tags
# }

# resource "aws_autoscaling_attachment" "autoscaling_attachment" {
#   autoscaling_group_name = data.aws_eks_node_group.this.resources[0].autoscaling_groups[0].name
#   lb_target_group_arn   = aws_alb_target_group.kubernetes.arn
# }

# resource "aws_security_group_rule" "egress_kubernetes_nodeport" {
#   security_group_id = aws_security_group.this.id
#   description       = "Allow all outgoing traffic port ${data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value}"
#   type              = "egress"
#   protocol          = "tcp"
#   from_port         = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
#   to_port           = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
#   cidr_blocks       = ["0.0.0.0/0"]
# }

# resource "aws_security_group_rule" "egress_kubernetes_statusport" {
#   security_group_id = aws_security_group.this.id
#   description       = "Allow all outgoing traffic port ${data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value}"
#   type              = "egress"
#   protocol          = "tcp"
#   from_port         = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
#   to_port           = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
#   cidr_blocks       = ["0.0.0.0/0"]
# }

# resource "aws_security_group_rule" "ingress_kubernetes_nodeport" {
#   security_group_id = data.aws_security_group.kubernetes_sg.id
#   description       = "Allow incoming traffic on port ${data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value} from the ALB to the Kubernetes Cluster"
#   type              = "ingress"
#   protocol          = "tcp"
#   from_port         = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
#   to_port           = data.aws_ssm_parameter.kubernetes_istio_gateway_https_nodeport.value
#   source_security_group_id       = aws_security_group.this.id
# }

# resource "aws_security_group_rule" "ingress_kubernetes_statusport" {
#   security_group_id = data.aws_security_group.kubernetes_sg.id
#   description       = "Allow incoming traffic on port ${data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value} from the ALB to the Kubernetes Cluster"
#   type              = "ingress"
#   protocol          = "tcp"
#   from_port         = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
#   to_port           = data.aws_ssm_parameter.kubernetes_istio_gateway_statusport.value
#   source_security_group_id       = aws_security_group.this.id
# }