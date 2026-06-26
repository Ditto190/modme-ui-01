# Advisory stop/sessionEnd hook: session-logger end, marker, optional offline docs + agenttrace.
param(
    [ValidateSet('stop', 'end')]
    [string]$Phase = 'stop'
)

$ErrorActionPreference = 'SilentlyContinue'

if ($env:SKIP_LOGGING -eq '1') { exit 0 }

$HookDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $HookDir '..\..')).Path
$StateDir = Join-Path $HookDir 'state'
$SessionStatePath = Join-Path $StateDir 'current-session.json'
$MarkerPath = Join-Path $StateDir 'lean-ctx-session-markers.jsonl'
$SessionLogger = Join-Path $RepoRoot '.github\hooks\session-logger\session-logger.ps1'

$sessionId = $null
if (Test-Path $SessionStatePath) {
    $state = Get-Content $SessionStatePath -Raw | ConvertFrom-Json
    $sessionId = $state.id
}

Push-Location $RepoRoot
try {
    if (Test-Path $SessionLogger) {
        & $SessionLogger -Action end -SessionId $sessionId | Out-Null
        $eventName = if ($Phase -eq 'end') { 'sessionEnd' } else { 'sessionStop' }
        & $SessionLogger -Action event -SessionId $sessionId -EventName $eventName | Out-Null
    }

    $entry = @{
        at     = (Get-Date).ToUniversalTime().ToString('o')
        phase  = $Phase
        cwd    = $RepoRoot
        branch = (git -C $RepoRoot branch --show-current 2>$null)
        id     = $sessionId
        hint   = 'Run ctx_session save + ctx_knowledge consolidate via lean-ctx MCP'
    } | ConvertTo-Json -Compress

    Add-Content -Path $MarkerPath -Value $entry -Encoding utf8
}
finally {
    Pop-Location
}

Write-Host '[lean-ctx] session capture — run: yarn session:docs; yarn eval:collect; ctx_session save' -ForegroundColor DarkGray
exit 0
