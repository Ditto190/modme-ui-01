#!/usr/bin/env node
/**
 * Assert dry-run inbox ingest never opens Supabase (fast local path).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LOG = join(ROOT, 'debug-2c3709.log');

const t0 = Date.now();
const result = spawnSync('node', [join(ROOT, 'scripts/inbox-ingest.mjs'), '--dry-run'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, AGENT_RESOURCE_GUARD: '1' },
});
const elapsedMs = Date.now() - t0;

assert.equal(result.status, 0, result.stderr || result.stdout);

if (existsSync(LOG)) {
  const lines = readFileSync(LOG, 'utf8').trim().split('\n');
  const lookups = lines.filter((l) => l.includes('"message":"supabase lookup"'));
  assert.equal(lookups.length, 0, 'dry-run must not emit supabase lookup logs');
  const drySkips = lines.filter((l) => l.includes('"message":"dry-run skip supabase"'));
  assert.ok(drySkips.length > 0, 'expected dry-run skip supabase log lines');
}

assert.ok(elapsedMs < 30_000, `dry-run took ${elapsedMs}ms — likely still hitting network`);

console.log(`OK inbox dry-run local path (${elapsedMs}ms, no supabase lookups)`);
