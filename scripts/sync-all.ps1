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
  [switch]$Push,
  # Exit non-zero at the end if any scraper failed
  [switch]$FailOnError,
  # Don't `git pull` the latest code/data before syncing
  [switch]$NoPull,
  # Don't archive old daily JSON (see Sync-Config/data_retention.py)
  [switch]$SkipRetention
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

$script:FailedSteps = New-Object System.Collections.Generic.List[string]

# Runs one sync script. Never throws: a failure is recorded so the remaining
# scrapers still run, and is reported (and optionally fails the run) at the end.
function Run-Py([string]$pythonExe, [string]$scriptPath, [string[]]$scriptArgs, [switch]$Optional) {
  $name = Split-Path -Leaf $scriptPath
  if (!(Test-Path -LiteralPath $scriptPath)) {
    Write-Host "ERROR: Python script not found: $scriptPath" -ForegroundColor Red
    $script:FailedSteps.Add("$name (missing)")
    return $false
  }
  $argText = if ($scriptArgs -and $scriptArgs.Length -gt 0) { $scriptArgs -join " " } else { "" }
  Write-Host "Running: $scriptPath $argText"
  # Out-Host keeps script output on the console instead of in this function's return value.
  & $pythonExe $scriptPath @scriptArgs | Out-Host
  $code = $LASTEXITCODE
  if ($code -ne 0) {
    if ($Optional) {
      Write-Host "WARNING: $name exited with code $code (optional step)" -ForegroundColor Yellow
    } else {
      Write-Host "ERROR: $name exited with code $code" -ForegroundColor Red
      $script:FailedSteps.Add("$name (exit $code)")
    }
    return $false
  }
  return $true
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

# Start from the latest commit on the remote so new data builds on what's already published.
function Update-FromRemote {
  if ($NoPull) { return }
  if (!(Get-Command git -ErrorAction SilentlyContinue)) { return }
  $dirty = git status --porcelain
  if ($dirty) {
    Write-Host "WARNING: Local changes present; skipping 'git pull'. Commit or stash them to sync on top of the latest remote data." -ForegroundColor Yellow
    return
  }
  Write-Host "Pulling latest from remote (git pull --ff-only)..."
  git pull --ff-only
  if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: 'git pull --ff-only' failed (diverged branch or offline). Continuing with local data." -ForegroundColor Yellow
  }
}

Write-Host "Repo: $repoRoot"
Write-Host "End date (IST): $(Format-DisplayDate $todayIst) ($todayIso)"
Write-Host "Resume checkpoints: Sync-Config/last-sync.json (+ existing Response-JSON files)"

if ($DryRun) {
  $pythonExe = Ensure-VenvPython $repoRoot ([bool]$SkipInstall)
  if (!$SkipInstall) {
    Pip-Install $pythonExe (Join-Path $repoRoot "Sync-Config/requirements.txt")
  }
  $null = Run-Py $pythonExe (Join-Path $repoRoot "Sync-Config/sync_state.py") @("--plan")
  if ($StartDate -or $EndDate) {
    Write-Host ""
    Write-Host "Note: -StartDate/-EndDate overrides are not reflected in --plan above."
  }
  Write-Host ""
  Write-Host "No sync commands executed (DryRun)."
  exit 0
}

Update-FromRemote

$pythonExe = Ensure-VenvPython $repoRoot ([bool]$SkipInstall)

if (!$SkipInstall) {
  & $pythonExe -m pip install --upgrade pip
  Pip-Install $pythonExe (Join-Path $repoRoot "Sync-Config/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-DIPR-Press-Release/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-GOV-Press-Release/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-DVAC-Press-Release/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-Finance-Notifications/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-Government-Orders/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-IAS_Transfers-Postings/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-TVA-Magazine/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-GOV_Departments/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-GOV_Council-Of-Ministers/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-GOV_Districts/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-Map/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-Constituencies/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-Govt-Schemes/requirements.txt")
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-News/Code/requirements.txt")
}

# Each script resumes from Sync-Config/last-sync.json (and output files) unless overridden.
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-DIPR-Press-Release/tn_press_release_sync.py") $dateOverrideArgs

$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV-Press-Release/tn_gov_press_release_sync.py") $dateOverrideArgs

$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-DVAC-Press-Release/tn_dvac_press_release_sync.py") $dateOverrideArgs

$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-Finance-Notifications/tn_finance_notifications_sync.py") @()

$goArgs = @("--from-existing") + $dateOverrideArgs
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-Government-Orders/tn_government_orders_sync.py") $goArgs

$iasScript = Join-Path $repoRoot "TN-IAS_Transfers-Postings/tn_transfers_postings_sync.py"
$iasArgs = @() + $dateOverrideArgs
if ($SkipTransfersPdfParse) {
  $null = Run-Py $pythonExe $iasScript ($iasArgs + "--skip-pdf-parse")
} else {
  $ok = Run-Py $pythonExe $iasScript $iasArgs -Optional
  if (!$ok) {
    Write-Host "Transfers PDF parse failed; retrying with --skip-pdf-parse ..."
    $null = Run-Py $pythonExe $iasScript ($iasArgs + "--skip-pdf-parse")
  }
}

$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-TVA-Magazine/tn_magazine_sync.py") $magazineOverrideArgs

$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Departments/tn_dept_sync.py") @()
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Departments/tn_wiki_departments_ministers_sync.py") @()
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Council-Of-Ministers/tn_ministers_sync.py") @()
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Council-Of-Ministers/tn_ministers_wikipedia_portfolios_sync.py") @()
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Council-Of-Ministers/tn_ministers_merge_wiki_portfolios.py") @()
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Districts/tn_districts_sync.py") @()
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-Constituencies/tn_constituencies_sync.py") @()
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-Govt-Schemes/tn_govt_schemes_sync.py") @()
$null = Run-Py $pythonExe (Join-Path $repoRoot "TN-Map/fetch_constituency_boundaries.py") @()

$newsScript = Join-Path $repoRoot "TN-News/Code/fetch_tamil_nadu_news.py"
if ($env:NEWSDATA_API_KEY -or (Select-String -Quiet -Pattern "^NEWSDATA_API_KEY=." -Path (Join-Path $repoRoot "Sync-Config/.env") -ErrorAction SilentlyContinue)) {
  $null = Run-Py $pythonExe $newsScript @()
} else {
  Write-Host "WARNING: News sync skipped: NEWSDATA_API_KEY is not set (add it to Sync-Config/.env)." -ForegroundColor Yellow
}

if (!$SkipRetention) {
  $null = Run-Py $pythonExe (Join-Path $repoRoot "Sync-Config/data_retention.py") @()
}

$null = Run-Py $pythonExe (Join-Path $repoRoot "Sync-Config/sync_health.py") @()

function Exit-WithSummary {
  if ($script:FailedSteps.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed sync steps ($($script:FailedSteps.Count)):"
    $script:FailedSteps | ForEach-Object { Write-Host "  - $_" }
    if ($FailOnError) { exit 1 }
  }
  exit 0
}

if (!$Stage -and !$Commit -and !$Push) {
  Write-Host ""
  Write-Host "Sync complete."
  Write-Host "Checkpoints updated in Sync-Config/last-sync.json"
  Write-Host "Git actions are disabled by default."
  Write-Host "Run 'git status' and commit/push when ready, or rerun with -Stage / -Commit / -Push."
  Exit-WithSummary
}

if ($Stage -or $Commit -or $Push) {
  Write-Host "Staging outputs..."
  git add "Sync-Config/last-sync.json" | Out-Null
  git add "Sync-Config/data-version.json" | Out-Null
  git add "TN-DIPR-Press-Release/Response-JSON/" | Out-Null
  git add "TN-GOV-Press-Release/Response-JSON/" | Out-Null
  git add "TN-DVAC-Press-Release/Response-JSON/" | Out-Null
  git add "TN-Finance-Notifications/manifests/" | Out-Null
  git add "TN-Government-Orders/Response-JSON/" | Out-Null
  git add "TN-IAS_Transfers-Postings/Response-JSON/" | Out-Null
  git add "TN-TVA-Magazine/manifests/magazine.json" | Out-Null
  git add "TN-TVA-Magazine/Response-JSON/" | Out-Null
  git add "TN-GOV_Departments/manifests/" | Out-Null
  git add "TN-GOV_Council-Of-Ministers/manifests/" | Out-Null
  git add "TN-GOV_Districts/manifests/" | Out-Null
  git add "TN-Constituencies/manifests/" | Out-Null
  git add "TN-Govt-Schemes/manifests/" | Out-Null
  git add "TN-TVK-Manifesto/manifests/" | Out-Null
  git add "TN-Map/tamil-nadu-constituencies.geojson" | Out-Null
  git add "TN-Map/constituency-boundaries-manifest.json" | Out-Null
  git add "TN-News/Response-JSON/" | Out-Null
  # Daily files moved out by data_retention.py
  foreach ($feed in @("TN-DIPR-Press-Release", "TN-GOV-Press-Release", "TN-DVAC-Press-Release", "TN-IAS_Transfers-Postings", "TN-News", "TN-TVA-Magazine")) {
    $archive = Join-Path $feed "archive"
    if (Test-Path -LiteralPath $archive) { git add "$archive/" | Out-Null }
  }
}

git diff --staged --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No staged changes."
  Exit-WithSummary
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
Exit-WithSummary
