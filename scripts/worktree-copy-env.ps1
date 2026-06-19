# Monorepo_ModMe — Copy .env files from root worktree into a target worktree (names only, never commit)

param(
  [Parameter(Mandatory = $true)]
  [string]$SourceRoot,

  [Parameter(Mandatory = $true)]
  [string]$TargetRoot
)

$ErrorActionPreference = "Stop"

$envPaths = @(
  ".env",
  "GenerativeUI_monorepo/apps/agent-server/.env",
  "GenerativeUI_monorepo/apps/web-dashboard/.env.local"
)

foreach ($relativePath in $envPaths) {
  $source = Join-Path $SourceRoot $relativePath
  $target = Join-Path $TargetRoot $relativePath

  if (Test-Path $source) {
    $targetDir = Split-Path -Parent $target
    if (-not (Test-Path $targetDir)) {
      New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    }
    Copy-Item $source $target -Force
    Write-Host "   Copied $relativePath" -ForegroundColor Green
  }
  else {
    Write-Host "   Skipped $relativePath (not present in source)" -ForegroundColor DarkYellow
  }
}
