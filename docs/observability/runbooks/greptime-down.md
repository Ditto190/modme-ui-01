# Runbook: Greptime Down

**Alert:** Greptime instance unreachable or unhealthy  
**Severity:** medium (Supabase ingest still works; spans lost)  
**SLI impact:** Span export success rate; `trace_refs.greptime_span_id` will be null for affected sessions

## Symptoms

- `node scripts/telemetry/otel-session-start.mjs --dry-run` fails with connection error
- `Test-NetConnection localhost 4000` fails
- OTel exporter logs `OTLP export failed: ECONNREFUSED`
- `agenttrace --latest` shows `span_export_status: failed`
- `trace_refs` rows have `greptime_span_id = null`

## Immediate actions

```powershell
# Check if Greptime process is running
Get-Process | Where-Object { $_.Name -like "*greptime*" }

# Test OTLP HTTP port
$greptimeHost = ($env:GREPTIME_HOST ?? "localhost:4000").Split(":")
Test-NetConnection -ComputerName $greptimeHost[0] -Port ([int]$greptimeHost[1])

# Check Greptime health endpoint
try { Invoke-RestMethod "http://$($env:GREPTIME_HOST ?? 'localhost:4000')/health" } catch { $_.Exception.Message }
```

## Root causes

| Cause | Fix |
|-------|-----|
| Local Greptime not started | Start with `greptime standalone start` (see below) |
| Wrong port in `GREPTIME_HOST` | Verify env var matches actual Greptime bind port |
| Cloud Greptime auth expired | Rotate `GREPTIME_AUTH_TOKEN`; update `.env` |
| Greptime crashed / OOM | Restart; check `logs/greptime/` for error |
| Docker not running (if containerized) | Start Docker Desktop |

## Resolution

### Local Greptime (development)

```powershell
# Start standalone Greptime
greptime standalone start

# Or if using Docker
docker run -p 4000-4003:4000-4003 greptime/greptimedb standalone start

# Verify
Invoke-RestMethod "http://localhost:4000/health"
```

### Cloud Greptime

```powershell
# Verify endpoint and credentials
Write-Output "Endpoint: $env:OTEL_EXPORTER_OTLP_ENDPOINT"
Write-Output "DB name: $env:GREPTIME_DB"

# Test auth
$headers = @{
  "X-Greptime-DB-Name" = $env:GREPTIME_DB
  "Authorization" = "Basic $env:GREPTIME_AUTH_TOKEN"
}
Invoke-RestMethod -Uri "$env:OTEL_EXPORTER_OTLP_ENDPOINT/health" -Headers $headers
```

### Operate without Greptime (degraded mode)

Supabase ingest continues working when Greptime is down. Set to skip Greptime export:

```powershell
$env:SKIP_OTEL_EXPORT = "true"
yarn telemetry:sync
# trace_refs rows will have greptime_span_id = null
# Spans can be replayed when Greptime recovers
```

### Replay spans after recovery

```powershell
# Re-export pending sessions (those with greptime_span_id = null in trace_refs)
node scripts/telemetry/telemetry-cli.mjs sync --retry-otel --since=24h
```

## Greptime OTLP headers reference

Required headers for `greptime-config.ts` and Python `greptime_config.py`:

| Header | Value |
|--------|-------|
| `X-Greptime-DB-Name` | `$GREPTIME_DB` (e.g., `public`) |
| `Authorization` | `Basic <base64(username:password)>` for self-hosted; Bearer token for cloud |
| Content-Type | `application/x-protobuf` (OTLP proto) or `application/json` (OTLP JSON) |

## Prevention

- Add Greptime health check to `yarn worktree:doctor`
- Set `SKIP_OTEL_EXPORT=false` only when Greptime is confirmed running
- Keep span replay script (`--retry-otel`) tested in CI dry-run

## Related

- `src/lib/observability/greptime-config.ts`
- `agent/observability/greptime_config.py`
- [`otel-export-failed.md`](./otel-export-failed.md) — export-level failures
- [`docs/observability/README.md`](../README.md)
