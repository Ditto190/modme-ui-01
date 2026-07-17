# Monorepo_ModMe - Copy essential ignored files into a target worktree (names only, never commit).
# Keep in sync with .worktreeinclude (Copilot App mirror list).
# Does NOT copy node_modules / .venv - use shared-deps junctions instead.

param(
  [Parameter(Mandatory = $true)]
  [string]$SourceRoot,

  [Parameter(Mandatory = $true)]
  [string]$TargetRoot
)

$ErrorActionPreference = "Stop"

# secrets (by name; never commit)
$envPaths = @(
  ".env",
  "GenerativeUI_monorepo/apps/agent-server/.env",
  "GenerativeUI_monorepo/apps/web-dashboard/.env.local",
  "next-forge/packages/database/.env"
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

# lockfiles for shared-deps bootstrap / yarn doctor
$lockfilePaths = @(
  "yarn.lock",
  ".yarnrc.yml",
  "next-forge/bun.lock",
  "GenerativeUI_monorepo/apps/agent-server/poetry.lock"
)
foreach ($relativePath in $lockfilePaths) {
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
}

$yarnDir = Join-Path $SourceRoot ".yarn"
if (Test-Path $yarnDir) {
  $targetYarn = Join-Path $TargetRoot ".yarn"
  Copy-Item $yarnDir $targetYarn -Recurse -Force
  Write-Host "   Copied .yarn/" -ForegroundColor Green
}
