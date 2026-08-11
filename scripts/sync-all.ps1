param(
  # Override the start date for ALL date-range scrapers (DD-MM-YYYY)
  [string]$StartDate,
  # Override the end date for ALL date-range scrapers (DD-MM-YYYY). Default: today in Asia/Kolkata
  [string]$EndDate,
  # Skip pip installs (assumes venv + deps already present)
  [switch]$SkipInstall,
  # Skip parsing transfer PDFs (listing only)
  [switch]$SkipTransfersPdfParse,
  # Print what would run and exit (no Python, no git)
  [switch]$DryRun,
  # Git integration is opt-in (no commit/push by default)
  [switch]$Stage,
  [string]$CommitMessage,
  [switch]$Commit,
  [switch]$Push
)

$ErrorActionPreference = "Stop"

function Get-KolkataToday {
  $utcNow = [DateTime]::UtcNow
  $tz = $null

  try {
    $tz = [TimeZoneInfo]::FindSystemTimeZoneById("India Standard Time")
  } catch {
    $tz = [TimeZoneInfo]::FindSystemTimeZoneById("Asia/Kolkata")
  }

  return [TimeZoneInfo]::ConvertTimeFromUtc($utcNow, $tz).Date
}

function Parse-DisplayDate([string]$value) {
  return [DateTime]::ParseExact(
    $value.Trim(),
    "dd-MM-yyyy",
    [Globalization.CultureInfo]::InvariantCulture
  ).Date
}

function Format-DisplayDate([DateTime]$value) {
  return $value.ToString("dd-MM-yyyy", [Globalization.CultureInfo]::InvariantCulture)
}

function Get-DateOverrideArgs {
  $override = @()
  if ($StartDate) {
    $override += "--start-date"
    $override += (Format-DisplayDate (Parse-DisplayDate $StartDate))
  }
  if ($EndDate) {
    $override += "--end-date"
    $override += (Format-DisplayDate (Parse-DisplayDate $EndDate))
  }
  return $override
}

function Ensure-VenvPython([string]$repoRoot, [bool]$skipInstall) {
  $venvDir = Join-Path $repoRoot ".venv"
  $isWindows = ($env:OS -eq "Windows_NT")
  $py =
    if ($isWindows) { Join-Path $venvDir "Scripts\\python.exe" }
    else { Join-Path $venvDir "bin/python" }

  if (!(Test-Path -LiteralPath $py)) {
    if ($skipInstall) {
      throw "No venv found at $venvDir. Re-run without -SkipInstall to create it and install dependencies."
    }
    Write-Host "Creating venv at $venvDir ..."
    python -m venv $venvDir
  }

  if (!(Test-Path -LiteralPath $py)) {
    throw "Unable to find venv Python at $py"
  }

  return $py
}

function Pip-Install([string]$pythonExe, [string]$requirementsPath) {
  if (!(Test-Path -LiteralPath $requirementsPath)) {
    throw "requirements.txt not found: $requirementsPath"
  }
  Write-Host "Installing deps: $requirementsPath"
  & $pythonExe -m pip install -r $requirementsPath
}

function Run-Py([string]$pythonExe, [string]$scriptPath, [string[]]$scriptArgs) {
  if (!(Test-Path -LiteralPath $scriptPath)) {
    throw "Python script not found: $scriptPath"
  }
  $argText = if ($scriptArgs -and $scriptArgs.Length -gt 0) { $scriptArgs -join " " } else { "" }
  Write-Host "Running: $scriptPath $argText"
  & $pythonExe $scriptPath @scriptArgs
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$todayIst = Get-KolkataToday
$todayIso = $todayIst.ToString("yyyy-MM-dd", [Globalization.CultureInfo]::InvariantCulture)
$dateOverrideArgs = Get-DateOverrideArgs
$magazineOverrideArgs = @()
if ($StartDate) {
  $magazineOverrideArgs += "--since-date"
  $magazineOverrideArgs += (Format-DisplayDate (Parse-DisplayDate $StartDate))
}

Write-Host "Repo: $repoRoot"
Write-Host "End date (IST): $(Format-DisplayDate $todayIst) ($todayIso)"
Write-Host "Resume checkpoints: Sync-Config/last-sync.json (+ existing Response JSON files)"

if ($DryRun) {
  $pythonExe = Ensure-VenvPython $repoRoot ([bool]$SkipInstall)
  if (!$SkipInstall) {
    Pip-Install $pythonExe (Join-Path $repoRoot "Sync-Config/requirements.txt")
  }
  Run-Py $pythonExe (Join-Path $repoRoot "Sync-Config/sync_state.py") @("--plan")
  if ($StartDate -or $EndDate) {
    Write-Host ""
    Write-Host "Note: -StartDate/-EndDate overrides are not reflected in --plan above."
  }
  Write-Host ""
  Write-Host "No sync commands executed (DryRun)."
  exit 0
}

$pythonExe = Ensure-VenvPython $repoRoot ([bool]$SkipInstall)

if (!$SkipInstall) {
  & $pythonExe -m pip install --upgrade pip
  Pip-Install $pythonExe (Join-Path $repoRoot "Sync-Config/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-DIPR-Press Release/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-GOV-Press Release/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-Government Orders/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-IAS_Transfers-Postings/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-TVA-Magazine/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-GOV_Departments/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-GOV_Council Of Ministers/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-GOV_Districts/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-Map/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-Constituencies/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-Govt-Schemes/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-News/Code/requirements.txt")
}

# Each script resumes from Sync-Config/last-sync.json (and output files) unless overridden.
Run-Py $pythonExe (Join-Path $repoRoot "TN-DIPR-Press Release/tn_press_release_sync.py") $dateOverrideArgs

Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV-Press Release/tn_gov_press_release_sync.py") $dateOverrideArgs

Run-Py $pythonExe (Join-Path $repoRoot "TN-Government Orders/tn_government_orders_sync.py") @(
  "--from-existing"
) + $dateOverrideArgs

$iasArgs = @() + $dateOverrideArgs
if ($SkipTransfersPdfParse) {
  $iasArgs += "--skip-pdf-parse"
  Run-Py $pythonExe (Join-Path $repoRoot "TN-IAS_Transfers-Postings/tn_transfers_postings_sync.py") $iasArgs
} else {
  try {
    Run-Py $pythonExe (Join-Path $repoRoot "TN-IAS_Transfers-Postings/tn_transfers_postings_sync.py") $iasArgs
  } catch {
    Write-Host "Transfers PDF parse failed; retrying with --skip-pdf-parse ..."
    $iasArgs += "--skip-pdf-parse"
    Run-Py $pythonExe (Join-Path $repoRoot "TN-IAS_Transfers-Postings/tn_transfers_postings_sync.py") $iasArgs
  }
}

Run-Py $pythonExe (Join-Path $repoRoot "TN-TVA-Magazine/tn_magazine_sync.py") $magazineOverrideArgs

Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Departments/tn_dept_sync.py") @()
Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Council Of Ministers/tn_ministers_sync.py") @()
Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Districts/tn_districts_sync.py") @()
Run-Py $pythonExe (Join-Path $repoRoot "TN-Constituencies/tn_constituencies_sync.py") @()
Run-Py $pythonExe (Join-Path $repoRoot "TN-Govt-Schemes/tn_govt_schemes_sync.py") @()
Run-Py $pythonExe (Join-Path $repoRoot "TN-Map/fetch_constituency_boundaries.py") @()

try {
  Run-Py $pythonExe (Join-Path $repoRoot "TN-News/Code/fetch_tamil_nadu_news.py") @()
} catch {
  Write-Host "News sync skipped/failed (likely NEWSDATA_API_KEY missing). Error: $($_.Exception.Message)"
}

if (!$Stage -and !$Commit -and !$Push) {
  Write-Host ""
  Write-Host "Sync complete."
  Write-Host "Checkpoints updated in Sync-Config/last-sync.json"
  Write-Host "Git actions are disabled by default."
  Write-Host "Run 'git status' and commit/push when ready, or rerun with -Stage / -Commit / -Push."
  exit 0
}

if ($Stage -or $Commit -or $Push) {
  Write-Host "Staging outputs..."
  git add "Sync-Config/last-sync.json" | Out-Null
  git add "TN-DIPR-Press Release/Response JSON/" | Out-Null
  git add "TN-GOV-Press Release/Response JSON/" | Out-Null
  git add "TN-Government Orders/Response JSON/" | Out-Null
  git add "TN-IAS_Transfers-Postings/Response JSON/" | Out-Null
  git add "TN-TVA-Magazine/manifests/magazine.json" | Out-Null
  git add "TN-TVA-Magazine/Response JSON/" | Out-Null
  git add "TN-GOV_Departments/manifests/" | Out-Null
  git add "TN-GOV_Council Of Ministers/manifests/" | Out-Null
  git add "TN-GOV_Districts/manifests/" | Out-Null
  git add "TN-Constituencies/manifests/" | Out-Null
  git add "TN-Govt-Schemes/manifests/" | Out-Null
  git add "TN-Map/tamil-nadu-constituencies.geojson" | Out-Null
  git add "TN-Map/constituency-boundaries-manifest.json" | Out-Null
  git add "TN-News/Response JSON/" | Out-Null
  git add ".github/workflows/deploy-web.yml" | Out-Null
  git add "scripts/sync-all.ps1" | Out-Null
}

git diff --staged --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No staged changes."
  exit 0
}

if ($Commit -or $Push) {
  $msg = if ($CommitMessage) { $CommitMessage } else { "chore: sync data through $todayIso" }
  Write-Host "Committing: $msg"
  git commit -m $msg
}

if ($Push) {
  Write-Host "Pushing..."
  git push

  if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "Triggering Deploy Web Dashboard (push from this environment may not auto-start Actions)..."
    gh workflow run deploy-web.yml --ref main 2>$null
    if ($LASTEXITCODE -eq 0) {
      Start-Sleep -Seconds 2
      gh run list --workflow=deploy-web.yml --limit 1
    } else {
      Write-Host "Could not trigger deploy via gh. Run: pwsh scripts/trigger-deploy.ps1"
    }
  } else {
    Write-Host "After push, start deploy manually:"
    Write-Host "  pwsh scripts/trigger-deploy.ps1"
    Write-Host "  or Actions -> Deploy Web Dashboard -> Run workflow"
  }
}

Write-Host "Done."
