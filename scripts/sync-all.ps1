param(
  # Override the computed start date for ALL date-range scrapers (DD-MM-YYYY)
  [string]$StartDate,
  # Override the end date for ALL date-range scrapers (DD-MM-YYYY). Default: today in Asia/Kolkata
  [string]$EndDate,
  # Skip pip installs (assumes venv + deps already present)
  [switch]$SkipInstall,
  # Skip git commit/push
  [switch]$SkipGit,
  # Skip parsing transfer PDFs (listing only)
  [switch]$SkipTransfersPdfParse,
  # Print what would run and exit (no Python, no git)
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Get-KolkataToday {
  $utcNow = [DateTime]::UtcNow
  $tz = $null

  try {
    # Windows
    $tz = [TimeZoneInfo]::FindSystemTimeZoneById("India Standard Time")
  } catch {
    # Linux/macOS (PowerShell Core)
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

function Find-LatestIsoJsonDate([string]$folderPath) {
  if (!(Test-Path -LiteralPath $folderPath)) {
    return $null
  }

  $re = [regex]::new("(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})\.json$")
  $latest = $null

  Get-ChildItem -LiteralPath $folderPath -Filter "*.json" -File -ErrorAction SilentlyContinue | ForEach-Object {
    $m = $re.Match($_.Name)
    if (!$m.Success) { return }

    $dt = [DateTime]::new(
      [int]$m.Groups["y"].Value,
      [int]$m.Groups["m"].Value,
      [int]$m.Groups["d"].Value
    ).Date

    if ($null -eq $latest -or $dt -gt $latest) {
      $latest = $dt
    }
  }

  return $latest
}

function Resolve-DateRange(
  [string]$outputFolder,
  [string]$defaultStartDisplay
) {
  $end = if ($EndDate) { Parse-DisplayDate $EndDate } else { Get-KolkataToday }

  if ($StartDate) {
    $start = Parse-DisplayDate $StartDate
    return @{ Start = $start; End = $end }
  }

  $latestJsonDay = Find-LatestIsoJsonDate $outputFolder
  $defaultStart = Parse-DisplayDate $defaultStartDisplay

  $start = if ($latestJsonDay) { $latestJsonDay.AddDays(1) } else { $defaultStart }
  return @{ Start = $start; End = $end }
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

function Run-Py([string]$pythonExe, [string]$scriptPath, [string[]]$args) {
  if (!(Test-Path -LiteralPath $scriptPath)) {
    throw "Python script not found: $scriptPath"
  }
  $argText = if ($args -and $args.Length -gt 0) { $args -join " " } else { "" }
  Write-Host "Running: $scriptPath $argText"
  & $pythonExe $scriptPath @args
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$todayIst = Get-KolkataToday
$todayIso = $todayIst.ToString("yyyy-MM-dd", [Globalization.CultureInfo]::InvariantCulture)
Write-Host "Repo: $repoRoot"
Write-Host "End date (IST): $(Format-DisplayDate $todayIst) ($todayIso)"

$diprOut = Join-Path $repoRoot "TN-DIPR-Press Release/Response JSON"
$govPrOut = Join-Path $repoRoot "TN-GOV-Press Release/Response JSON"
$iasOut = Join-Path $repoRoot "TN-IAS_Transfers-Postings/Response JSON"

$diprRange = Resolve-DateRange $diprOut "10-05-2026"
$govPrRange = Resolve-DateRange $govPrOut "10-05-2026"
$iasRange = Resolve-DateRange $iasOut "10-05-2026"

if ($DryRun) {
  Write-Host ""
  Write-Host "Dry run. Planned date ranges:"
  Write-Host "  DIPR:      $(Format-DisplayDate $diprRange.Start) -> $(Format-DisplayDate $diprRange.End)"
  Write-Host "  PR images:  $(Format-DisplayDate $govPrRange.Start) -> $(Format-DisplayDate $govPrRange.End)"
  Write-Host "  Transfers:  $(Format-DisplayDate $iasRange.Start) -> $(Format-DisplayDate $iasRange.End)"
  Write-Host ""
  Write-Host "No commands executed (DryRun)."
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
  Pip-Install $pythonExe (Join-Path $repoRoot "TN-News/Code/requirements.txt")
}

# DIPR press releases (defaults to project start date if none present)
if ($diprRange.Start -le $diprRange.End) {
  Run-Py $pythonExe (Join-Path $repoRoot "TN-DIPR-Press Release/tn_press_release_sync.py") @(
    "--start-date", (Format-DisplayDate $diprRange.Start),
    "--end-date", (Format-DisplayDate $diprRange.End)
  )
} else {
  Write-Host "Skipping DIPR: already up to date."
}

# Gov press release images
if ($govPrRange.Start -le $govPrRange.End) {
  Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV-Press Release/tn_gov_press_release_sync.py") @(
    "--start-date", (Format-DisplayDate $govPrRange.Start),
    "--end-date", (Format-DisplayDate $govPrRange.End)
  )
} else {
  Write-Host "Skipping PR images: already up to date."
}

# Government Orders (refresh existing department JSONs)
Run-Py $pythonExe (Join-Path $repoRoot "TN-Government Orders/tn_government_orders_sync.py") @(
  "--from-existing",
  "--replace-orders"
)

# Transfers & postings (date-range)
if ($iasRange.Start -le $iasRange.End) {
  $iasArgs = @(
    "--start-date", (Format-DisplayDate $iasRange.Start),
    "--end-date", (Format-DisplayDate $iasRange.End)
  )

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
} else {
  Write-Host "Skipping transfers: already up to date."
}

# Tamil Arasu magazine (keep it bounded to current month)
$sinceMonth = [DateTime]::new($todayIst.Year, $todayIst.Month, 1)
Run-Py $pythonExe (Join-Path $repoRoot "TN-TVA-Magazine/tn_magazine_sync.py") @(
  "--since-date", (Format-DisplayDate $sinceMonth)
)

# Directory manifests
Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Departments/tn_dept_sync.py") @()
Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Council Of Ministers/tn_ministers_sync.py") @()
Run-Py $pythonExe (Join-Path $repoRoot "TN-GOV_Districts/tn_districts_sync.py") @()

# News (skip cleanly if NEWSDATA_API_KEY isn't configured)
try {
  Run-Py $pythonExe (Join-Path $repoRoot "TN-News/Code/fetch_tamil_nadu_news.py") @()
} catch {
  Write-Host "News sync skipped/failed (likely NEWSDATA_API_KEY missing). Error: $($_.Exception.Message)"
}

if ($SkipGit) {
  Write-Host "SkipGit enabled; not committing/pushing."
  exit 0
}

Write-Host "Staging outputs..."
git add "TN-DIPR-Press Release/Response JSON/" | Out-Null
git add "TN-GOV-Press Release/Response JSON/" | Out-Null
git add "TN-Government Orders/Response JSON/" | Out-Null
git add "TN-IAS_Transfers-Postings/Response JSON/" | Out-Null
git add "TN-TVA-Magazine/manifests/magazine.json" | Out-Null
git add "TN-TVA-Magazine/Response JSON/" | Out-Null
git add "TN-GOV_Departments/manifests/" | Out-Null
git add "TN-GOV_Council Of Ministers/manifests/" | Out-Null
git add "TN-GOV_Districts/manifests/" | Out-Null
git add "TN-News/Response JSON/" | Out-Null
git add ".github/workflows/deploy-web.yml" | Out-Null
git add "scripts/sync-all.ps1" | Out-Null

git diff --staged --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No changes to commit."
  exit 0
}

$msg = "chore: sync data through $todayIso"
Write-Host "Committing: $msg"
git commit -m $msg
Write-Host "Pushing..."
git push

Write-Host "Done."

