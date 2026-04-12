output "vpc_id"                { value = aws_vpc.main.id }
output "public_subnet_id"      { value = aws_subnet.public.id }
output "ec2_sg_id"             { value = aws_security_group.ec2.id }
output "elastic_ip"            { value = aws_eip.ec2.public_ip }
output "elastic_ip_dns"        { value = aws_eip.ec2.public_dns }
output "public_route_table_id" { value = aws_route_table.public.id }
