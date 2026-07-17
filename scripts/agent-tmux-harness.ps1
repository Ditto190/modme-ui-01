#Requires -Version 5.1
param()

$session = 'modme-agent-harness'
$ErrorActionPreference = 'SilentlyContinue'

$tmux = Get-Command tmux -ErrorAction SilentlyContinue
if (-not $tmux) {
    Write-Warning 'tmux not installed; skip tmux harness creation.'
    return
}

try {
    & $tmux.Path has-session -t $session 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "tmux session '$session' already running."
        return
    }
} catch {
    # proceed to creation
}

Write-Host "Creating tmux agent harness session '$session'..."
& $tmux.Path new-session -d -s $session -n 'cmd' powershell -NoProfile -ExecutionPolicy Bypass -Command 'Clear-Host; while ($true) { Start-Sleep -Seconds 3600 }'
if ($LASTEXITCODE -ne 0) {
    Write-Warning 'Failed to create tmux session; skipping harness windows.'
    return
}

& $tmux.Path new-window -t "$session": -n 'lean-ctx' powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path logs/lean-ctx/tee) { Get-ChildItem logs/lean-ctx/tee/*.log 2>$null | ForEach-Object { Get-Content $_ -Tail 10 -Wait } } else { Start-Sleep -Seconds 3600 }"
& $tmux.Path new-window -t "$session": -n 'markers' powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path .cursor/hooks/state/lean-ctx-session-markers.jsonl) { Get-Content .cursor/hooks/state/lean-ctx-session-markers.jsonl -Tail 20 -Wait } else { Start-Sleep -Seconds 3600 }"
Write-Host "tmux harness '$session' ready (attach via 'tmux attach -t $session')."
