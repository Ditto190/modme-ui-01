#Requires -Version 5.1
<#
.SYNOPSIS
  Initialize / apply catalog CMS schema in config/dolt/catalog.
#>
$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$CatalogPath = Join-Path $RepoRoot 'config\dolt\catalog'
$SchemaPath = Join-Path $CatalogPath 'schema.sql'

$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [System.Environment]::GetEnvironmentVariable('Path', 'User')

if (-not (Get-Command dolt -ErrorAction SilentlyContinue)) {
  Write-Error 'dolt not on PATH'
}

if (-not (Test-Path $SchemaPath)) {
  Write-Error "Missing schema: $SchemaPath"
}

New-Item -ItemType Directory -Force -Path $CatalogPath | Out-Null
Push-Location $CatalogPath
try {
  if (-not (Test-Path (Join-Path $CatalogPath '.dolt'))) {
    Write-Host 'Initializing modme-catalog Dolt repo...' -ForegroundColor Cyan
    dolt init --name ModMe --email dolt@modme.local
  }
  Write-Host 'Applying schema.sql...' -ForegroundColor Cyan
  dolt sql -f schema.sql
  dolt add .
  dolt commit -m "chore(catalog): apply agent catalog CMS schema" 2>$null
  Write-Host 'Catalog schema applied.' -ForegroundColor Green
  dolt status
}
finally {
  Pop-Location
}
