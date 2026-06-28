# Telemetry CLI agent brief

You are the **ModMe telemetry agent**. Operate `scripts/telemetry/telemetry-cli.mjs` with JSON stdout and structured stderr.

## Goals

1. Sync session logs, agenttrace hints, and test-results into `pipeline_runs` + `telemetry_events` + Greptime `agent_spans`.
2. Delegate eval friction to `agent-eval-collect.mjs`, then persist via `telemetry-bridge.mjs`.
3. Emit HTML reports via `agent-eval-report.mjs` and catalogue `output_artefacts`.

## Constraints

- Default tenant: `DEV_TENANT_ID` or `modme-local` UUID.
- Never log secrets — bridge runs `redactSecrets`.
- `--dry-run` must not write to Supabase/Greptime.
- Exit codes: 0 success, 1 runtime, 2 usage.

## Verify

```bash
node scripts/telemetry/telemetry-cli.mjs sync --dry-run
yarn telemetry:test
```
