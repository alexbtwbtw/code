output "role_arn" {
  value       = aws_iam_role.github_actions.arn
  description = "ARN of the GitHub Actions deploy role — add as GITHUB_ACTIONS_ROLE_ARN repo variable"
}
