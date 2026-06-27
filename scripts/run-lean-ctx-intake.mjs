#!/usr/bin/env node
/**
 * Run lean-ctx intake process.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptsDir);
const dryRun = process.argv.includes('--dry-run');
const full = process.argv.includes('--full');

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

loadEnvFile(join(repoRoot, '.env'));

console.log('Running lean-ctx intake process...');

if (dryRun) {
  console.log('[DRY RUN] Would execute: npx lean-ctx knowledge export --format json --output knowledge-base.json');
} else {
  try {
    console.log('Exporting lean-ctx knowledge...');
    const result = spawnSync(
      'npx',
      ['lean-ctx', 'knowledge', 'export', '--format', 'json', '--output', 'knowledge-base.json'],
      { cwd: repoRoot, encoding: 'utf8', shell: true },
    );
    if (result.status === 0) {
      console.log('Successfully exported to knowledge-base.json');
    } else {
      const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
      if (/No knowledge stored/i.test(combined)) {
        console.log('Skipping lean-ctx export: no project knowledge yet.');
      } else {
        console.error(combined.trim() || 'lean-ctx knowledge export failed');
        process.exit(result.status ?? 1);
      }
    }
  } catch (error) {
    console.error('Failed to export lean-ctx knowledge:', error.message);
    process.exit(1);
  }
}
