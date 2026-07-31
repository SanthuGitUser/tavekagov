$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (!(Test-Path ".\.venv")) {
  Write-Host "No .venv found. Run .\setup.ps1 first."
  exit 1
}

.\.venv\Scripts\Activate.ps1
python .\dipr_press_release_download.py --include-notes

