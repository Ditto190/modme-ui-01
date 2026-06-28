# Runbook: Supabase RLS Denied

**Trigger:** Supabase returns error code `42501` (permission denied) when telemetry-bridge attempts to write.

## Symptoms

- `telemetry-bridge` throws: `insert failed: permission denied for table pipeline_runs`
- `pipeline_runs.status = 'failed'` with `error_message` containing `42501`
- Supabase logs show `"auth.uid() is null"` for service_role JWT

## Immediate steps

```powershell
# 1. Verify env vars are set
echo "URL: $env:NEXT_PUBLIC_SUPABASE_URL"
echo "Key starts with: $($env:SUPABASE_SERVICE_ROLE_KEY?.Substring(0, 20))..."

# 2. Confirm it's the service_role key (not anon key)
# service_role key is ~200+ chars; anon key is also long but has different payload
# Decode the JWT: https://jwt.io — payload should have "role": "service_role"

# 3. Test insert directly
node -e "
  require('dotenv').config();
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  sb.from('pipeline_runs')
    .insert({ tenant_id: process.env.DEV_TENANT_ID ?? '00000000-0000-4000-8000-000000000001', pipeline: 'test', mode: 'test', trigger_source: 'runbook', status: 'skipped', started_at: new Date().toISOString() })
    .then(r => console.log(JSON.stringify(r.error ?? 'ok')));
"
```

## Root causes

| Cause | Symptom | Fix |
|-------|---------|-----|
| Using anon key instead of service_role key | `42501` even on simple insert | Set `SUPABASE_SERVICE_ROLE_KEY` (not anon key) |
| Wrong project URL | 404 or DNS error | Verify `NEXT_PUBLIC_SUPABASE_URL` matches Supabase dashboard |
| Tenant row missing | FK violation on `tenant_id` | Ensure tenant exists: `INSERT INTO tenants(id) VALUES (...)` |
| RLS policy too restrictive | 42501 with `authenticated` role | Use `service_role` key — bypasses RLS |
| `.env` file not loaded | `undefined` for env vars | Run `. .\scripts\load-lean-ctx-env.ps1` then re-run |

## Service role key bypass

Supabase's service_role key bypasses all RLS policies. The telemetry bridge always uses service_role. If you see 42501 with service_role, the key itself is wrong (using anon key) or the URL is wrong.

**Never commit `SUPABASE_SERVICE_ROLE_KEY` to git.** Use `.env` (gitignored).

## References

- ModMe Supabase setup: `docs/supabase-setup.md`
- `scripts/telemetry/lib/telemetry-bridge.mjs` — `getSupabase()` function
- Supabase RLS docs: https://supabase.com/docs/guides/auth/row-level-security
