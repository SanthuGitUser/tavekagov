param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$pythonExe = if (Test-Path ".venv/Scripts/python.exe") { ".venv/Scripts/python.exe" } else { "python" }

$commands = @(
  @{ Label = "Form 20 (May 2026)"; Script = "TN-Election-Results/import_form20_once.py"; Args = @() },
  @{ Label = "Round-wise (May 2026)"; Script = "TN-Election-Results/import_roundwise_once.py"; Args = @() }
)

Write-Host "Election data refresh (manual import scripts)"
foreach ($cmd in $commands) {
  $path = Join-Path $repoRoot $cmd.Script
  if (!(Test-Path -LiteralPath $path)) {
    Write-Warning "Skip missing: $($cmd.Script)"
    continue
  }
  if ($DryRun) {
    Write-Host "[DryRun] $pythonExe $path $($cmd.Args -join ' ')"
    continue
  }
  Write-Host "Running: $($cmd.Label)"
  & $pythonExe $path @($cmd.Args)
}

if (!$DryRun) {
  & $pythonExe (Join-Path $repoRoot "Sync-Config/sync_health.py")
}

Write-Host "Done. Commit TN-Election-Results/ when outputs change."
