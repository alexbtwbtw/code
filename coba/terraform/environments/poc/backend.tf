terraform {
  backend "s3" {
    bucket         = "coba-terraform-state"
    key            = "poc/terraform.tfstate"
    region         = "eu-west-2"
    encrypt        = true
    dynamodb_table = "coba-terraform-locks"
  }
}
