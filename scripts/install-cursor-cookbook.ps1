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
        Copy-Item -Path (Join-Path $TempClone 'hooks\.cursor\hooks\*') -Destination $hooksDest -Force
        Copy-Item -Path (Join-Path $TempClone 'hooks\README.md') -Destination (Join-Path $hooksDest 'README.md') -Force
        # Windows Git Bash: upstream uses </dev/stdin> which fails under MSYS pipes
        $blockModels = Join-Path $hooksDest 'block-models-by-repo-origin.sh'
        if (Test-Path $blockModels) {
            $blockContent = Get-Content $blockModels -Raw
            if ($blockContent -match '</dev/stdin>') {
                $blockContent = $blockContent -replace 'payload="\$\(</dev/stdin\)"', @'
# Use `cat` — `</dev/stdin` is unavailable in some Windows Git Bash / MSYS environments.
payload="$(cat)"
if [[ -z "${payload//[[:space:]]/}" ]]; then
  payload="{}"
fi
'@
                [System.IO.File]::WriteAllText($blockModels, $blockContent, [System.Text.UTF8Encoding]::new($false))
                Write-Step 'Patched block-models-by-repo-origin.sh for Windows stdin'
            }
        }
        Write-Step "Updated hook scripts in .cursor/hooks/ (opt-in via -IncludeHooks)"
    } else {
        Write-Step 'Skipped hook scripts (project hooks disabled; pass -IncludeHooks to refresh upstream scripts)'
    }

    $skillDest = Join-Path $RepoRoot '.cursor\skills\dag-task-runner'
    Copy-Item -Path (Join-Path $TempClone '.cursor\skills\dag-task-runner') -Destination (Join-Path $RepoRoot '.cursor\skills') -Recurse -Force
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
        } else {
            npm install --silent
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
