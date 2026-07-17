#!/usr/bin/env node
/**
 * Structured Supabase / network connectivity diagnostic (post Docker+WSL reset).
 * Does not print secrets. Writes debug NDJSON for error-detective analysis.
 *
 * Usage: node scripts/diagnose-connectivity.mjs [--json] [--quick]
 */
import dns from 'node:dns/promises';
import { loadRootEnv, classifySupabaseUrl } from './lib/load-root-env.mjs';
import { debugLog, memorySnapshot } from './lib/debug-ndjson.mjs';
import { resolveHostViaDoh } from './lib/supabase-connectivity.mjs';

const JSON_OUT = process.argv.includes('--json');
const QUICK = process.argv.includes('--quick');
const DNS_TIMEOUT_MS = QUICK ? 3_000 : 5_000;
const FETCH_TIMEOUT_MS = QUICK ? 5_000 : 8_000;

/** @param {unknown} err */
function errShape(err) {
  if (!(err instanceof Error)) return { message: String(err) };
  const e = /** @type {Error & { cause?: unknown, code?: string }} */ (err);
  return {
    name: e.name,
    message: e.message,
    code: e.code,
    cause:
      e.cause instanceof Error
        ? { name: e.cause.name, message: e.cause.message, code: /** @type {{ code?: string }} */ (e.cause).code }
        : e.cause
          ? String(e.cause)
          : undefined,
  };
}

/** @param {string} label @param {() => Promise<unknown>} fn */
async function step(label, fn) {
  const t0 = Date.now();
  try {
    const result = await fn();
    const row = { label, ok: true, ms: Date.now() - t0, result };
    // #region agent log
    debugLog({
      location: 'diagnose-connectivity.mjs',
      message: 'connectivity step ok',
      data: row,
      hypothesisId: 'H4-H5',
    });
    // #endregion
    return row;
  } catch (err) {
    const row = { label, ok: false, ms: Date.now() - t0, error: errShape(err) };
    // #region agent log
    debugLog({
      location: 'diagnose-connectivity.mjs',
      message: 'connectivity step fail',
      data: row,
      hypothesisId: 'H4-H5',
    });
    // #endregion
    return row;
  }
}

/** @param {Record<string, unknown>} report @param {string} hostname */
function printReport(report, hostname) {
  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('Supabase connectivity diagnostic\n');
  console.log(`  URL class: ${report.urlClass}`);
  console.log(`  Host: ${hostname}`);
  for (const s of report.steps) {
    const mark = s.ok ? 'OK' : 'FAIL';
    console.log(`  [${mark}] ${s.label} (${s.ms}ms)`);
    if (!s.ok && s.error) {
      console.log(`       ${s.error.name}: ${s.error.message}`);
      if (s.error.code) console.log(`       code: ${s.error.code}`);
      if (s.error.cause) console.log(`       cause: ${JSON.stringify(s.error.cause)}`);
    }
  }
  if (Array.isArray(report.skippedAfterDns) && report.skippedAfterDns.length) {
    console.log(`  [SKIP] ${report.skippedAfterDns.join(', ')} (DNS failed — not attempted)`);
  }
  console.log(`\n  Reachable: ${report.reachable ? 'yes' : 'no'}`);
  if (!report.reachable) {
    if (report.projectNxdomain) {
      console.log('\n  Diagnosis: PROJECT_NXDOMAIN — hostname missing from global DNS (DoH verified).');
      console.log('  flushdns / 8.8.8.8 will NOT fix this. Check Supabase dashboard for project status.');
      console.log('  Dashboard: https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf/settings/api');
      console.log('  Update root .env with the live API URL + service_role key from dashboard.');
      console.log('  Work offline: node scripts/run-intake.mjs --dry-run');
    } else {
      console.log('\n  Host DNS lookup failed (may be local resolver or firewall).');
      console.log(`    Resolve-DnsName ${hostname}`);
      console.log('    nslookup supabase.co   # baseline — should resolve if DNS works at all');
      console.log('  Note: 8.8.8.8 / 1.1.1.1 timeouts often mean UDP/53 blocked; use DoH or ISP DNS.');
      console.log('  Worktree: node scripts/diagnose-connectivity.mjs (not yarn — no node_modules here).');
    }
    console.log('  Quick probe: node scripts/diagnose-connectivity.mjs --quick');
  }
}

async function main() {
  loadRootEnv({ fileWins: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // #region agent log
  debugLog({
    location: 'diagnose-connectivity.mjs:main',
    message: 'connectivity run start',
    data: {
      memory: memorySnapshot('start'),
      hasUrl: !!url,
      hasKey: !!key,
      urlClass: url ? classifySupabaseUrl(url) : null,
    },
    hypothesisId: 'H4-H5',
  });
  // #endregion

  /** @type {Record<string, unknown>} */
  const report = {
    timestamp: new Date().toISOString(),
    urlClass: url ? classifySupabaseUrl(url) : null,
    steps: [],
  };

  if (!url || !key) {
    report.blocked = 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
    if (JSON_OUT) console.log(JSON.stringify(report, null, 2));
    else console.error(report.blocked);
    process.exit(1);
  }

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch (err) {
    report.blocked = `Invalid SUPABASE_URL: ${err instanceof Error ? err.message : String(err)}`;
    process.exit(1);
  }

  report.hostname = hostname;

  report.steps.push(
    await step('dns.lookup', async () => {
      const addrs = await dns.lookup(hostname, {
        all: true,
        signal: AbortSignal.timeout(DNS_TIMEOUT_MS),
      });
      return addrs.map((a) => `${a.address} (${a.family})`);
    })
  );

  const dnsStep = report.steps[0];
  if (!dnsStep.ok) {
    report.reachable = false;
    report.skippedAfterDns = ['fetch HEAD rest/v1', 'fetch GET inbox_entries limit 1', 'fetch GET auth health'];

    try {
      const doh = await resolveHostViaDoh(hostname);
      report.doh = doh;
      report.projectNxdomain = doh.nxdomain;
    } catch (err) {
      report.dohError = err instanceof Error ? err.message : String(err);
    }

    // #region agent log
    debugLog({
      location: 'diagnose-connectivity.mjs:main',
      message: 'connectivity short-circuit dns',
      data: { hostname, dnsMs: dnsStep.ms, skipped: report.skippedAfterDns, doh: report.doh },
      hypothesisId: 'H4-H6',
    });
    // #endregion
    printReport(report, hostname);
    process.exit(1);
  }

  if (QUICK) {
    report.reachable = true;
    printReport(report, hostname);
    process.exit(0);
  }

  report.steps.push(
    await step('fetch HEAD rest/v1', async () => {
      const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
        method: 'HEAD',
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      return { status: res.status, statusText: res.statusText };
    })
  );

  report.steps.push(
    await step('fetch GET inbox_entries limit 1', async () => {
      const res = await fetch(
        `${url.replace(/\/$/, '')}/rest/v1/inbox_entries?select=id&limit=1`,
        {
          method: 'GET',
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        }
      );
      const body = res.ok ? null : (await res.text()).slice(0, 200);
      return { status: res.status, bodyPreview: body };
    })
  );

  report.steps.push(
    await step('fetch GET auth health', async () => {
      const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      return { status: res.status };
    })
  );

  const failed = report.steps.filter((s) => !s.ok);
  report.reachable = failed.length === 0;

  // #region agent log
  debugLog({
    location: 'diagnose-connectivity.mjs:main',
    message: 'connectivity run end',
    data: {
      reachable: report.reachable,
      failedLabels: failed.map((s) => s.label),
      memory: memorySnapshot('end'),
    },
    hypothesisId: 'H4-H5',
  });
  // #endregion

  printReport(report, hostname);
  process.exit(report.reachable ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
