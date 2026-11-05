param(
  [Parameter(Mandatory = $true)]
  [string]$RepoName,
  [string]$BasePath = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (!$BasePath) {
  $BasePath = if ($RepoName -match "\.github\.io$") { "/" } else { "/$RepoName/" }
}

$files = @(
  (Join-Path $repoRoot ".github/workflows/deploy-web.yml"),
  (Join-Path $repoRoot ".github/workflows/ci-web.yml"),
  (Join-Path $repoRoot "web/.env.example")
)

Write-Host "Configuring fork: repo=$RepoName basePath=$BasePath"

foreach ($file in $files) {
  if (!(Test-Path -LiteralPath $file)) { continue }
  $content = Get-Content -LiteralPath $file -Raw
  $updated = $content -replace "VITE_BASE_PATH: /tavekagov/", "VITE_BASE_PATH: $BasePath"
  $updated = $updated -replace "VITE_BASE_PATH=/tavekagov/", "VITE_BASE_PATH=$BasePath"
  if ($DryRun) {
    Write-Host "[DryRun] Would update $file"
    continue
  }
  if ($updated -ne $content) {
    Set-Content -LiteralPath $file -Value $updated -NoNewline
    Write-Host "Updated $file"
  }
}

Write-Host "Next: enable GitHub Pages (Actions), set NEWSDATA_API_KEY secret if using news sync."
