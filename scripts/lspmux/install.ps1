# Install lspmux via cargo and seed user config from repo template.
# Usage: .\scripts\lspmux\install.ps1 [-SkipCargoInstall] [-ForceConfig]

param(
  [switch]$SkipCargoInstall,
  [switch]$ForceConfig
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot 'lib.ps1')

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   LSPMUX INSTALL" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipCargoInstall) {
  if (-not (Test-CargoAvailable)) {
    Write-Host "cargo not found on PATH." -ForegroundColor Yellow
    Write-Host "Install Rust: https://rustup.rs/ then re-run:" -ForegroundColor Yellow
    Write-Host "  yarn lspmux:install" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Continuing with config template only..." -ForegroundColor DarkGray
  }
  else {
    $cargo = Get-CargoBinaryPath
    Write-Host "Installing lspmux via cargo ($cargo)..." -ForegroundColor Yellow
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $cargo install lspmux --locked 2>&1 | ForEach-Object { Write-Host $_ }
    $installExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap

    if ($installExit -ne 0) {
      Write-Host ""
      Write-Host "cargo install lspmux failed (exit $installExit)." -ForegroundColor Yellow
      Write-Host "Common Windows fixes:" -ForegroundColor Yellow
      Write-Host "  - Install VS Build Tools with C++ (MSVC link.exe)" -ForegroundColor DarkGray
      Write-Host "  - Use x64 Native Tools Command Prompt or Developer PowerShell" -ForegroundColor DarkGray
      Write-Host "  - Ensure Git/Miniconda GNU link.exe is not ahead of MSVC on PATH" -ForegroundColor DarkGray
      Write-Host ""
      Write-Host "Continuing with config template only..." -ForegroundColor DarkGray
    }
    elseif (Test-Path (Get-LspmuxBinaryPath)) {
      Write-Host "   lspmux installed to $(Get-LspmuxBinaryPath)" -ForegroundColor Green
    }
  }
}

Write-Host "Seeding lspmux config..." -ForegroundColor Cyan
Ensure-LspmuxConfig -Force:$ForceConfig | Out-Null

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. yarn lspmux:start"
Write-Host "  2. yarn lspmux:status"
Write-Host "  3. Reload VS Code / Cursor windows"
Write-Host ""
Write-Host "Docs: docs/lspmux-setup.md" -ForegroundColor DarkGray
