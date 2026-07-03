# Install rassumfrassum (rass) and optional Python preset servers.
# Usage: .\scripts\rassumfrassum\install.ps1 [-SkipPresetServers]

param(
  [switch]$SkipPresetServers
)

$ErrorActionPreference = "Stop"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   RASSUMFRASSUM INSTALL" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Error "Python 3.10+ required. Install from https://www.python.org/downloads/"
}

$pyVersion = python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
$major, $minor = $pyVersion.Split('.') | ForEach-Object { [int]$_ }
if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 10)) {
  Write-Error "Python 3.10+ required (found $pyVersion)"
}

Write-Host "Installing rassumfrassum..." -ForegroundColor Yellow
python -m pip install --upgrade rassumfrassum
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipPresetServers) {
  Write-Host "Installing python preset servers (ty, ruff)..." -ForegroundColor Yellow
  python -m pip install --upgrade ty ruff
}

Write-Host ""
Write-Host "Validate: yarn rass:validate" -ForegroundColor Cyan
Write-Host "Docs: docs/rassumfrassum-setup.md" -ForegroundColor DarkGray
