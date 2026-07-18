#Requires -Version 5.1
<#
.SYNOPSIS
  Migrate Beads from embedded Dolt to local sql-server mode (port 3307).
#>
param(
  [string]$HostAddr = '127.0.0.1',
  [int]$Port = 3307,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @"
scripts/dolt/migrate-beads-server.ps1

  1. Ensures yarn dolt:up is running
  2. Exports beads backup
  3. Sets BEADS_DOLT_SERVER_* and configures server mode when supported

  Multi-worktree: one shared sql-server; each worktree uses the same host/port.
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
Set-Location $RepoRoot

$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [System.Environment]::GetEnvironmentVariable('Path', 'User')

$upScript = Join-Path $RepoRoot 'scripts\dolt\up.ps1'
& $upScript -HostAddr $HostAddr -Port $Port

$env:BEADS_DOLT_SERVER_HOST = $HostAddr
$env:BEADS_DOLT_SERVER_PORT = "$Port"
$env:BEADS_DOLT_SERVER_USER = 'root'

Write-Host 'Exporting beads backup...' -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot '.beads') | Out-Null
npx --yes @beads/bd export --all -o .beads/backup-pre-server-migrate.jsonl 2>&1 | Out-Host

# Persist env hint for worktrees
$envFile = Join-Path $RepoRoot '.dolt-data\beads-server.env'
@"
BEADS_DOLT_SERVER_HOST=$HostAddr
BEADS_DOLT_SERVER_PORT=$Port
BEADS_DOLT_SERVER_USER=root
"@ | Set-Content -Path $envFile -Encoding utf8

# Try bd config / migrate to server if available
$helpOut = npx --yes @beads/bd init --help 2>&1 | Out-String
if ($helpOut -match '--server') {
  Write-Host 'Configuring beads for Dolt sql-server...' -ForegroundColor Cyan
  # Non-destructive: set config keys if supported
  npx --yes @beads/bd config set dolt.server-host $HostAddr 2>&1 | Out-Host
  npx --yes @beads/bd config set dolt.server-port "$Port" 2>&1 | Out-Host
}

# Update metadata expectation file for agents (informational; bd owns real state)
$metaPath = Join-Path $RepoRoot '.beads\metadata.json'
if (Test-Path $metaPath) {
  try {
    $meta = Get-Content $metaPath -Raw | ConvertFrom-Json
    $meta | Add-Member -NotePropertyName 'dolt_server_host' -NotePropertyValue $HostAddr -Force
    $meta | Add-Member -NotePropertyName 'dolt_server_port' -NotePropertyValue $Port -Force
    $meta | Add-Member -NotePropertyName 'dolt_server_recommended' -NotePropertyValue $true -Force
    $meta | ConvertTo-Json | Set-Content $metaPath -Encoding utf8
  }
  catch {
    Write-Warning "Could not annotate metadata.json: $_"
  }
}

Write-Host 'Verifying beads ready...' -ForegroundColor Cyan
npx --yes @beads/bd ready 2>&1 | Out-Host

Write-Host @"

Beads server migration prep complete.
  Env file: $envFile
  Load in shells: . .\.dolt-data\beads-server.env  (or set BEADS_DOLT_* in profile)

  Note: If bd remains on embedded mode, keep sql-server for catalog CMS;
  full --server cutover may require ``bd init --server`` on a fresh clone
  after ``bd backup`` (see Beads DOLT.md). Embedded + shared catalog server
  is the supported dual path until you designate a migrator for --server.
"@ -ForegroundColor Green
