#Requires -Version 5.1
<#
.SYNOPSIS
  Install official Cursor plugins from https://github.com/cursor/plugins for this project.
.DESCRIPTION
  Uses agents-pkg to symlink skills, agents, and rules into .cursor/, enables plugins
  in .cursor/settings.json, and copies ralph-loop hook scripts into .cursor/hooks/.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $RepoRoot
try {
    Write-Host '[run] agents-pkg add-plugin cursor/plugins --project...' -ForegroundColor Cyan
    npx --yes agents-pkg add-plugin https://github.com/cursor/plugins --project 2>&1 | Write-Host

    $ralphHooksSrc = Join-Path $env:USERPROFILE '.agents\agents-pkg\marketplace\cursor-plugins\ralph-loop\hooks'
    $hooksDir = Join-Path $RepoRoot '.cursor\hooks'
    foreach ($script in @('stop-hook.sh', 'capture-response.sh')) {
        $src = Join-Path $ralphHooksSrc $script
        if (Test-Path $src) {
            Copy-Item $src (Join-Path $hooksDir $script) -Force
            Write-Host "  [ok] copied $script"
        }
    }

    Write-Host '[ok] Cursor plugins installed. Restart Cursor to reload.' -ForegroundColor Green
    Write-Host 'Plugins: teaching, continual-learning, cursor-team-kit, thermos, create-plugin,'
    Write-Host '         ralph-loop, agent-compatibility, cli-for-agent, pr-review-canvas,'
    Write-Host '         docs-canvas, cursor-sdk, orchestrate, pstack'
}
finally {
    Pop-Location
}
