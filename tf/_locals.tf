locals {
  prefix = "patrick-cloud-${var.env}"
  tags = {
    env        = var.env
    project    = "patrick-cloud"
    deployment = "terraform"
    repo       = "https://github.com/patrickoconnor80/patrick-cloud-website/tree/main/tf"
  }
  domain_name        = "patrick-cloud.com"
  public_subnet_ids  = [for subnet in data.aws_subnet.public : subnet.id]
  private_subnet_ids = [for subnet in data.aws_subnet.private : subnet.id]
  ssh_ip_allowlist   = [format("%s/%s", data.external.whatismyip.result["internet_ip"], 32)]
}