#!/usr/bin/env node
/**
 * Lightweight Supabase intake signal — DNS, REST, table/column probes.
 * No writes. Use before full ingest after project restore/suspension.
 *
 * Usage: node scripts/probe-supabase-intake.mjs [--json]
 */
import { createClient } from '@supabase/supabase-js';
import { loadRootEnv } from './lib/load-root-env.mjs';
import { debugLog, memorySnapshot } from './lib/debug-ndjson.mjs';
import { probeSupabaseReachable, resolveHostViaDoh } from './lib/supabase-connectivity.mjs';

const JSON_OUT = process.argv.includes('--json');

/** Core columns for inbox-ingest.mjs (standard funnel files) */
const INBOX_CORE_COLUMNS = [
  'id',
  'content_hash',
  'source_file',
  'source_format',
  'raw_content',
  'extracted_text',
  'title',
  'summary',
  'agent_name',
  'agent_role',
  'tags',
  'severity',
  'entry_type',
  'status',
  'created_at',
  'updated_at',
];

/** Extra columns for code-index promote path */
const INBOX_PROMOTE_COLUMNS = ['source_kind', 'code_pattern_ids'];

const CODE_PATTERN_REF_COLUMNS = [
  'id',
  'inbox_entry_id',
  'greptime_id',
  'path',
  'ast_kind',
  'content_hash',
  'created_at',
];

const VECTOR_SIGNAL_COLUMNS = ['embedding'];

/** @param {import('@supabase/supabase-js').SupabaseClient} client @param {string} table @param {string[]} columns */
async function probeTableColumns(client, table, columns) {
  const select = columns.join(',');
  const { data, error, count } = await client
    .from(table)
    .select(select, { count: 'exact', head: false })
    .limit(1);

  if (error) {
    return { table, ok: false, error: error.message, code: error.code, hint: error.hint };
  }

  return {
    table,
    ok: true,
    rowCountSample: data?.length ?? 0,
    totalCount: count ?? null,
    columnsProbed: columns.length,
    sampleKeys: data?.[0] ? Object.keys(data[0]) : [],
  };
}

async function main() {
  loadRootEnv({ fileWins: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  /** @type {Record<string, unknown>} */
  const report = {
    timestamp: new Date().toISOString(),
    signals: [],
    readyForIngest: false,
  };

  // #region agent log
  debugLog({
    location: 'probe-supabase-intake.mjs',
    message: 'signal probe start',
    data: { memory: memorySnapshot('start') },
    hypothesisId: 'SIGNAL',
  });
  // #endregion

  const reach = await probeSupabaseReachable({ loadEnv: false });
  report.signals.push({ step: 'connectivity', ...reach });

  if (!reach.ok) {
    report.readyForIngest = false;
    if (JSON_OUT) console.log(JSON.stringify(report, null, 2));
    else printHuman(report);
    process.exit(1);
  }

  const hostname = reach.hostname ?? new URL(url).hostname;
  const doh = await resolveHostViaDoh(hostname);
  report.signals.push({ step: 'doh', ...doh });

  const client = createClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(8_000) }),
    },
  });

  const inboxCore = await probeTableColumns(client, 'inbox_entries', INBOX_CORE_COLUMNS);
  report.signals.push({ step: 'schema.inbox_entries.core', ...inboxCore });

  const inboxPromote = await probeTableColumns(client, 'inbox_entries', INBOX_PROMOTE_COLUMNS);
  report.signals.push({ step: 'schema.inbox_entries.promote', ...inboxPromote });

  const refsProbe = await probeTableColumns(client, 'code_pattern_refs', CODE_PATTERN_REF_COLUMNS);
  report.signals.push({ step: 'schema.code_pattern_refs', ...refsProbe });

  const vectorProbe = await probeTableColumns(client, 'inbox_entries', [
    'id',
    'content_hash',
    'embedding',
  ]);
  report.signals.push({ step: 'schema.pgvector', ...vectorProbe });

  report.readyForIngest = inboxCore.ok;
  report.readyForPromote = inboxPromote.ok && refsProbe.ok;
  report.readyForEmbed = vectorProbe.ok;

  // #region agent log
  debugLog({
    location: 'probe-supabase-intake.mjs',
    message: 'signal probe end',
    data: {
      readyForIngest: report.readyForIngest,
      readyForPromote: report.readyForPromote,
      readyForEmbed: report.readyForEmbed,
      inboxCount: inboxCore.totalCount,
    },
    hypothesisId: 'SIGNAL',
  });
  // #endregion

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }

  process.exit(report.readyForIngest ? 0 : 1);
}

/** @param {Record<string, unknown>} report */
function printHuman(report) {
  console.log('Supabase intake signal probe\n');

  for (const s of /** @type {Array<Record<string, unknown>>} */ (report.signals)) {
    const step = s.step;
    if (step === 'connectivity') {
      console.log(`  [${s.ok ? 'OK' : 'FAIL'}] connectivity (${s.ms}ms) — ${s.hostname ?? 'n/a'}`);
      if (!s.ok) console.log(`       ${s.code}: ${s.error}`);
      continue;
    }
    if (step === 'doh') {
      console.log(
        `  [${s.ok ? 'OK' : 'FAIL'}] DNS-over-HTTPS — ${s.nxdomain ? 'NXDOMAIN' : `status ${s.status}`}`
      );
      continue;
    }
    if (String(step).startsWith('schema.')) {
      const label = String(step).replace('schema.', '');
      console.log(
        `  [${s.ok ? 'OK' : 'FAIL'}] table ${label}` +
          (s.ok ? ` — ${s.totalCount ?? '?'} rows, ${s.columnsProbed} columns probed` : '')
      );
      if (!s.ok) console.log(`       ${s.code ?? 'error'}: ${s.error}`);
    }
  }

  console.log('\n  Summary:');
  console.log(`    Ingest-ready:  ${report.readyForIngest ? 'yes' : 'no'}`);
  console.log(`    Promote-ready: ${report.readyForPromote ? 'yes' : 'no'}`);
  console.log(`    Embed-ready:   ${report.readyForEmbed ? 'yes' : 'no'}`);

  if (report.readyForIngest) {
    console.log('\n  Next: node scripts/run-intake.mjs --dry-run  then live ingest when ready');
  } else {
    console.log('\n  Run migrations / db push before ingest. See next-forge/packages/database/');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
