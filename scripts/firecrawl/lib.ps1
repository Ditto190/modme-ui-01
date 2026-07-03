# Shared helpers for ModMe self-hosted Firecrawl (Docker).
$ErrorActionPreference = 'Stop'

$Script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Script:VendorDir = Join-Path $Script:RepoRoot '.vendor\firecrawl'
$Script:EnvFile = Join-Path $Script:VendorDir '.env'
$Script:DefaultPort = 3022

function Get-FirecrawlRepoRoot { $Script:RepoRoot }
function Get-FirecrawlVendorDir { $Script:VendorDir }
function Get-FirecrawlEnvFile { $Script:EnvFile }
function Get-FirecrawlPort {
  if (Test-Path $Script:EnvFile) {
    $line = Get-Content $Script:EnvFile | Where-Object { $_ -match '^\s*PORT\s*=' } | Select-Object -First 1
    if ($line -match '=\s*(\d+)') { return [int]$Matches[1] }
  }
  return $Script:DefaultPort
}

function Test-DockerAvailable {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  docker info 2>&1 | Out-Null
  $ok = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prevEap
  return $ok
}

function Get-DockerComposeInvocation {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  docker compose version 2>&1 | Out-Null
  $usesComposePlugin = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prevEap
  if ($usesComposePlugin) { return @{ Command = 'docker'; Args = @('compose') } }
  return @{ Command = 'docker-compose'; Args = @() }
}

function Invoke-FirecrawlCompose {
  param(
    [Parameter(Mandatory)][string[]]$ComposeArgs,
    [switch]$AllowFailure
  )
  if (-not (Test-Path $Script:VendorDir)) {
    throw "Firecrawl vendor missing at $($Script:VendorDir). Run: yarn firecrawl:setup"
  }
  $inv = Get-DockerComposeInvocation
  Push-Location $Script:VendorDir
  try {
    & $inv.Command @($inv.Args + $ComposeArgs)
    if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
      throw "docker compose failed (exit $LASTEXITCODE): $($ComposeArgs -join ' ')"
    }
    return $LASTEXITCODE
  }
  finally { Pop-Location }
}

function Write-FirecrawlEnvTemplate {
  param([int]$Port = $Script:DefaultPort)
  $content = @"
# ModMe self-hosted Firecrawl (local-only, no cloud auth)
PORT=$Port
HOST=0.0.0.0
USE_DB_AUTHENTICATION=false
BULL_AUTH_KEY=modme-local
"@
  [System.IO.File]::WriteAllText($Script:EnvFile, $content.TrimEnd() + "`n", [System.Text.UTF8Encoding]::new($false))
}
