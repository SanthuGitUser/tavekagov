# Trigger the Deploy Web Dashboard workflow on GitHub.
# Use this after git push when the push did not start Actions automatically
# (common when pushing from Cursor or from another workflow using GITHUB_TOKEN).

param(
  [string]$Ref = "main"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error @"
GitHub CLI (gh) is required. Install from https://cli.github.com/ then run:
  gh auth login
  gh workflow run deploy-web.yml --ref $Ref
"@
}

Write-Host "Triggering Deploy Web Dashboard on ref $Ref..."
gh workflow run deploy-web.yml --ref $Ref

Start-Sleep -Seconds 3
gh run list --workflow=deploy-web.yml --limit 3

Write-Host ""
Write-Host "Open Actions to watch progress:"
Write-Host "  https://github.com/SanthuGitUser/tavekagov/actions/workflows/deploy-web.yml"
