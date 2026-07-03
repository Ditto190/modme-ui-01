# Load lean-ctx env for session-audit profile.
# Usage: . .\scripts\load-lean-ctx-audit-env.ps1
# See [task_profiles.session-audit] in .lean-ctx.toml (tee_mode=always metadata).

param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$loadScript = Join-Path $PSScriptRoot 'load-lean-ctx-env.ps1'
if (-not (Test-Path -LiteralPath $loadScript)) {
  throw "Missing $loadScript"
}

. $loadScript -RepoRoot $RepoRoot | Out-Null
$env:LEAN_CTX_PROFILE = 'session-audit'

Write-Host "[lean-ctx audit] profile=session-audit | state=$env:LEAN_CTX_STATE_DIR" -ForegroundColor Cyan
Write-Host "[lean-ctx audit] tee_mode=always per task_profiles — run: lean-ctx config set tee_mode always" -ForegroundColor DarkGray
