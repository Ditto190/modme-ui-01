# Run Scrapy scrape-pipeline with a Python that has scrape-pipeline installed.
param(
  [string]$Manifest = "docs-sitemap",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$ScrapeDir = Join-Path $Root "GenerativeUI_monorepo\scrape-pipeline"

. (Join-Path $PSScriptRoot "lib\supabase-paths.ps1")
$paths = Get-ForgePaths
if (Test-Path $paths.RootEnv) {
  Import-DotEnvFile -Path $paths.RootEnv
}

function Get-ExePath($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Find-ScrapePython {
  $candidates = @()
  $pyPath = Get-ExePath "python"
  if ($pyPath) { $candidates += $pyPath }
  $pyLauncher = Get-ExePath "py"
  if ($pyLauncher) { $candidates += $pyLauncher }

  foreach ($exe in $candidates) {
    & $exe -c "import yaml, scrape_pipeline" 2>$null
    if ($LASTEXITCODE -eq 0) { return $exe }
  }

  if ($pyPath) {
    Write-Host "Installing scrape-pipeline into: $pyPath" -ForegroundColor Yellow
    Push-Location $ScrapeDir
    try {
      & $pyPath -m pip install -e . -q
      if ($LASTEXITCODE -ne 0) { throw "pip install failed" }
      return $pyPath
    }
    finally {
      Pop-Location
    }
  }

  throw "No Python with PyYAML found. Run: pip install -e GenerativeUI_monorepo/scrape-pipeline"
}

$python = Find-ScrapePython
$pyArgs = @("-m", "scrape_pipeline", "--manifest", $Manifest)
if ($DryRun) { $pyArgs += "--dry-run" }

Push-Location $ScrapeDir
try {
  & $python @pyArgs
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
