#Requires -Version 5.1
<#
.SYNOPSIS
  Install or refresh Cursor Cookbook hooks, dag-task-runner skill, and SDK examples.

.DESCRIPTION
  Sources https://github.com/cursor/cookbook (dag-task-runner skill, SDK examples).
  Hook scripts are opt-in via -IncludeHooks; this repo keeps .cursor/hooks.json empty by default.
  Does not overwrite customized hook mappings unless -ForceSkillMappings and -IncludeHooks are set.

.EXAMPLE
  .\scripts\install-cursor-cookbook.ps1
  .\scripts\install-cursor-cookbook.ps1 -SkipSdk
#>
[CmdletBinding()]
param(
    [switch]$SkipSdk,
    [switch]$ForceSkillMappings,
    [switch]$IncludeHooks
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$TempClone = Join-Path $env:TEMP "cursor-cookbook-$(Get-Date -Format 'yyyyMMddHHmmss')"
$CookbookUrl = 'https://github.com/cursor/cookbook.git'

function Write-Step([string]$Message) {
    Write-Host "[cursor-cookbook] $Message"
}

try {
    Write-Step "Cloning $CookbookUrl"
    git clone --depth 1 $CookbookUrl $TempClone | Out-Null

    $hooksDest = Join-Path $RepoRoot '.cursor\hooks'
    if ($IncludeHooks) {
        New-Item -ItemType Directory -Force -Path $hooksDest | Out-Null
        Write-Step "Updated hook scripts in .cursor/hooks/ (opt-in via -IncludeHooks)"
    } else {
        Write-Step 'Skipped hook scripts (project hooks disabled; pass -IncludeHooks to refresh upstream scripts)'
    }

    $skillsDir = Join-Path $RepoRoot '.cursor\skills'
    New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null
    $skillDest = Join-Path $skillsDir 'dag-task-runner'
    Copy-Item -Path (Join-Path $TempClone '.cursor\skills\dag-task-runner') -Destination $skillsDir -Recurse -Force
    Write-Step "Updated .cursor/skills/dag-task-runner/"

    if (-not $SkipSdk) {
        $sdkDest = Join-Path $RepoRoot '.vendor\cursor-cookbook\sdk'
        New-Item -ItemType Directory -Force -Path (Split-Path $sdkDest -Parent) | Out-Null
        Copy-Item -Path (Join-Path $TempClone 'sdk') -Destination (Split-Path $sdkDest -Parent) -Recurse -Force
        Write-Step "Updated .vendor/cursor-cookbook/sdk/"
    }

    if ($ForceSkillMappings -and $IncludeHooks) {
        Copy-Item -Path (Join-Path $TempClone 'hooks\.cursor\hooks\update-skills-on-stop.mjs') -Destination (Join-Path $hooksDest 'update-skills-on-stop.mjs') -Force
        Write-Step "Reset update-skills-on-stop.mjs from upstream (custom mappings removed)"
    }

    $runnerScripts = Join-Path $skillDest 'scripts'
    Push-Location $runnerScripts
    try {
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm install --silent
            if ($LASTEXITCODE -ne 0) {
                throw "pnpm install failed with exit code $LASTEXITCODE"
            }
        } else {
            npm install --silent
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed with exit code $LASTEXITCODE"
            }
        }
        Write-Step "Installed dag-task-runner runtime dependencies"
    } finally {
        Pop-Location
    }

    Write-Step "Done. Project hooks are disabled in .cursor/hooks.json unless you opt in with -IncludeHooks."
    Write-Step "Hook scripts need bash + jq (Git for Windows). Set CURSOR_API_KEY for DAG runs."
}
finally {
    if (Test-Path $TempClone) {
        Remove-Item -Recurse -Force $TempClone
    }
}
