data "aws_caller_identity" "current" {}

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}

resource "aws_iam_role" "ec2" {
  name = "coba-poc-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ec2_permissions" {
  name = "coba-poc-ec2-policy"
  role = aws_iam_role.ec2.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.files_bucket_name}",
          "arn:aws:s3:::${var.files_bucket_name}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/coba/poc/*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/coba/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "coba-poc-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = "t3.micro"
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [var.ec2_sg_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.ssh_key_name

  root_block_device {
    volume_size           = 8
    volume_type           = "gp3"
    delete_on_termination = true
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Install Node.js 25
    curl -fsSL https://rpm.nodesource.com/setup_25.x | bash -
    dnf install -y nodejs

    # Install pm2
    npm install -g pm2

    # Mount data volume (EBS at /dev/xvdf)
    mkdir -p /data
    if ! blkid /dev/xvdf; then
      mkfs.ext4 /dev/xvdf
    fi
    echo '/dev/xvdf /data ext4 defaults,nofail 0 2' >> /etc/fstab
    mount -a

    # Create app and log directories with correct ownership
    mkdir -p /app /var/log/coba
    chown -R ec2-user:ec2-user /app /var/log/coba /data
  EOF

  tags = { Name = "coba-poc-backend" }
}

resource "aws_ebs_volume" "data" {
  availability_zone = "${var.region}a"
  size              = 30
  type              = "gp3"
  tags              = { Name = "coba-poc-data" }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.backend.id
}

resource "aws_ssm_parameter" "anthropic_key" {
  name  = "/coba/poc/anthropic-key"
  type  = "SecureString"
  value = var.anthropic_api_key
}

resource "aws_ssm_parameter" "db_path" {
  name  = "/coba/poc/db-path"
  type  = "String"
  value = "/data/coba.db"
}

resource "aws_ssm_parameter" "s3_files_bucket" {
  name  = "/coba/poc/s3-files-bucket"
  type  = "String"
  value = var.files_bucket_name
}
