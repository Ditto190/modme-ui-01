#!/usr/bin/env node
/**
 * Diagnose Supabase env across all known .env files and process.env.
 * Does not print full secrets — masks values and shows JWT role when decodable.
 *
 * Usage: node scripts/diagnose-supabase-env.mjs
 */
import { existsSync } from 'node:fs';
import {
  REPO_ROOT,
  KNOWN_ENV_FILES,
  parseEnvFile,
  maskSecret,
  decodeJwtRole,
  classifySupabaseUrl,
  loadRootEnv,
  SUPABASE_ENV_KEYS,
} from './lib/load-root-env.mjs';

const CHECK_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

console.log('Supabase environment diagnostic\n');
console.log(`Repo root: ${REPO_ROOT}\n`);

/** @type {Array<{ id: string, consumer: string, exists: boolean, vars: Record<string, string> }>} */
const snapshots = [];

for (const entry of KNOWN_ENV_FILES) {
  const path = entry.path(REPO_ROOT);
  const exists = existsSync(path);
  const vars = exists ? parseEnvFile(path) : {};
  snapshots.push({ id: entry.id, consumer: entry.consumer, exists, vars, path });
}

console.log('=== Files on disk ===\n');

for (const snap of snapshots) {
  console.log(`[${snap.id}] ${snap.path}`);
  console.log(`  exists: ${snap.exists}  consumer: ${snap.consumer}`);
  if (!snap.exists) {
    console.log('');
    continue;
  }

  for (const key of CHECK_KEYS) {
    const value = snap.vars[key];
    if (!value) continue;
    const urlClass = key.includes('URL') ? classifySupabaseUrl(value) : null;
    let extra = urlClass ? ` (${urlClass})` : '';
    if (key.includes('KEY') || key.includes('ROLE')) {
      const role = decodeJwtRole(value);
      if (role) extra += ` jwt.role=${role}`;
      if (value.startsWith('sb_publishable_')) extra += ' [publishable — not service_role]';
    }
    console.log(`  ${key}: ${maskSecret(value)}${extra}`);
  }
  console.log('');
}

console.log('=== What Node scrape scripts use (after loadRootEnv file-wins) ===\n');

const shellBefore = {};
for (const key of SUPABASE_ENV_KEYS) {
  shellBefore[key] = process.env[key];
}

loadRootEnv({ fileWins: true });

for (const key of CHECK_KEYS) {
  const fromShell = shellBefore[key];
  const effective = process.env[key];
  const source =
    fromShell && fromShell !== effective
      ? 'file (overrode shell)'
      : fromShell
        ? 'shell'
        : effective
          ? 'file'
          : 'missing';

  let line = `  ${key}: ${source}`;
  if (effective) {
    line += ` → ${maskSecret(effective)}`;
    if (key.includes('URL')) line += ` (${classifySupabaseUrl(effective)})`;
    if (key.includes('KEY') || key.includes('ROLE')) {
      const role = decodeJwtRole(effective);
      if (role) line += ` jwt.role=${role}`;
    }
  }
  console.log(line);
}

console.log('');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const urlClass = classifySupabaseUrl(url);
const serviceRole = serviceKey ? decodeJwtRole(serviceKey) : null;

const issues = [];
const warnings = [];

if (!url) issues.push('Missing NEXT_PUBLIC_SUPABASE_URL in root .env');
if (!serviceKey) {
  issues.push(
    'Missing SUPABASE_SERVICE_ROLE_KEY in root .env (scrape/intake scripts need service_role, not publishable key)'
  );
}
if (urlClass === 'local' && serviceRole === 'service_role') {
  issues.push('Local URL with cloud service_role JWT — run yarn supabase:cloud:env or fix root .env');
}
if (urlClass === 'cloud-modme' && serviceRole && serviceRole !== 'service_role') {
  issues.push(`Cloud URL but key jwt.role=${serviceRole} (expected service_role)`);
}
if (serviceKey && serviceKey.startsWith('sb_publishable_')) {
  issues.push('SUPABASE_SERVICE_ROLE_KEY is a publishable key — use service_role from dashboard API tab');
}
if (publishable && !serviceKey) {
  issues.push(
    'You have NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY but scrape scripts need SUPABASE_SERVICE_ROLE_KEY in root .env'
  );
}

const rootSnap = snapshots.find((s) => s.id === 'root');
const appSnap = snapshots.find((s) => s.id === 'app-local');
if (rootSnap?.exists && appSnap?.exists) {
  const rootUrl = classifySupabaseUrl(rootSnap.vars.NEXT_PUBLIC_SUPABASE_URL);
  const appUrl = classifySupabaseUrl(appSnap.vars.NEXT_PUBLIC_SUPABASE_URL);
  if (rootUrl === 'cloud-modme' && appUrl === 'local') {
    warnings.push(
      'Split brain: root .env is cloud but next-forge/apps/app/.env.local is local (Next.js app only — scrape scripts use root .env)'
    );
  }
}

console.log('=== Issues ===\n');
if (warnings.length > 0) {
  console.log('=== Warnings ===\n');
  for (const warning of warnings) {
    console.log(`  ⚠ ${warning}`);
  }
  console.log('');
}

if (issues.length === 0) {
  console.log('  No blocking issues for scrape/intake scripts.\n');
  console.log('  Test: node scripts/scrape-classify.mjs --dry-run');
} else {
  for (const issue of issues) {
    console.log(`  ✗ ${issue}`);
  }
  console.log('\n  Fix: set root .env from https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf/settings/api');
  console.log('       SUPABASE_SERVICE_ROLE_KEY = service_role secret (not publishable/anon)');
  process.exit(1);
}
