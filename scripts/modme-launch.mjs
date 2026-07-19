#!/usr/bin/env node
/**
 * ModMe launch dispatcher — cross-platform entry for session/health/KM verify.
 * Usage: node scripts/modme-launch.mjs <mode> [extra args...]
 * Modes: auto | health | full | verify | km-verify | session-start
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] ?? 'health';
const extraArgs = process.argv.slice(3);

const VALID_MODES = new Set([
  'auto',
  'health',
  'full',
  'verify',
  'km-verify',
  'session-start',
]);

if (!VALID_MODES.has(mode)) {
  console.error(
    `modme-launch: unknown mode "${mode}". Valid: ${[...VALID_MODES].join(', ')}`,
  );
  process.exit(1);
}

const psScript = join(root, 'scripts', 'modme-launch.ps1');
const bashScript = join(root, 'scripts', 'shell', 'modme-launch.bash');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

if (process.platform === 'win32') {
  if (!existsSync(psScript)) {
    console.error(`modme-launch: missing ${psScript}`);
    process.exit(1);
  }
  run('powershell', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    psScript,
    '-Mode',
    mode,
    ...extraArgs,
  ]);
}

if (!existsSync(bashScript)) {
  console.error(`modme-launch: missing ${bashScript}`);
  process.exit(1);
}

run('bash', [bashScript, mode, ...extraArgs]);
