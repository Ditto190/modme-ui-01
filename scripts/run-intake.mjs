#!/usr/bin/env node
/**
 * Run inbox ingest from repo root or next-forge/. Syncs local Supabase .env only when root .env lacks keys.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRootEnv, parseEnvFile } from './lib/load-root-env.mjs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptsDir);
const dryRun = process.argv.includes('--dry-run');
const full = process.argv.includes('--full');
const useLocal = process.argv.includes('--local');

function syncLocalEnv() {
  const syncScript = join(repoRoot, 'scripts', 'sync-supabase-local-env.ps1');
  execFileSync(
    'powershell',
    ['-ExecutionPolicy', 'Bypass', '-File', syncScript, '-StartIfStopped'],
    { cwd: repoRoot, stdio: 'inherit' }
  );
}

function rootEnvHasCloudPair() {
  const vars = parseEnvFile(join(repoRoot, '.env'));
  const url = vars.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = vars.SUPABASE_SERVICE_ROLE_KEY || '';
  return url.includes('aevemmmmouxqlfyxthzf.supabase.co') && key.length > 20;
}

loadRootEnv({ fileWins: true });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (useLocal) {
    syncLocalEnv();
    loadRootEnv({ fileWins: true });
  } else if (rootEnvHasCloudPair()) {
    console.error(
      'Root .env has cloud Supabase keys but they were not loaded — check .env format (BOM/quotes).'
    );
    console.error('Run: node scripts/diagnose-supabase-env.mjs');
    process.exit(1);
  } else if (!existsSync(join(repoRoot, '.env'))) {
    console.warn('No root .env — syncing local Supabase env (use --local to force).');
    syncLocalEnv();
    loadRootEnv({ fileWins: true });
  } else {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in root .env');
    console.error('Run: node scripts/diagnose-supabase-env.mjs');
    process.exit(1);
  }
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY after env load');
  process.exit(1);
}

if (full) {
  const orchArgs = [
    join(repoRoot, 'scripts', 'intake-orchestrator.mjs'),
    '--mode=session',
  ];
  if (dryRun) orchArgs.push('--dry-run');
  const result = spawnSync('node', orchArgs, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

const ingestArgs = [join(repoRoot, 'scripts', 'inbox-ingest.mjs')];
if (dryRun) ingestArgs.push('--dry-run');

const result = spawnSync('node', ingestArgs, {
  cwd: repoRoot,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
