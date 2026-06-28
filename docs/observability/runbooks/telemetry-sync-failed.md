# Runbook: Telemetry Sync Failed

**Trigger:** `pipeline_runs.status = 'failed'` or `telemetry-cli sync` exits non-zero.

## Symptoms

- `node scripts/telemetry/telemetry-cli.mjs sync` exits 1
- `pipeline_runs` row has `status: failed`
- CI observability-pipeline-check job fails

## Immediate steps

```powershell
# 1. Dry-run to see normalized events and any Zod errors
node scripts/telemetry/telemetry-cli.mjs sync --dry-run --human 2>&1

# 2. Check Supabase connectivity
. .\scripts\load-lean-ctx-env.ps1
node -e "
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  sb.from('pipeline_runs').select('id').limit(1).then(r => console.log(JSON.stringify(r)));
"

# 3. Check for contract violations (Zod parse errors)
node scripts/telemetry/telemetry-cli.mjs sync --dry-run 2>&1 | Select-String "error"
```

## Common causes

| Cause | Error message | Resolution |
|-------|---------------|------------|
| Missing `SUPABASE_SERVICE_ROLE_KEY` | `no_supabase` in result | Set env var or check `.env` |
| Invalid tenant_id | `foreign key violation` | Set `DEV_TENANT_ID` to valid UUID |
| Zod parse error | `issues: [{...}]` | Fix event schema — new source enum missing |
| Supabase RLS | `permission denied` | See supabase-rls-denied.md runbook |
| Node version | `SyntaxError` | Use Node 20+ |

## Resolution for new lean-ctx source enum

If the Zod error is `source: Invalid enum value`:

1. Check that `TelemetrySourceSchema` in `next-forge/packages/schemas/observability.ts` includes the source
2. Update `observability-contract.v1.json` `enums.telemetrySource`
3. Update golden fixture `observability-contract.golden.json`
4. Run `yarn telemetry:test:contracts` to verify
5. Update `OBSERVABILITY_CONTRACT_VERSION` to next minor version

## References

- `next-forge/packages/schemas/observability.ts`
- `docs/inbox-pipeline/contracts/observability-contract.v1.json`
- `docs/observability/README.md`
