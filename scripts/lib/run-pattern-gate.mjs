#!/usr/bin/env node
/**
 * Run verify commands for a pattern ID from specs/013-agent-workflow-gates/patterns/coverage-map.json
 *
 * Usage: node scripts/lib/run-pattern-gate.mjs --pattern federated-dual-stack
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const COVERAGE_MAP = resolve(
  ROOT,
  'specs/013-agent-workflow-gates/patterns/coverage-map.json'
);

function parseArgs(argv) {
  const idx = argv.indexOf('--pattern');
  if (idx === -1 || !argv[idx + 1]) {
    console.error('Usage: node scripts/lib/run-pattern-gate.mjs --pattern <pattern-id>');
    process.exit(1);
  }
  return argv[idx + 1];
}

function loadCoverageMap() {
  const raw = readFileSync(COVERAGE_MAP, 'utf8');
  return JSON.parse(raw);
}

function runCommand(cmd) {
  console.log(`[pattern-gate] ${cmd}`);
  const result = spawnSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

const patternId = parseArgs(process.argv.slice(2));
const map = loadCoverageMap();
const entry = map.patterns?.[patternId];

if (!entry) {
  const known = Object.keys(map.patterns ?? {}).join(', ');
  console.error(`Unknown pattern "${patternId}". Known: ${known}`);
  process.exit(1);
}

const verify = entry.verify ?? [];
if (verify.length === 0) {
  console.error(`Pattern "${patternId}" has no verify commands.`);
  process.exit(1);
}

console.log(
  `[pattern-gate] pattern=${patternId} domain=${entry.checklistDomain ?? 'n/a'} commands=${verify.length}`
);

let exitCode = 0;
for (const cmd of verify) {
  const status = runCommand(cmd);
  if (status !== 0) {
    exitCode = status;
    break;
  }
}

process.exit(exitCode);
