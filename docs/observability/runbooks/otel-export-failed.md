# Runbook: OTel Export Failed

**Alert:** OTel span flush failed on session finish  
**Severity:** high  
**SLI impact:** Span export success rate (target >99%); `trace_refs.greptime_span_id` will be null

## Symptoms

- `scripts/agent-session-finish.ps1` exits with non-zero code
- `trace_refs` row inserted but `greptime_span_id` is null
- `agenttrace --latest` reports `span_export_status: failed`
- Greptime `agent_spans` table missing rows for the session
- Console: `OTLP export error`, `connection refused`, or `X-Greptime-DB-Name missing`

## Immediate actions

```powershell
# Check Greptime is reachable
$host = $env:GREPTIME_HOST ?? "localhost:4000"
Test-NetConnection -ComputerName $host.Split(":")[0] -Port ([int]$host.Split(":")[1])

# Dry-run OTel session start
node scripts/telemetry/otel-session-start.mjs --dry-run

# Check env vars
Write-Output "GREPTIME_HOST: $env:GREPTIME_HOST"
Write-Output "GREPTIME_DB: $env:GREPTIME_DB"
Write-Output "OTEL_EXPORTER_OTLP_ENDPOINT: $env:OTEL_EXPORTER_OTLP_ENDPOINT"
```

## Root causes

| Cause | Error | Fix |
|-------|-------|-----|
| Greptime not running | `connection refused :4000` | See [`greptime-down.md`](./greptime-down.md) |
| Wrong OTLP endpoint | `404` or `connection refused` | Set `OTEL_EXPORTER_OTLP_ENDPOINT` correctly |
| Missing `X-Greptime-DB-Name` header | `401` or `400` from Greptime | Verify `GREPTIME_DB` env var + `greptime-config.ts` header config |
| Session finished before OTel init | Span root span null | Check `otel-session-start.mjs` called before work starts |
| Exporter timeout | `ETIMEDOUT` | Increase `OTEL_EXPORTER_OTLP_TIMEOUT_MS` (default 5000) |
| Auth failure (cloud Greptime) | `403` | Verify `GREPTIME_AUTH_TOKEN` set |

## Resolution

```powershell
# 1. Ensure Greptime is running (local)
# See greptime-down.md if not running

# 2. Re-export the session spans (replay)
node scripts/telemetry/telemetry-cli.mjs sync --session=$env:AGENT_SESSION_ID --retry-otel

# 3. Update trace_refs with recovered span ID
# (telemetry-bridge.mjs auto-retries on sync --retry-otel)

# 4. Verify
yarn agenttrace --latest
```

## Retry policy

The telemetry-bridge applies exponential backoff (3 retries, 1s/2s/4s) before marking export failed. A `trace_refs` row is still written with `greptime_span_id = null` to preserve Supabase metadata.

## Prevention

- Always run `yarn lean-ctx:ensure` at session start (loads Greptime env)
- Run `node scripts/telemetry/otel-session-start.mjs --dry-run` in CI pre-flight
- Set `OTEL_EXPORTER_OTLP_TIMEOUT_MS=10000` for slow networks

## Related

- `src/lib/observability/greptime-config.ts` — TypeScript OTel setup
- `agent/observability/greptime_config.py` — Python OTel setup
- [`runbooks/greptime-down.md`](./greptime-down.md) — if Greptime is not reachable
- [`docs/observability/README.md`](../README.md)
