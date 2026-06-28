# Clone Firecrawl into .vendor/firecrawl and seed local-only .env (PORT=3022).
# Usage: yarn firecrawl:setup

param(
  [switch]$ForceEnv
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib.ps1')

$vendor = Get-FirecrawlVendorDir
$envFile = Get-FirecrawlEnvFile
$port = Get-FirecrawlPort

Write-Host '== Firecrawl self-host setup ==' -ForegroundColor Cyan

if (-not (Test-DockerAvailable)) {
  Write-Host 'Docker not available. Install Docker Desktop, then re-run yarn firecrawl:setup' -ForegroundColor Yellow
  Write-Host '  https://docs.docker.com/get-docker/' -ForegroundColor DarkGray
}

New-Item -ItemType Directory -Force -Path (Split-Path $vendor -Parent) | Out-Null

if (-not (Test-Path (Join-Path $vendor '.git'))) {
  if (Test-Path $vendor) {
    Write-Host "Removing incomplete vendor dir: $vendor" -ForegroundColor Yellow
    Remove-Item -Recurse -Force $vendor
  }
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error 'git is required to clone Firecrawl. Install Git and re-run.'
  }
  Write-Host 'Cloning mendableai/firecrawl into .vendor/firecrawl ...' -ForegroundColor Yellow
  git clone --depth 1 https://github.com/mendableai/firecrawl.git $vendor
  Write-Host '  clone complete' -ForegroundColor Green
}
else {
  Write-Host "[skip] vendor exists: $vendor" -ForegroundColor DarkGray
}

if (-not (Test-Path $envFile) -or $ForceEnv) {
  Write-FirecrawlEnvTemplate -Port $port
  Write-Host "Wrote $envFile (PORT=$port, USE_DB_AUTHENTICATION=false)" -ForegroundColor Green
}
else {
  Write-Host "[skip] env exists: $envFile (use -ForceEnv to overwrite)" -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Cyan
Write-Host "  yarn firecrawl:up      # docker compose up -d"
Write-Host "  yarn firecrawl:status  # health check http://127.0.0.1:$port"
Write-Host "  yarn scrape:shopping-list --dry-run"
