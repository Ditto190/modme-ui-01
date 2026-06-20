#!/usr/bin/env node
/**
 * Run inbox ingest from repo root or next-forge/. Syncs local Supabase .env if needed.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptsDir);
const dryRun = process.argv.includes('--dry-run');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function syncLocalEnv() {
  const syncScript = join(repoRoot, 'scripts', 'sync-supabase-local-env.ps1');
  execFileSync(
    'powershell',
    ['-ExecutionPolicy', 'Bypass', '-File', syncScript, '-StartIfStopped'],
    { cwd: repoRoot, stdio: 'inherit' }
  );
}

loadEnvFile(join(repoRoot, '.env'));

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  syncLocalEnv();
  loadEnvFile(join(repoRoot, '.env'));
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY after env sync');
  process.exit(1);
}

const ingestArgs = [join(repoRoot, 'scripts', 'inbox-ingest.mjs')];
if (dryRun) ingestArgs.push('--dry-run');

const result = spawnSync('node', ingestArgs, {
  cwd: repoRoot,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
