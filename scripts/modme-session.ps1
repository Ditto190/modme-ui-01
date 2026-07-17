# ModMe session lifecycle dispatcher - terminal, session-start, pre-launch, session-end, verify.
# Usage:
#   .\scripts\modme-session.ps1 -Phase terminal
#   .\scripts\modme-session.ps1 -Phase session-start
#   .\scripts\modme-session.ps1 -Phase pre-launch
#   .\scripts\modme-session.ps1 -Phase verify
#   .\scripts\modme-session.ps1 -Phase session-end -DryRun

param(
    [ValidateSet('terminal', 'session-start', 'pre-launch', 'session-end', 'verify')]
    [string]$Phase = 'terminal',
    [string]$RepoRoot = '',
    [switch]$DryRun,
    [switch]$Yes,
    [switch]$SkipPull,
    [switch]$Push,
    [switch]$CreatePr,
    [string]$CommitMessage = ''
)

$ErrorActionPreference = 'Stop'
$ScriptsDir = $PSScriptRoot
if (-not $RepoRoot) { $RepoRoot = Split-Path $ScriptsDir -Parent }

. (Join-Path $ScriptsDir 'lib\modme-env-bootstrap.ps1')

function Invoke-SyncEnvIfNeeded {
    $rootEnv = Join-Path $RepoRoot '.env'
    if (-not (Test-Path $rootEnv)) { return }
    $sync = Join-Path $ScriptsDir 'sync-env-from-root.ps1'
    if (-not (Test-Path $sync)) { return }
    if ($DryRun) {
        Write-Host '[modme-session] dry-run: would run sync-env-from-root.ps1' -ForegroundColor DarkYellow
        return
    }
    & $sync
}

function Invoke-WorktreeDoctorWarn {
    $doctor = Join-Path $ScriptsDir 'worktree-doctor.ps1'
    if (-not (Test-Path $doctor)) { return }
    if ($DryRun) { return }
    & $doctor -WarnOnly 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[modme-session] worktree:doctor reported issues (yarn worktree:doctor:fix)' -ForegroundColor Yellow
    }
}

function Invoke-SessionEndMarker {
    $stateDir = Join-Path $RepoRoot '.cursor\hooks\state'
    if (-not (Test-Path $stateDir)) { New-Item -ItemType Directory -Force -Path $stateDir | Out-Null }
    $marker = Join-Path $stateDir 'modme-session-end.jsonl'
    $entry = @{
        ts    = (Get-Date).ToUniversalTime().ToString('o')
        phase = 'session-end'
        cwd   = $RepoRoot
    } | ConvertTo-Json -Compress
    if (-not $DryRun) { Add-Content -Path $marker -Value $entry -Encoding UTF8 }
}

switch ($Phase) {
    'terminal' {
        Import-ModMeEnv -RepoRoot $RepoRoot -Quiet | Out-Null
        $profile = Join-Path $RepoRoot '.config\powershell\Microsoft.PowerShell_profile.ps1'
        if (Test-Path $profile) { . $profile }
        Write-Host 'ModMe terminal ready - yarn dev:forge:core | yarn setup:modme | modme-help' -ForegroundColor Cyan
    }
    'session-start' {
        Import-ModMeEnv -RepoRoot $RepoRoot -Quiet
        Invoke-SyncEnvIfNeeded
        $path = Write-ModMeRuntimeEnvFile -RepoRoot $RepoRoot
        Write-Host "[modme-session] runtime env: $path" -ForegroundColor DarkGray
        Invoke-WorktreeDoctorWarn
    }
    'pre-launch' {
        $path = Write-ModMeRuntimeEnvFile -RepoRoot $RepoRoot
        Write-Host "[modme-session] pre-launch env: $path" -ForegroundColor DarkGray
    }
    'session-end' {
        Invoke-SessionEndMarker
        $finish = Join-Path $ScriptsDir 'vibe-session-finish.ps1'
        if ($Yes -or $DryRun -or $CommitMessage) {
            if (Test-Path $finish) {
                & $finish @PSBoundParameters
            }
        } else {
            Write-Host '[modme-session] session-end marker written. Use vibe-session-finish.ps1 or -Yes -CommitMessage for git.' -ForegroundColor DarkGray
        }
    }
    'verify' {
        $result = Test-ModMeEnv -RepoRoot $RepoRoot
        if ($result.Issues.Count -gt 0) {
            foreach ($i in $result.Issues) { Write-Warning $i }
            exit 1
        }
        Write-Host "[modme-session] verify ok - runtime: $($result.RuntimeEnvFile)" -ForegroundColor Green
    }
}
