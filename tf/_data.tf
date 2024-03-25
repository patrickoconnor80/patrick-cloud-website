data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_vpc" "golden_vpc" {
  filter {
    name   = "tag:Name"
    values = ["golden-vpc"]
  }
}

data "aws_subnets" "public" {
  filter {
    name   = "tag:Name"
    values = ["golden-vpc-public-us-east-1*"]
  }
}

data "aws_subnet" "public" {
  for_each = toset(data.aws_subnets.public.ids)
  id       = each.value
}

data "aws_subnets" "private" {
  filter {
    name   = "tag:Name"
    values = ["golden-vpc-private-us-east-1*"]
  }
}

data "aws_subnet" "private" {
  for_each = toset(data.aws_subnets.private.ids)
  id       = each.value
}

# data "aws_alb" "collector" {
#   name = "${local.prefix}-collector-lb"
# }

# data "aws_alb" "iglu" {
#   name = "${local.prefix}-iglu-lb"
# }

data "aws_route53_zone" "this" {
  name = "patrick-cloud.com"
}