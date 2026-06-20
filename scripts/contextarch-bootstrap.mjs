#!/usr/bin/env node
/**
 * Non-interactive contextarch bootstrap from scripts/contextarch-targets.json.
 * Usage: node scripts/contextarch-bootstrap.mjs <target> [--overwrite]
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const writeTarget = join(repoRoot, '.vendor', 'contextarch-cli-main', 'dist', 'write-target.js');
const targetsFile = join(repoRoot, 'scripts', 'contextarch-targets.json');
const [targetName, ...flags] = process.argv.slice(2);

if (!targetName) {
  console.error('Usage: node scripts/contextarch-bootstrap.mjs <target> [--overwrite]');
  console.error('Targets: see scripts/contextarch-targets.json');
  process.exit(1);
}

if (!existsSync(writeTarget)) {
  console.error('contextarch write-target is not built. Run: yarn contextarch:install');
  process.exit(1);
}

const env = { ...process.env };
delete env.NODE_OPTIONS;

const result = spawnSync(
  process.execPath,
  [writeTarget, targetsFile, targetName, ...flags],
  { stdio: 'inherit', cwd: join(repoRoot, '.vendor', 'contextarch-cli-main'), env },
);

process.exit(result.status ?? 1);
