terraform {
  backend "s3" {
    bucket         = "coba-terraform-state"
    key            = "poc/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "coba-terraform-locks"
  }
}
