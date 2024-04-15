data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_vpc" "this" {
    filter {
        name = "tag:Name"
        values = ["${local.prefix}-vpc"]
    }
}

data "aws_subnets" "public" {
    filter {
        name = "tag:Name"
        values = ["${local.prefix}-public-us-east-1*"]
    }
}

data "aws_subnet" "public" {
  for_each = toset(data.aws_subnets.public.ids)
  id       = each.value
}

data "aws_subnets" "private" {
    filter {
        name = "tag:Name"
        values = ["${local.prefix}-private-us-east-1*"]
    }
}

data "aws_subnet" "private" {
  for_each = toset(data.aws_subnets.private.ids)
  id       = each.value
}

data "aws_route53_zone" "this" {
  name = "patrick-cloud.com"
}

data "external" "whatismyip" {
  program = ["/bin/bash", "../bin/whatismyip.sh"]
}

# data "aws_eks_node_group" "this" {
#   cluster_name    = "${local.prefix}-eks-cluster"
#   node_group_name = "${local.prefix}-node-group"
# }

data "aws_ssm_parameter" "kubernetes_istio_gateway_https_nodeport" {
  name = "KUBERNETES_ISTIO_GATEWAY_HTTPS_NODEPORT"
}

data "aws_ssm_parameter" "kubernetes_istio_gateway_statusport" {
  name = "KUBERNETES_ISTIO_GATEWAY_STATUSPORT"
}

# data "aws_security_group" "kubernetes_sg" {
#   tags = {
#     "kubernetes.io/cluster/patrick-cloud-eks-cluster" = "owned"
#   }
# }

data "aws_instance" "jenkins" {

  filter {
    name   = "tag:Name"
    values = ["${local.prefix}-jenkins-ec2"]
  }
}

data "aws_security_group" "alb_sg" {
  name = "${local.prefix}-alb-sg"
}

data "aws_security_group" "snowplow_collector" {
  name = "${local.prefix}-snowplow-collector-sg"
}

data "aws_security_group" "snowplow_iglu" {
  name = "${local.prefix}-snowplow-iglu-sg"
}

data "aws_security_group" "jenkins" {
  name = "${local.prefix}-jenkins-sg"
}

data "aws_sns_topic" "email" {
  name = "${local.prefix}-email-sns"
}