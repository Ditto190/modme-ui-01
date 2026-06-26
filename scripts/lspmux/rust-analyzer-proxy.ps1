# Optional rust-analyzer shim for editors that need an explicit script path.
# Delegates to lspmux (default server: rust-analyzer).

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot 'lib.ps1')

$lspmux = Get-LspmuxBinaryPath
if (-not (Test-Path $lspmux)) {
  Write-Error "lspmux not installed. Run .\scripts\lspmux\install.ps1"
}

$ra = Get-RustAnalyzerBinaryPath
if (Test-Path $ra) {
  $env:LSPMUX_SERVER = $ra
}

& $lspmux @args
exit $LASTEXITCODE
