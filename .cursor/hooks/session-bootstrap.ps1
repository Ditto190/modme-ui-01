# Advisory sessionStart hook: session-logger + current-session state. Always exit 0.
param()

$ErrorActionPreference = 'SilentlyContinue'

if ($env:SKIP_LOGGING -eq '1') { exit 0 }

$HookDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $HookDir '..\..')).Path
$StateDir = Join-Path $HookDir 'state'
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

$SessionLogger = Join-Path $RepoRoot '.github\hooks\session-logger\session-logger.ps1'
$SessionStatePath = Join-Path $StateDir 'current-session.json'

Push-Location $RepoRoot
try {
    if (Test-Path $SessionLogger) {
        & $SessionLogger -Action start | Out-Null
    }

    $sessionId = [guid]::NewGuid().ToString()

    $state = @{
        id        = $sessionId
        startedAt = (Get-Date).ToUniversalTime().ToString('o')
        cwd       = $RepoRoot
        branch    = (git -C $RepoRoot branch --show-current 2>$null)
        worktree  = ($RepoRoot -match 'Monorepo_ModMe-dev')
    } | ConvertTo-Json -Compress

    Set-Content -Path $SessionStatePath -Value $state -Encoding utf8
}
finally {
    Pop-Location
}

Write-Host '[lean-ctx] session started — MCP: ctx_session load, ctx_knowledge wakeup, ctx_agent register' -ForegroundColor DarkGray
exit 0
