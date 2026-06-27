#!/usr/bin/env node
/**
 * @feature INBOX.PIPELINE.ORCHESTRATE
 * Quality-gated intake pipeline orchestrator.
 *
 * Usage:
 *   node scripts/intake-orchestrator.mjs --mode=session|ci|pr-validate|staging-dry-run|scrape|code-index|full [--dry-run] [--skip-fix]
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRootEnv } from './lib/load-root-env.mjs';
import { beadsCreate, beadsUpdate } from './lib/beads-hooks.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith('--mode='));
const MODE = modeArg ? modeArg.split('=')[1] : 'session';
const DRY_RUN = args.includes('--dry-run');
const SKIP_FIX = args.includes('--skip-fix');

function runNode(script, scriptArgs = []) {
  const result = spawnSync(process.execPath, [resolve(ROOT, script), ...scriptArgs], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

function runStep(label, script, scriptArgs = []) {
  console.log(`\n== ${label} ==`);
  const code = runNode(script, scriptArgs);
  if (code !== 0) {
    console.error(`intake-orchestrator: ${label} failed (exit ${code})`);
    process.exit(code);
  }
}

async function main() {
  loadRootEnv({ fileWins: true });

  const auditLens =
    MODE === 'pr-validate' ? 'funnel' : MODE === 'staging-dry-run' ? 'all' : 'funnel';
  const auditStrict = MODE === 'pr-validate' || MODE === 'ci';

  if (MODE !== 'code-index') {
    runStep('Audit funnel', 'scripts/inbox-audit.mjs', [
      '--lens',
      auditLens === 'all' ? 'all' : 'funnel',
      ...(auditStrict ? ['--strict'] : []),
    ]);
  }

  if (!SKIP_FIX && MODE !== 'pr-validate' && MODE !== 'code-index') {
    runStep('Fix (dry-run preview)', 'scripts/inbox-fix.mjs', ['--dry-run', '--from-report']);
  }

  if (MODE === 'pr-validate') {
    console.log('\nintake-orchestrator: pr-validate complete (no writes)');
    process.exit(0);
  }

  if (MODE === 'scrape' || MODE === 'full') {
    await beadsCreate(`intake:${MODE}`, { priority: 2 });
    const manifestArg = args.find((a) => a.startsWith('--manifest='));
    const manifest = manifestArg ? manifestArg.split('=')[1] : 'docs-sitemap';
    const scrapeArgs = [`--manifest=${manifest}`, ...(DRY_RUN ? ['--dry-run'] : [])];
    runStep('Scrape orchestrator', 'scripts/scrape-orchestrator.mjs', scrapeArgs);
  }

  if (MODE === 'code-index' || MODE === 'full') {
    const codeArgs = [...(DRY_RUN ? ['--dry-run'] : []), '--promote'];
    runStep('Code AST index', 'scripts/code-index-orchestrator.mjs', codeArgs);
  }

  if (MODE === 'code-index') {
    await beadsUpdate(`intake:${MODE}`, 'done');
    console.log('\nintake-orchestrator: code-index complete');
    process.exit(0);
  }

  const ingestArgs = DRY_RUN || MODE === 'staging-dry-run' ? ['--dry-run'] : [];
  runStep('Ingest', 'scripts/inbox-ingest.mjs', ingestArgs);

  if (MODE === 'staging-dry-run') {
    console.log('\nintake-orchestrator: staging dry-run complete');
    process.exit(0);
  }

  if (!DRY_RUN && (MODE === 'session' || MODE === 'ci' || MODE === 'full')) {
    runStep('Embeddings', 'scripts/inbox-embeddings.mjs', []);
    runStep('MDA categorize', 'scripts/mda-categorize.mjs', []);
    runStep('Audit pipeline', 'scripts/inbox-audit.mjs', ['--lens', 'pipeline']);
  }

  if (MODE === 'full') {
    await beadsUpdate('intake:full', 'done');
  }

  console.log('\nintake-orchestrator: complete');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
