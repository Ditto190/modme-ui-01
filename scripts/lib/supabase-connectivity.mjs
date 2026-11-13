/**
 * Shared Supabase reachability probe (DNS + REST HEAD).
 * Used to fail fast before live ingest/promote when host DNS is broken.
 */
import dns from 'node:dns/promises';
import { loadRootEnv } from './load-root-env.mjs';
import { debugLog } from './debug-ndjson.mjs';

const DEFAULT_TIMEOUT_MS = 5_000;

/** DNS JSON RCODE 3 = NXDOMAIN */
const DOH_NXDOMAIN = 3;

/**
 * @param {string} hostname
 * @returns {Promise<{ ok: boolean, nxdomain: boolean, status: number, answers: unknown[] }>}
 */
export async function resolveHostViaDoh(hostname) {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
    {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(10_000),
    }
  );
  const data = /** @type {{ Status: number, Answer?: unknown[] }} */ (await res.json());
  const nxdomain = data.Status === DOH_NXDOMAIN;
  return {
    ok: !nxdomain && Array.isArray(data.Answer) && data.Answer.length > 0,
    nxdomain,
    status: data.Status,
    answers: data.Answer ?? [],
  };
}

/**
 * @param {{ timeoutMs?: number, loadEnv?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, url?: string, hostname?: string, error?: string, code?: string, ms: number }>}
 */
export async function probeSupabaseReachable(opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (opts.loadEnv !== false) loadRootEnv({ fileWins: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const t0 = Date.now();

  if (!url || !key) {
    return { ok: false, ms: Date.now() - t0, error: 'Missing Supabase URL or service role key', code: 'ENV_MISSING' };
  }

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return { ok: false, ms: Date.now() - t0, error: 'Invalid NEXT_PUBLIC_SUPABASE_URL', code: 'ENV_INVALID' };
  }

  try {
    await dns.lookup(hostname, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = /** @type {{ code?: string }} */ (err).code ?? 'DNS_FAIL';

    let doh = null;
    try {
      doh = await resolveHostViaDoh(hostname);
    } catch {
      /* DoH unavailable — keep local error only */
    }

    // #region agent log
    debugLog({
      location: 'supabase-connectivity.mjs',
      message: 'dns probe fail',
      data: { hostname, message, code, doh },
      hypothesisId: 'H4-H6',
    });
    // #endregion

    if (doh?.nxdomain) {
      return {
        ok: false,
        url,
        hostname,
        ms: Date.now() - t0,
        error: `Project hostname does not exist in public DNS (NXDOMAIN)`,
        code: 'PROJECT_NXDOMAIN',
        dohStatus: doh.status,
      };
    }

    if (doh?.ok) {
      // #region agent log
      debugLog({
        location: 'supabase-connectivity.mjs',
        message: 'local dns stale, doh ok — continue to fetch',
        data: { hostname, localCode: code, dohAnswers: doh.answers?.length },
        hypothesisId: 'H4-H6',
      });
      // #endregion
      // Fall through to REST probe (Windows may cache NXDOMAIN while DoH is fresh)
    } else {
      return { ok: false, url, hostname, ms: Date.now() - t0, error: message, code };
    }
  }

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok || res.status === 400 || res.status === 401) {
      // #region agent log
      debugLog({
        location: 'supabase-connectivity.mjs',
        message: 'probe ok',
        data: { hostname, status: res.status, ms: Date.now() - t0 },
        hypothesisId: 'H4-H5',
      });
      // #endregion
      return { ok: true, url, hostname, ms: Date.now() - t0 };
    }
    return {
      ok: false,
      url,
      hostname,
      ms: Date.now() - t0,
      error: `HTTP ${res.status}`,
      code: 'HTTP_ERROR',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined;
    // #region agent log
    debugLog({
      location: 'supabase-connectivity.mjs',
      message: 'fetch probe fail',
      data: { hostname, message, cause },
      hypothesisId: 'H4-H5',
    });
    // #endregion
    return { ok: false, url, hostname, ms: Date.now() - t0, error: cause ?? message, code: 'FETCH_FAIL' };
  }
}

/**
 * @param {{ hint?: string }} [opts]
 */
export async function assertSupabaseReachable(opts = {}) {
  const result = await probeSupabaseReachable();
  if (result.ok) return result;

  console.error('\nSupabase unreachable — live ingest/promote aborted.');
  if (result.hostname) console.error(`  Host: ${result.hostname}`);
  if (result.code) console.error(`  Code: ${result.code}`);
  if (result.error) console.error(`  Error: ${result.error}`);

  if (result.code === 'PROJECT_NXDOMAIN') {
    console.error('\n  Diagnosis: this project ref has NO public DNS record (verified via DNS-over-HTTPS).');
    console.error('  This is NOT fixed by ipconfig /flushdns or changing adapter DNS.');
    console.error('\n  Likely causes:');
    console.error('    - Supabase project deleted, paused, or never fully provisioned');
    console.error('    - Wrong project ref in root .env (stale after migration)');
    console.error('\n  Actions:');
    console.error('    1. Open https://supabase.com/dashboard — confirm project modme-next-forge exists');
    console.error('    2. Copy API URL + service_role from Settings → API into root .env');
    console.error('    3. node scripts/diagnose-supabase-env.mjs');
    console.error('    4. Until cloud is restored: node scripts/run-intake.mjs --dry-run');
  } else {
    console.error('\n  Fix (host/network):');
    console.error('    1. ipconfig /flushdns');
    console.error('    2. node scripts/diagnose-connectivity.mjs --quick');
    console.error('    3. Check VPN / firewall / proxy (8.8.8.8 timing out = UDP/53 may be blocked)');
    console.error('    4. node scripts/run-intake.mjs --dry-run for local validation');
  }

  if (opts.hint) console.error(`\n  ${opts.hint}`);
  process.exit(1);
}
