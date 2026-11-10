$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (!(Test-Path ".\.venv")) {
  py -m venv .venv
}

.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r .\requirements.txt

Write-Host "Setup done."

