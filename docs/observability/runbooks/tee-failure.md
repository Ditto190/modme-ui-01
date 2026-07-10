# Runbook: Tee Failure Captured

**Trigger:** New file appears in `logs/lean-ctx/tee/` (lean-ctx `tee_mode = "failures"` captures shell hook errors).

## Symptoms

- New file in `logs/lean-ctx/tee/`
- `lean-ctx-tee` events appear in `telemetry_events`
- Telemetry dry-run shows `source: lean-ctx-tee` events with `level: error`

## Immediate steps

```powershell
# 1. Inspect the captured failure
Get-ChildItem logs/lean-ctx/tee/ | Sort-Object LastWriteTime -Descending | Select-Object -First 5
$latest = Get-ChildItem logs/lean-ctx/tee/ | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Get-Content $latest.FullName

# 2. Check if it's a known shell command issue
# Common: git commands, yarn, node, Python scripts

# 3. Run telemetry dry-run to see how it's classified
node scripts/telemetry/telemetry-cli.mjs sync --dry-run --human
```

## Common causes

| Cause | Symptom in tee file | Resolution |
|-------|---------------------|------------|
| Git not on PATH | `git: command not found` | Add git to shell PATH |
| Node version mismatch | `SyntaxError: unexpected token` | Switch to Node 22.9+ |
| Python venv not activated | `ModuleNotFoundError` | Activate venv before script |
| lean-ctx shell hook timeout | `Command timed out after 5s` | Increase `slow_command_threshold_ms` |

## Resolution

1. Identify the failing command from the tee file
2. Fix the underlying issue (PATH, version, permissions)
3. Archive or delete tee file after resolution: `Remove-Item logs/lean-ctx/tee/<file>`
4. Tee files are collected into telemetry as `lean-ctx-tee` — they appear in `eval_signals` if severity is high

## Prevention

- `tee_mode = "failures"` (default ModMe) — only captures actual failures, not all output
- `tee_mode = "always"` only for active incident investigation — reset after
