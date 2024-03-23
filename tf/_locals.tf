locals {
  price       = var.price == "yes" ? 1 : 0
  prefix      = "patrick-cloud"
  domain_name = "patrick-cloud.com"
}