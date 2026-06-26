#!/usr/bin/env node
/**
 * @feature INBOX.PIPELINE.ORCHESTRATE
 * Quality-gated intake pipeline orchestrator.
 *
 * Usage:
 *   node scripts/intake-orchestrator.mjs --mode=session|ci|pr-validate|staging-dry-run [--dry-run] [--skip-fix]
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith('--mode='));
const MODE = modeArg ? modeArg.split('=')[1] : 'session';
const DRY_RUN = args.includes('--dry-run');
const SKIP_FIX = args.includes('--skip-fix');

function loadRootEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

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
  loadRootEnv();

  const auditLens =
    MODE === 'pr-validate' ? 'funnel' : MODE === 'staging-dry-run' ? 'all' : 'funnel';
  const auditStrict = MODE === 'pr-validate' || MODE === 'ci';

  runStep('Audit funnel', 'scripts/inbox-audit.mjs', [
    '--lens',
    auditLens === 'all' ? 'all' : 'funnel',
    ...(auditStrict ? ['--strict'] : []),
  ]);

  if (!SKIP_FIX && MODE !== 'pr-validate') {
    runStep('Fix (dry-run preview)', 'scripts/inbox-fix.mjs', ['--dry-run', '--from-report']);
  }

  if (MODE === 'pr-validate') {
    console.log('\nintake-orchestrator: pr-validate complete (no writes)');
    process.exit(0);
  }

  const ingestArgs = DRY_RUN || MODE === 'staging-dry-run' ? ['--dry-run'] : [];
  runStep('Ingest', 'scripts/inbox-ingest.mjs', ingestArgs);

  if (MODE === 'staging-dry-run') {
    console.log('\nintake-orchestrator: staging dry-run complete');
    process.exit(0);
  }

  if (!DRY_RUN && (MODE === 'session' || MODE === 'ci')) {
    runStep('Embeddings', 'scripts/inbox-embeddings.mjs', []);
    runStep('MDA categorize', 'scripts/mda-categorize.mjs', []);
    runStep('Audit pipeline', 'scripts/inbox-audit.mjs', ['--lens', 'pipeline']);
    runStep('Skills index', 'scripts/skills-index-generate.mjs', []);
    runStep('Output generate', 'scripts/output-generate.mjs', ['--type', 'all']);
    runStep('Catalogue sync', 'scripts/catalogue-sync.mjs', []);
  }

  console.log('\nintake-orchestrator: complete');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
