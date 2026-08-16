locals {
  prefix = "patrick-cloud-${var.env}"
  tags = {
    Env        = var.env
    Project    = "patrick-cloud"
    Deployment = "terraform"
    Repo       = "https://github.com/patrickoconnor80/patrick-cloud-website/tree/main/tf"
  }
  domain_name        = "patrick-cloud.com"
  public_subnet_ids  = [for subnet in data.aws_subnet.public : subnet.id]
  private_subnet_ids = [for subnet in data.aws_subnet.private : subnet.id]
  ssh_ip_allowlist   = [format("%s/%s", data.external.whatismyip.result["internet_ip"], 32)]
}