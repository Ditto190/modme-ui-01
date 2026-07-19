#Requires -Version 5.1
<#
.SYNOPSIS
  ModMe launch orchestrator — health, KM verify, session bootstrap.
.DESCRIPTION
  Advisory by default (exit 0). Modes: auto, health, full, verify, km-verify, session-start.
  State: .cursor/hooks/state/modme-launch.json (idempotent auto mode).
#>

param(
    [ValidateSet('auto', 'health', 'full', 'verify', 'km-verify', 'session-start')]
    [string]$Mode = 'health',
    [switch]$Strict,
    [switch]$Force
)

$ErrorActionPreference = 'Continue'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

$StateDir = Join-Path $RepoRoot '.cursor\hooks\state'
$StateFile = Join-Path $StateDir 'modme-launch.json'
$ManifestPath = Join-Path $ScriptDir 'modme-session.manifest.json'

function Ensure-StateDir {
    if (-not (Test-Path $StateDir)) {
        New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
    }
}

function Read-LaunchState {
    Ensure-StateDir
    if (-not (Test-Path $StateFile)) {
        return @{
            version   = 1
            lastMode  = $null
            lastRunAt = $null
            sessionId = $env:CURSOR_SESSION_ID
        }
    }
    try {
        $parsed = Get-Content $StateFile -Raw | ConvertFrom-Json
        return @{
            version   = $parsed.version
            lastMode  = $parsed.lastMode
            lastRunAt = $parsed.lastRunAt
            sessionId = $parsed.sessionId
        }
    }
    catch {
        return @{ version = 1; lastMode = $null; lastRunAt = $null }
    }
}

function Write-LaunchState {
    param([hashtable]$State)
    Ensure-StateDir
    $State.lastRunAt = (Get-Date).ToUniversalTime().ToString('o')
    if ($env:CURSOR_SESSION_ID) { $State.sessionId = $env:CURSOR_SESSION_ID }
    ($State | ConvertTo-Json -Depth 4) | Set-Content -Path $StateFile -Encoding UTF8
}

function Invoke-YarnStep {
    param(
        [string]$Name,
        [string[]]$StepArgs,
        [switch]$Advisory
    )

    Write-Host "==> $Name" -ForegroundColor Cyan
    & yarn @StepArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "$Name failed (exit $LASTEXITCODE)"
        if (-not $Advisory) { return $false }
    }
    return $true
}

function Invoke-KmVerify {
    param([switch]$Advisory)

    $env:BEADS_DISABLED = '1'
    $tests = @(
        'scripts/__tests__/beads-hooks.test.mjs',
        'scripts/__tests__/km-pipeline.e2e.test.mjs',
        'scripts/__tests__/issue-autotag.test.mjs',
        'scripts/__tests__/inbox-contract.test.mjs'
    )
    $ok = Invoke-YarnStep -Name 'KM vitest gate' -StepArgs (@(
        'vitest', 'run', '--config', 'vitest.config.mjs'
    ) + $tests) -Advisory:$Advisory
    if ($ok) {
        $null = Invoke-YarnStep -Name 'journal:inbox:dry-run' -StepArgs @('journal:inbox:dry-run') -Advisory
        $null = Invoke-YarnStep -Name 'intake:dry-run' -StepArgs @('intake:dry-run') -Advisory
    }
    return $ok
}

function Invoke-SessionVerify {
    $session = Join-Path $ScriptDir 'modme-session.ps1'
    if (-not (Test-Path $session)) {
        Write-Warning 'modme-session.ps1 not found — skipping verify'
        return $true
    }
    & $session -Phase verify -RepoRoot $RepoRoot
    if ($LASTEXITCODE -ne 0) { return $false }
    return $true
}

function Invoke-HealthSteps {
    $failures = @()
    foreach ($step in @(
            @{ Name = 'lean-ctx ensure check'; StepArgs = @('lean-ctx:ensure:check') },
            @{ Name = 'worktree doctor'; StepArgs = @('worktree:doctor') }
        )) {
        if (-not (Invoke-YarnStep -Name $step.Name -StepArgs $step.StepArgs -Advisory)) {
            $failures += $step.Name
        }
    }

    if (-not (Invoke-SessionVerify)) {
        $failures += 'session verify'
    }

    $shellTests = Join-Path $ScriptDir 'run-shell-tests.ps1'
    if (Test-Path $shellTests) {
        Write-Host '==> test:shell (devbox / Git Bash / WSL)' -ForegroundColor Cyan
        & $shellTests -Advisory
        if ($LASTEXITCODE -ne 0) {
            $failures += 'test:shell'
        }
    }
    else {
        Write-Warning 'run-shell-tests.ps1 not found — skipping shell tests'
    }

    return $failures
}

function Invoke-SessionStart {
    $session = Join-Path $ScriptDir 'modme-session.ps1'
    if (Test-Path $session) {
        & $session -Phase session-start -RepoRoot $RepoRoot
    }
    else {
        Write-Warning 'modme-session.ps1 not found — skipping session-start phase'
    }
}

function Invoke-FullLaunch {
    $failures = Invoke-HealthSteps
    if ($failures.Count -gt 0) {
        Write-Host '==> fallback bootstrap (advisory)' -ForegroundColor Yellow
        $null = Invoke-YarnStep -Name 'workspace bootstrap shared' -StepArgs @('workspace:bootstrap:shared') -Advisory
        $null = Invoke-YarnStep -Name 'lean-ctx ensure' -StepArgs @('lean-ctx:ensure') -Advisory
        $failures = Invoke-HealthSteps
    }
    $null = Invoke-KmVerify -Advisory
    Invoke-SessionStart
    return $failures
}

# Idempotent auto — once per shell session unless -Force
if ($Mode -eq 'auto') {
    if ($env:MODME_LAUNCH_DONE -eq '1' -and -not $Force) {
        Write-Host '[modme-launch] auto skipped (MODME_LAUNCH_DONE=1)' -ForegroundColor DarkGray
        exit 0
    }
    $state = Read-LaunchState
    if ($state.lastMode -eq 'auto' -and $env:CURSOR_SESSION_ID -and $state.sessionId -eq $env:CURSOR_SESSION_ID -and -not $Force) {
        Write-Host '[modme-launch] auto skipped (already ran this Cursor session)' -ForegroundColor DarkGray
        $env:MODME_LAUNCH_DONE = '1'
        exit 0
    }
    $Mode = 'health'
}

$issues = @()
switch ($Mode) {
    'verify' {
        $session = Join-Path $ScriptDir 'modme-session.ps1'
        & $session -Phase verify -RepoRoot $RepoRoot
        if ($LASTEXITCODE -ne 0) { $issues += 'session verify' }
    }
    'km-verify' {
        if (-not (Invoke-KmVerify)) { $issues += 'km-verify' }
    }
    'session-start' {
        Invoke-SessionStart
    }
    'health' {
        $issues = Invoke-HealthSteps
    }
    'full' {
        $issues = Invoke-FullLaunch
    }
}

$state = Read-LaunchState
$state.lastMode = $Mode
Write-LaunchState -State $state

if ($Mode -in @('auto', 'health', 'full')) {
    $env:MODME_LAUNCH_DONE = '1'
}

if ($issues.Count -gt 0) {
    Write-Warning "modme-launch ($Mode) completed with issues: $($issues -join ', ')"
    if ($Strict) { exit 1 }
    exit 0
}

Write-Host "modme-launch ($Mode) ok." -ForegroundColor Green
if (Test-Path $ManifestPath) {
    Write-Host "  yarn launch:health | yarn launch:full | yarn km:verify" -ForegroundColor DarkGray
}
exit 0
