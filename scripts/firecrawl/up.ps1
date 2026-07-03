# Start self-hosted Firecrawl via Docker Compose.
# Usage: yarn firecrawl:up

param(
  [switch]$Build
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib.ps1')

$vendor = Get-FirecrawlVendorDir
$port = Get-FirecrawlPort

if (-not (Test-Path $vendor)) {
  Write-Error "Run yarn firecrawl:setup first (vendor missing: $vendor)"
}

if (-not (Test-DockerAvailable)) {
  Write-Error 'Docker is not running. Start Docker Desktop, then retry yarn firecrawl:up'
}

Write-Host "== Firecrawl up (PORT=$port) ==" -ForegroundColor Cyan

$args = @('up', '-d')
if ($Build) { $args = @('up', '-d', '--build') }

Invoke-FirecrawlCompose -ComposeArgs $args | Out-Null

Write-Host ''
Write-Host "Firecrawl starting at http://127.0.0.1:$port" -ForegroundColor Green
Write-Host '  yarn firecrawl:status'
Write-Host '  Admin UI: http://127.0.0.1:'"$port/admin/modme-local/queues"
