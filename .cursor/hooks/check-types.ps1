#Requires -Version 5.1
<#
.SYNOPSIS
  afterFileEdit hook — scoped TypeScript check (advisory, exit 0).
#>

param(
    [string]$FilePath = $env:CURSOR_FILE_PATH
)

$ErrorActionPreference = 'Continue'

if (-not $FilePath) { exit 0 }

$ext = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
if ($ext -notin @('.ts', '.tsx', '.mts', '.cts')) { exit 0 }

$HookDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = (Resolve-Path (Join-Path $HookDir '..\..')).Path
Set-Location $RepoRoot

function Invoke-Tsc {
    param([string]$Project)
    if (-not (Test-Path $Project)) { return }
    Write-Host "[check-types] $Project" -ForegroundColor DarkGray
    & npx --yes tsc -p $Project --noEmit --pretty false 2>$null
}

try {
    if ($FilePath -match '[\\/]next-forge[\\/]') {
        Invoke-Tsc (Join-Path $RepoRoot 'next-forge\tsconfig.json')
    }
    elseif ($FilePath -match '[\\/]GenerativeUI_monorepo[\\/]') {
        $genuiTs = Join-Path $RepoRoot 'GenerativeUI_monorepo\tsconfig.json'
        Invoke-Tsc $genuiTs
    }
    elseif ($FilePath -match '[\\/]scripts[\\/]') {
        Invoke-Tsc (Join-Path $RepoRoot 'scripts\tsconfig.json')
    }
}
catch {
    Write-Warning "[check-types] advisory: $_"
}

exit 0
