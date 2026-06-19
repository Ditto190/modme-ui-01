#!/usr/bin/env node
/**
 * Run vendored contextarch CLI (built by scripts/install-contextarch.ps1).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const cliEntry = join(repoRoot, '.vendor', 'contextarch-cli-main', 'dist', 'index.js');
const vendorRoot = join(repoRoot, '.vendor', 'contextarch-cli-main');

if (!existsSync(cliEntry)) {
  console.error(
    'contextarch is not built. Run: yarn contextarch:install\n' +
    `Expected: ${cliEntry}`,
  );
  process.exit(1);
}

function normalizeArgs(argv) {
  const args = [...argv];
  const callerCwd = process.cwd();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '-C' || arg === '--cwd') {
      const next = args[i + 1];
      if (!next) continue;
      args[i + 1] = isAbsolute(next) ? next : resolve(callerCwd, next);
      i += 1;
      continue;
    }
    if (arg.startsWith('--cwd=')) {
      const value = arg.slice('--cwd='.length);
      args[i] = `--cwd=${isAbsolute(value) ? value : resolve(callerCwd, value)}`;
    }
  }

  return args;
}

const env = { ...process.env };
// Yarn PnP at repo root breaks vendor CLI deps.
delete env.NODE_OPTIONS;

const result = spawnSync(process.execPath, [cliEntry, ...normalizeArgs(process.argv.slice(2))], {
  stdio: 'inherit',
  cwd: vendorRoot,
  env,
});

process.exit(result.status ?? 1);
