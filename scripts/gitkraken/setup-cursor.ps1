#Requires -Version 5.1
<#
.SYNOPSIS
  Verify and configure GitKraken CLI + MCP for Cursor in Monorepo_ModMe.
#>
param(
    [string]$Workspace = 'modme-ui',
    [switch]$SkipMcpInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$GkExe = Join-Path $env:LOCALAPPDATA `
    'Microsoft\WinGet\Packages\GitKraken.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\gk.exe'

function Write-Step([string]$Message) {
    Write-Host "[gitkraken] $Message"
}

function Ensure-GkOnPath {
    if (Get-Command gk -ErrorAction SilentlyContinue) {
        Write-Step 'gk already on PATH'
        return (Get-Command gk).Source
    }

    if (-not (Test-Path $GkExe)) {
        Write-Warning "gk.exe not found at $GkExe. Install: winget install GitKraken.cli"
        return $null
    }

    $gkDir = Split-Path $GkExe -Parent
    $env:PATH = "$gkDir;$env:PATH"
    Write-Step "prepended gk to PATH: $gkDir"
    return $GkExe
}

function Test-GitLensExtension {
    $cursorExtRoot = Join-Path $env:USERPROFILE '.cursor\extensions'
    if (-not (Test-Path $cursorExtRoot)) {
        return $false
    }

    $gitlens = Get-ChildItem -Path $cursorExtRoot -Directory -Filter 'eamodio.gitlens-*' -ErrorAction SilentlyContinue |
        Select-Object -First 1

    return [bool]$gitlens
}

$gkPath = Ensure-GkOnPath
if (-not $gkPath) {
    exit 1
}

Write-Step 'account'
& $gkPath whoami

if ($Workspace) {
    Write-Step "setting workspace: $Workspace"
    & $gkPath workspace set $Workspace 2>&1 | Out-Host
    & $gkPath workspace info 2>&1 | Out-Host
}

if (-not $SkipMcpInstall) {
    Write-Step 'installing GitKraken MCP for Cursor'
    & $gkPath mcp install cursor 2>&1 | Out-Host
    & $gkPath mcp install --list 2>&1 | Out-Host
}

$hasGitLens = Test-GitLensExtension
if ($hasGitLens) {
    Write-Step 'GitLens extension detected (extension-GitKraken MCP available in Cursor)'
} else {
    Write-Warning 'GitLens extension not found. Install eamodio.gitlens in Cursor for Launchpad + graph MCP tools.'
}

Write-Step 'done — restart Cursor and open a new terminal so gk is on PATH'
