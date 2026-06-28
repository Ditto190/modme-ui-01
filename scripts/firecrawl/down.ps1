# Stop self-hosted Firecrawl Docker stack.
# Usage: yarn firecrawl:down

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib.ps1')

if (-not (Test-Path (Get-FirecrawlVendorDir))) {
  Write-Host 'Firecrawl vendor not installed — nothing to stop.' -ForegroundColor Yellow
  exit 0
}

Write-Host '== Firecrawl down ==' -ForegroundColor Cyan
Invoke-FirecrawlCompose -ComposeArgs @('down') -AllowFailure | Out-Null
Write-Host 'Firecrawl stack stopped.' -ForegroundColor Green
