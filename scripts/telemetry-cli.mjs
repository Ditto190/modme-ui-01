#!/usr/bin/env node
/** Root shim — delegates to scripts/telemetry/telemetry-cli.mjs */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, 'telemetry/telemetry-cli.mjs');

const proc = spawnSync(process.execPath, [target, ...process.argv.slice(2)], {
  cwd: resolve(__dirname, '..'),
  stdio: 'inherit',
});

process.exit(proc.status ?? 1);
