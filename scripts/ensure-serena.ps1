#Requires -Version 5.1
<#
.SYNOPSIS
  Ensure Serena CLI is installed and project config exists (ModMe).
.DESCRIPTION
  Installs serena-agent via uv if missing, runs serena init when needed,
  and verifies .serena/project.yml. Used by yarn serena:ensure and session start.
#>
[CmdletBinding()]
param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Get-SerenaPath {
  $cmd = Get-Command serena -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = Join-Path $env:USERPROFILE ".local\bin\serena.exe"
  if (Test-Path $fallback) { return $fallback }
  return $null
}

$serenaPath = Get-SerenaPath
if (-not $serenaPath) {
  if ($CheckOnly) {
    Write-Error "serena not found. Run: uv tool install -p 3.13 serena-agent"
    exit 1
  }
  if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Error "uv not found. Install: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
  }
  Write-Host "Installing serena-agent via uv..."
  uv tool install -p 3.13 serena-agent
  $serenaPath = Get-SerenaPath
  if (-not $serenaPath) {
    Write-Error "serena still missing after install (expected under ~/.local/bin)"
    exit 1
  }
}

Write-Host "Serena: $serenaPath"
& $serenaPath --version

$globalConfig = Join-Path $env:USERPROFILE ".serena\serena_config.yml"
if (-not (Test-Path $globalConfig)) {
  if ($CheckOnly) {
    Write-Error "Missing $globalConfig - run: serena init"
    exit 1
  }
  Write-Host "Running serena init (LSP backend)..."
  & $serenaPath init -b LSP
}

$projectYml = Join-Path $repoRoot ".serena\project.yml"
if (-not (Test-Path $projectYml)) {
  Write-Error "Missing $projectYml - restore from ADR-0013 / repo template"
  exit 1
}

Write-Host "Project config: $projectYml"
Write-Host "[ok] Serena ready (Cursor MCP auto-starts via .cursor/mcp.json)"
exit 0
