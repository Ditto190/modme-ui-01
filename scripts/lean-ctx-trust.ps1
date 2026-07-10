# Trust ModMe workspace for lean-ctx 3.8+ security-sensitive .lean-ctx.toml overrides.
# Usage: yarn lean-ctx:trust

param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Continue'

$loadEnv = Join-Path $PSScriptRoot 'load-lean-ctx-env.ps1'
if (Test-Path -LiteralPath $loadEnv) {
  . $loadEnv -RepoRoot $RepoRoot | Out-Null
}

$candidates = @(
  (Join-Path $env:USERPROFILE '.local/bin/lean-ctx.exe'),
  (Join-Path $env:APPDATA 'npm/lean-ctx.cmd')
)
$bin = $null
foreach ($candidate in $candidates) {
  if ($candidate -and (Test-Path -LiteralPath $candidate)) {
    $bin = (Resolve-Path -LiteralPath $candidate).Path
    break
  }
}
if (-not $bin) {
  $cmd = Get-Command lean-ctx -ErrorAction SilentlyContinue
  if ($cmd) { $bin = $cmd.Source }
}
if (-not $bin) {
  Write-Host '[lean-ctx trust] FAIL: lean-ctx not on PATH (need 3.8+ for trust command)' -ForegroundColor Red
  exit 1
}

Push-Location $RepoRoot
try {
  & $bin trust
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $bin trust status
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
