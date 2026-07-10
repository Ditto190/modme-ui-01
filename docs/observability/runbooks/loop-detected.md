# Runbook: lean-ctx Loop Detected

**Trigger:** `blocked_threshold` (6) identical calls in 300s window — lean-ctx blocks the call with guidance.

## Symptoms

- lean-ctx response contains: `"loop detected"` or `"call blocked"`
- `[loop_detection]` entry in `logs/lean-ctx/debug.log`
- Same tool call repeating without progress

## Immediate steps

```powershell
# 1. Enable debug log to see fingerprint
$env:LEAN_CTX_DEBUG_LOG = "1"

# 2. Replay the failing call — debug log captures routing trace
# Look for: logs/lean-ctx/debug.log (set via LEAN_CTX_STATE_DIR)

# 3. Check loop detection state
lean-ctx loop-stats   # (if available in your lean-ctx version)
```

## Root cause checklist

- [ ] Agent is repeating the same `ctx_read` / `ctx_search` without acting on results → change read mode or scope
- [ ] Agent is in a "verify → fail → retry" cycle → check if verification command is broken
- [ ] Search pattern is too broad → narrow `ctx_search` to specific directory
- [ ] Tool result not being used → ensure agent uses returned content before next call

## Resolution

1. Break the loop by changing the approach (different tool, different scope, different query)
2. If debug log reveals a specific tool bottleneck, add it to `[loop_detection.tool_total_limits]` in `.lean-ctx.toml`
3. After resolution, clear debug log env: `Remove-Item Env:LEAN_CTX_DEBUG_LOG`

## Telemetry

lean-ctx tee captures blocked calls → `logs/lean-ctx/tee/`. These appear as `lean-ctx-tee` events in `telemetry_events`.

## References

- `.lean-ctx.toml` `[loop_detection]` section
- `docs/lean-ctx/data-dictionary.md` — loop detection key reference
