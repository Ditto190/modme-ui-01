#Requires -Version 5.1
<#
.SYNOPSIS
  Health-check and bootstrap ModMe dev environment (auto-run on session start).
.DESCRIPTION
  Runs lean-ctx, worktree doctor, optional bats/shellcheck, and tmux harness.
  Advisory on Windows when bats/shellcheck missing — does not block session start.
#>

param()

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

function Run-Step {
    param(
        [string]$Name,
        [string]$Command,
        [string[]]$StepArgs = @(),
        [string]$WorkingDirectory = $RepoRoot,
        [switch]$Advisory
    )

    Write-Host "==> Running $Name" -ForegroundColor Cyan
    $safeName = ($Name -replace '[^\w]', '_').Trim('_')
    if ([string]::IsNullOrWhiteSpace($safeName)) { $safeName = 'step' }
    $stdout = Join-Path $env:TEMP "$safeName.out"
    $stderr = Join-Path $env:TEMP "$safeName.err"

    $resolved = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $resolved) {
        if ($Advisory) {
            Write-Warning "$Name skipped ($Command not on PATH)"
            return $true
        }
        throw "$Command not found"
    }

    $exe = $resolved.Source
    if ($StepArgs.Count -gt 0) {
        $process = Start-Process -FilePath $exe -ArgumentList $StepArgs -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    }
    else {
        $process = Start-Process -FilePath $exe -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    }

    if ($process.ExitCode -ne 0) {
        Write-Warning "$Name failed (exit $($process.ExitCode))."
        if (Test-Path $stderr) {
            Write-Host (Get-Content $stderr -ErrorAction SilentlyContinue)
        }
        if ($Advisory) { return $false }
        throw "$Name failed"
    }
    return $true
}

$failures = @()
$coreSteps = @(
    @{ Name = 'lean-ctx ensure check'; Command = 'yarn'; StepArgs = @('lean-ctx:ensure:check') },
    @{ Name = 'worktree doctor'; Command = 'yarn'; StepArgs = @('worktree:doctor') },
    @{ Name = 'session verify'; Command = 'yarn'; StepArgs = @('session:verify') }
)

foreach ($step in $coreSteps) {
    try {
        $null = Run-Step -Name $step.Name -Command $step.Command -StepArgs $step.StepArgs
    }
    catch {
        $failures += $step.Name
    }
}

# Bats — advisory on Windows (CI installs via apt)
if (Get-Command bats -ErrorAction SilentlyContinue) {
    try {
        $null = Run-Step -Name 'test shell' -Command 'yarn' -StepArgs @('test:shell') -Advisory
    }
    catch {
        Write-Warning 'test:shell failed (advisory)'
    }
}
else {
    Write-Warning 'bats not on PATH — skipping yarn test:shell (install: scoop install bats or use WSL/CI)'
}

function Run-ShellCheck {
    $shellcheck = Get-Command shellcheck -ErrorAction SilentlyContinue
    if (-not $shellcheck) {
        Write-Warning 'ShellCheck not found; skipping (scoop install shellcheck)'
        return
    }

    $scripts = Get-ChildItem -Path $RepoRoot -Recurse -Include '*.sh', '*.bash' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\\.vendor\\|\\node_modules\\|\\\.worktrees\\' }

    if (-not $scripts -or $scripts.Count -eq 0) {
        Write-Host 'No shell scripts found for ShellCheck'
        return
    }

    $paths = $scripts | ForEach-Object { $_.FullName }
    try {
        $null = Run-Step -Name 'shellcheck' -Command $shellcheck.Source -StepArgs (@('--format', 'gcc') + $paths) -Advisory
    }
    catch {
        Write-Warning 'shellcheck reported issues (advisory)'
    }
}

function Run-DevAgentHarness {
    $harness = Join-Path $RepoRoot 'scripts/agent-tmux-harness.ps1'
    if (Test-Path $harness) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $harness
    }
}

function Run-Fallback {
    Write-Host '==> Running fallback onboarding flow' -ForegroundColor Yellow
    try {
        $null = Run-Step -Name 'workspace bootstrap (shared)' -Command 'yarn' -StepArgs @('workspace:bootstrap:shared') -Advisory
        $null = Run-Step -Name 'lean-ctx ensure (re-run)' -Command 'yarn' -StepArgs @('lean-ctx:ensure') -Advisory
        $null = Run-Step -Name 'worktree doctor (re-run)' -Command 'yarn' -StepArgs @('worktree:doctor') -Advisory
    }
    catch {
        Write-Warning "Fallback step failed: $_"
    }
}

if ($failures.Count -gt 0) {
    Run-Fallback
    $failures.Clear()
    foreach ($step in $coreSteps) {
        try {
            $null = Run-Step -Name $step.Name -Command $step.Command -StepArgs $step.StepArgs
        }
        catch {
            $failures += $step.Name
        }
    }
}

Run-ShellCheck
Run-DevAgentHarness

if ($failures.Count -gt 0) {
    Write-Warning "Health check completed with issues: $($failures -join ', ')"
    exit 0
}

Write-Host 'Dev environment health check passed.' -ForegroundColor Green

Write-Host ''
Write-Host 'ModMe session quick commands' -ForegroundColor Cyan
Write-Host '  Dev bootstrap: yarn workspace:bootstrap:shared'
Write-Host '  (deps+configs) then: yarn session:verify'
Write-Host '  Quality routing:'
Write-Host '    yarn preflight:fast --report'
Write-Host '    yarn quality:route --from docs/devops/reports/preflight-latest.json'
Write-Host ''
Write-Host '  Notes: run yarn preflight until green; then optionally bugbot review.'
exit 0
