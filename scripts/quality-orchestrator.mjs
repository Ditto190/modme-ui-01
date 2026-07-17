#!/usr/bin/env node
/**
 * ModMe quality orchestrator (minimal).
 *
 * Reads a preflight report JSON and prints next-step commands.
 * Focus: keep `yarn quality:route` functional for session-start hints.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_REPORT = path.resolve(ROOT, 'docs/devops/reports/preflight-latest.json');
const MANIFEST_PATH = path.resolve(ROOT, 'scripts/quality-orchestrator.manifest.json');

function parseArgs(argv) {
  const args = {
    from: undefined,
    pr: undefined,
    runtime: 'cursor',
    applyLabels: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from') args.from = argv[++i];
    else if (a === '--pr') args.pr = argv[++i];
    else if (a === '--runtime') args.runtime = argv[++i] ?? args.runtime;
    else if (a === '--apply-labels') args.applyLabels = true;
    else if (a === '--json') args.json = true;
    // ignore unknown flags for now
  }
  return args;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function resolveFailureClass(report) {
  // Prefer failed steps (more specific), then summary.failureClasses.
  const steps = Array.isArray(report?.steps) ? report.steps : [];
  const failing = steps.find((s) => s?.status && s.status !== 'passed');
  if (failing?.failureClass) return failing.failureClass;
  const classes = report?.summary?.failureClasses;
  if (Array.isArray(classes) && classes.length > 0) return classes[0];
  return 'green pass';
}

function pickRouting(manifest, failureClass, runtime) {
  const key = failureClass === 'green pass' ? 'green pass' : failureClass;
  const entry = manifest?.routing?.[key] ?? manifest?.routing?.['green pass'];
  const cursor = entry?.cursor ?? [];
  // Only cursor mode implemented; tmux returns same guidance for now.
  if (runtime === 'tmux') return cursor;
  return cursor;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reportPath = path.resolve(ROOT, args.from ?? path.relative(ROOT, DEFAULT_REPORT));
  const manifest = readJson(MANIFEST_PATH);

  if (!fs.existsSync(reportPath)) {
    const msg = `quality-orchestrator: report not found: ${path.relative(ROOT, reportPath)}`;
    if (args.json) {
      console.log(JSON.stringify({ ok: false, error: msg }, null, 2));
      process.exit(0);
    }
    console.error(msg);
    process.exit(1);
  }

  const report = readJson(reportPath);
  const failureClass = resolveFailureClass(report);
  const commands = pickRouting(manifest, failureClass, args.runtime);

  const output = {
    ok: failureClass === 'green pass',
    failureClass,
    runtime: args.runtime,
    reportPath: path.relative(ROOT, reportPath),
    commands,
    note: args.applyLabels ? 'apply-labels currently not implemented in minimal orchestrator.' : undefined,
    pr: args.pr ?? undefined,
  };

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`[quality:route] failureClass=${output.failureClass} runtime=${output.runtime}`);
  if (commands.length === 0) {
    console.log('No commands mapped for this class.');
    return;
  }

  console.log('Suggested next steps:');
  for (const c of commands) console.log(`- ${c}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

