#!/usr/bin/env node
/**
 * @feature INBOX.CODE.INDEX
 * Code AST indexer orchestrator — GreptimeDB code patterns + optional inbox promote.
 *
 * Usage:
 *   node scripts/code-index-orchestrator.mjs [--dry-run] [--root <path>] [--promote]
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PROMOTE = args.includes('--promote');
const rootIdx = args.indexOf('--root');
const INDEX_ROOT =
  rootIdx >= 0
    ? resolve(args[rootIdx + 1])
    : resolve(ROOT, 'GenerativeUI_monorepo/apps/agent-generator/src/mcp-registry');

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('Supabase env missing — skip code pattern promote');
    return;
  }

  const supabase = createClient(url, key);
  const signals = chunks.filter(
    (c) =>
      c.ast_kind === 'zod_schema' ||
      c.ast_kind === 'prisma_model' ||
      c.ast_kind === 'mcp_tool'
  );

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

    if (DRY_RUN) {
      console.log(`  DRY RUN promote pattern: ${chunk.path}`);
      continue;
    }

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
      tags: [chunk.ast_kind, 'greptime'],
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
  const { runCodeIndex } = await loadCodeIndexRunner();

  console.log(`Indexing AST patterns under: ${INDEX_ROOT}`);
  const result = await runCodeIndex({ rootDir: INDEX_ROOT, dryRun: DRY_RUN });

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
    await promoteHighSignalPatterns(result.chunks, result.greptime_ids);
  }

  if (validationErrors > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
