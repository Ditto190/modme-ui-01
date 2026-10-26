#!/usr/bin/env node
/**
 * @feature INBOX.CODE.INDEX
 * Code AST indexer orchestrator — GreptimeDB code patterns + optional inbox promote.
 *
 * Usage:
 *   node scripts/code-index-orchestrator.mjs [--dry-run] [--ast-only] [--root <path>] [--promote]
 *
 * --ast-only  Skip Greptime upsert (use when local Greptime is down); still allows --promote.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'node:crypto';
import { loadRootEnv } from './lib/load-root-env.mjs';
import { beadsCreateSchemaDrift } from './lib/beads-hooks.mjs';
import { maybeGenerateSpecifyArtefacts } from './lib/specify-artefacts.mjs';
import { validateCodeChunk, formatIssues } from '../packages/intake-contracts/index.mjs';
import { debugLog, memorySnapshot } from './lib/debug-ndjson.mjs';
import {
  acquireProcessLock,
  assertResourceBudget,
  assertSafeIndexMode,
  releaseProcessLock,
} from './lib/agent-resource-guard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const AST_ONLY = args.includes('--ast-only');
const PROMOTE = args.includes('--promote');
const rootIdx = args.indexOf('--root');
const INDEX_ROOT =
  rootIdx >= 0
    ? resolve(args[rootIdx + 1])
    : resolve(ROOT, 'GenerativeUI_monorepo/apps/agent-generator/src/mcp-registry');

const HIGH_SIGNAL_KINDS = new Set([
  'zod_schema',
  'prisma_model',
  'mcp_tool',
  'workflow',
  'tool_export',
  'function',
  'class',
  'interface',
  'type_alias',
]);

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

async function loadCodeIndexRunner() {
  const distPath = resolve(ROOT, 'experiments/micro-agents/dist/workers/code-index-runner.js');
  if (!existsSync(distPath)) {
    console.log('Building micro-agents...');
    const build = spawnSync('npm', ['run', 'build'], {
      cwd: resolve(ROOT, 'experiments/micro-agents'),
      stdio: 'inherit',
      shell: true,
    });
    if (build.status !== 0) {
      throw new Error('micro-agents build failed');
    }
  }
  return import(pathToFileURL(distPath).href);
}

async function promoteHighSignalPatterns(chunks, greptimeIds) {
  const signals = chunks.filter((c) => HIGH_SIGNAL_KINDS.has(c.ast_kind));

  if (DRY_RUN) {
    console.log(`  DRY RUN promote candidates: ${signals.length}`);
    for (const chunk of signals.slice(0, 20)) {
      console.log(`  DRY RUN promote pattern: ${chunk.path} (${chunk.ast_kind})`);
    }
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('Supabase env missing — skip code pattern promote');
    return;
  }

  try {
    const probe = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!probe.ok && probe.status !== 400 && probe.status !== 401) {
      console.warn(`Supabase probe HTTP ${probe.status} — skip code pattern promote`);
      return;
    }
  } catch (err) {
    console.warn(
      `Supabase unreachable — skip code pattern promote (${err instanceof Error ? err.message : String(err)})`
    );
    return;
  }

  const supabase = createClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(20_000) }),
    },
  });

  for (let i = 0; i < Math.min(signals.length, 20); i++) {
    const chunk = signals[i];
    const greptimeId = greptimeIds[i] || sha256(`${chunk.path}:${chunk.symbol_name}`).slice(0, 32);
    const contentHash = sha256(`code-pattern:${greptimeId}`);
    const { data: existing } = await supabase
      .from('inbox_entries')
      .select('id')
      .eq('content_hash', contentHash)
      .maybeSingle();

    if (existing) continue;

    const now = new Date().toISOString();
    const entryId = randomUUID();
    const title = `Code pattern: ${chunk.symbol_name} in ${chunk.path}`;
    const summary = chunk.text.slice(0, 300);
    const entryType =
      chunk.ast_kind === 'prisma_model' || chunk.ast_kind === 'zod_schema'
        ? 'architecture'
        : 'snippet';

    await supabase.from('inbox_entries').insert({
      id: entryId,
      content_hash: contentHash,
      source_file: chunk.path,
      source_format: 'snippet',
      source_kind: 'code_pattern',
      raw_content: chunk.text.slice(0, 50000),
      extracted_text: chunk.text.slice(0, 50000),
      title,
      summary,
      agent_name: 'code-index',
      agent_role: 'architect',
      tags: [chunk.ast_kind, 'greptime', 'uw-archive'],
      severity: chunk.ast_kind === 'zod_schema' ? 'high' : 'medium',
      entry_type: entryType,
      status: 'indexed',
      code_pattern_ids: [greptimeId],
      created_at: now,
      updated_at: now,
    });

    await supabase.from('code_pattern_refs').insert({
      id: randomUUID(),
      inbox_entry_id: entryId,
      greptime_id: greptimeId,
      path: chunk.path,
      ast_kind: chunk.ast_kind,
      content_hash: chunk.content_hash,
      created_at: now,
    });

    await maybeGenerateSpecifyArtefacts(supabase, {
      entryId,
      contentHash,
      entryType,
      severity: chunk.ast_kind === 'zod_schema' ? 'high' : 'medium',
      title,
      summary,
      features: { greptime_id: greptimeId, ast_kind: chunk.ast_kind },
    });

    console.log(`  PROMOTED pattern: ${chunk.path} → ${entryId}`);
  }
}

async function main() {
  loadRootEnv({ fileWins: true });
  acquireProcessLock('code-index-orchestrator');
  try {
    assertSafeIndexMode({ dryRun: DRY_RUN, astOnly: AST_ONLY });
    // #region agent log
    debugLog({
      location: 'code-index-orchestrator.mjs:main',
      message: 'orchestrator start',
      data: {
        dryRun: DRY_RUN,
        astOnly: AST_ONLY,
        promote: PROMOTE,
        indexRoot: INDEX_ROOT,
        memory: memorySnapshot('start'),
      },
      hypothesisId: 'H1-H2',
    });
    // #endregion
    assertResourceBudget('orchestrator-start');

    const { runCodeIndex } = await loadCodeIndexRunner();
    assertResourceBudget('after-runner-load');

    console.log(`Indexing AST patterns under: ${INDEX_ROOT}`);
    if (AST_ONLY) console.log('  mode: --ast-only (skip Greptime upsert)');
    const result = await runCodeIndex({
      rootDir: INDEX_ROOT,
      dryRun: DRY_RUN || AST_ONLY,
    });
    // #region agent log
    debugLog({
      location: 'code-index-orchestrator.mjs:main',
      message: 'index complete',
      data: {
        chunkCount: result.chunks.length,
        indexed: result.indexed,
        skipped: result.skipped,
        memory: memorySnapshot('after-index'),
      },
      hypothesisId: 'H1-H3',
    });
    // #endregion
    assertResourceBudget('after-index');

  // Synthetic ids when Greptime was skipped so promote still has stable keys.
  if ((DRY_RUN || AST_ONLY) && result.greptime_ids.length === 0) {
    for (const chunk of result.chunks) {
      result.greptime_ids.push(sha256(`${chunk.path}:${chunk.symbol_name}`).slice(0, 32));
    }
  }

  let validationErrors = 0;
  for (const chunk of result.chunks) {
    const validated = validateCodeChunk(chunk);
    if (!validated.ok) {
      validationErrors++;
      console.warn(`  chunk invalid ${chunk.path}: ${formatIssues(validated.issues)}`);
    }
  }

  console.log(
    `Indexed ${result.indexed} chunks, skipped ${result.skipped}, validated ${result.chunks.length}, errors ${validationErrors}`
  );

  if (validationErrors > 0) {
    await beadsCreateSchemaDrift(INDEX_ROOT);
  }

  if (PROMOTE && result.chunks.length) {
    console.log('\n== Promote high-signal patterns ==');
    try {
      if (DRY_RUN) {
        await promoteHighSignalPatterns(result.chunks, result.greptime_ids);
      } else {
        await Promise.race([
          promoteHighSignalPatterns(result.chunks, result.greptime_ids),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('promote timed out after 20s (Supabase unreachable?)')), 20_000)
          ),
        ]);
      }
    } catch (err) {
      console.warn(`  promote skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (validationErrors > 0) process.exitCode = 1;
  } finally {
    releaseProcessLock();
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
