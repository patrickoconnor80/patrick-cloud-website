locals {
  prefix      = "patrick-cloud-${var.env}"
  tags = {
    env = var.env
    type = "patrick-cloud"
    deployment = "terraform"
  }
  domain_name = "patrick-cloud.com"
  public_subnet_ids = [for subnet in data.aws_subnet.public : subnet.id]
  private_subnet_ids = [for subnet in data.aws_subnet.private : subnet.id]
  ssh_ip_allowlist = [format("%s/%s", data.external.whatismyip.result["internet_ip"], 32)]
}