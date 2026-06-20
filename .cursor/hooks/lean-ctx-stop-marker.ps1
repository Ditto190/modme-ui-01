# Advisory stop hook: append session end marker for memory / continual-learning pipelines.
# Always exit 0 — never block agent stop.
$ErrorActionPreference = 'SilentlyContinue'

$stateDir = Join-Path $PSScriptRoot 'state'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

$marker = Join-Path $stateDir 'lean-ctx-session-markers.jsonl'
$entry = @{
  at       = (Get-Date).ToUniversalTime().ToString('o')
  cwd      = (Get-Location).Path
  branch   = (git branch --show-current 2>$null)
  hint     = 'Run ctx_session save + ctx_knowledge consolidate via lean-ctx MCP at session end'
} | ConvertTo-Json -Compress

Add-Content -Path $marker -Value $entry -Encoding utf8
Write-Host '[lean-ctx hook] session marker written — consider ctx_session save via MCP' -ForegroundColor DarkGray
exit 0
