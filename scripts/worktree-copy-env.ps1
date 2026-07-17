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

# Lockfiles required for shared-deps junction matching (see scripts/lib/worktree-link-deps.mjs).
$bootstrapLockPaths = @(
  "yarn.lock",
  ".yarnrc.yml",
  "next-forge/bun.lock",
  "GenerativeUI_monorepo/apps/agent-server/poetry.lock"
)
foreach ($relativePath in $bootstrapLockPaths) {
  $source = Join-Path $SourceRoot $relativePath
  $target = Join-Path $TargetRoot $relativePath
  if (Test-Path $source) {
    $targetDir = Split-Path -Parent $target
    if ($targetDir -and -not (Test-Path $targetDir)) {
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
