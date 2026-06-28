#!/usr/bin/env node
/**
 * Bootstrap observability-only DSP subgraph (~15–25 entities).
 * Idempotent: skips init if .dsp/TOC already exists.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DSP = join(ROOT, 'scripts', 'dsp-cli.py');

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function dsp(args) {
  const out = run(`python "${DSP}" --root "${ROOT}" ${args}`);
  return out;
}

function lastUid(output) {
  const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (/^(obj|func)-[0-9a-f]{8}$/.test(lines[i])) return lines[i];
  }
  throw new Error(`No uid in dsp output: ${output}`);
}

function createObject(source, purpose, extra = '', tocUid = null) {
  const tocFlag = tocUid ? `--toc ${tocUid}` : '';
  return lastUid(dsp(`create-object "${source}" "${purpose}" ${tocFlag} ${extra}`.trim()));
}

function createFunction(source, purpose, ownerFlag = '', tocUid = null) {
  const tocFlag = tocUid ? `--toc ${tocUid}` : '';
  return lastUid(dsp(`create-function "${source}" "${purpose}" ${ownerFlag} ${tocFlag}`.trim()));
}

function addImport(importer, imported, why) {
  dsp(`add-import ${importer} ${imported} "${why}"`);
}

function main() {
  if (!existsSync(DSP)) {
    console.error('Missing scripts/dsp-cli.py — download from data-structure-protocol repo');
    process.exit(1);
  }

  const tocPath = join(ROOT, '.dsp', 'TOC');
  if (existsSync(tocPath)) {
    console.log('DSP observability subgraph already bootstrapped (.dsp/TOC exists) — skipped');
    return;
  }

  dsp('init');

  const rootUid = createObject(
    'scripts/telemetry/telemetry-cli.mjs',
    'Observability CLI entry — sync, collect, report, ingest-copilot subcommands.',
    '--new-root --scope scripts',
  );

  const bridgeUid = createObject(
    'scripts/telemetry/lib/telemetry-bridge.mjs',
    'Zod normalize and dual-write bridge to Supabase pipeline_runs, telemetry_events, eval_signals, and Greptime spans.',
    '',
    rootUid,
  );

  const auditUid = createObject(
    'scripts/telemetry-audit.mjs',
    'Data-quality audit CLI with contracts, pipeline, and sync lenses.',
    '',
    rootUid,
  );

  const contractDocUid = createObject(
    'docs/inbox-pipeline/contracts/observability-contract.v1.json',
    'Published observability contract enums shared with inbox ADR-0009.',
    '--kind external',
    rootUid,
  );

  const schemaUid = createObject(
    'next-forge/packages/schemas/observability.ts',
    'Zod schemas and golden snapshot source for observability contracts.',
    '',
    rootUid,
  );

  const migrationUid = createObject(
    'next-forge/supabase/migrations/009_observability_tenant.sql',
    'Tenant-scoped observability tables: pipeline_runs, trace_refs, RLS policies.',
    '--kind external',
    rootUid,
  );

  const apiUid = createObject(
    'next-forge/apps/api/app/telemetry/ingest/route.ts',
    'HTTP ingest route feeding Session Ops telemetry feed.',
    '',
    rootUid,
  );

  const greptimeUid = createObject(
    'experiments/micro-agents/models/greptimedb_client.ts',
    'Greptime agent_spans and agent_metrics client for dual-store spans.',
    '--kind external',
    rootUid,
  );

  const sessionOpsUid = createObject(
    'next-forge/apps/app/app/(authenticated)/knowledge/components/session-ops-panel.tsx',
    'Session Ops panel — data-dense pipeline run table in Knowledge UI.',
    '',
    rootUid,
  );

  const signalCardUid = createObject(
    'next-forge/apps/app/app/(authenticated)/knowledge/components/ops-signal-card.tsx',
    'OpsSignalCard molecule rendering eval_signals and pipeline metrics.',
    '',
    rootUid,
  );

  const telemetryEventSchemaUid = createObject(
    'packages/intake-contracts/schemas/telemetry-event.mjs',
    'Intake contract schema for telemetry_events normalization.',
    '',
    rootUid,
  );

  const pipelineRunSchemaUid = createObject(
    'packages/intake-contracts/schemas/pipeline-run.mjs',
    'Intake contract schema for pipeline_runs lifecycle.',
    '',
    rootUid,
  );

  const evalSignalSchemaUid = createObject(
    'packages/intake-contracts/schemas/eval-signal.mjs',
    'Intake contract schema for eval_signals themes and impact.',
    '',
    rootUid,
  );

  const syncFnUid = createFunction(
    'scripts/telemetry/telemetry-cli.mjs#sync',
    'Collect local logs and dry-run or promote via telemetry-bridge.',
    `--owner ${rootUid}`,
    rootUid,
  );

  const reportFnUid = createFunction(
    'scripts/telemetry/telemetry-cli.mjs#report',
    'Render observability HTML report and catalogue artefact.',
    `--owner ${rootUid}`,
    rootUid,
  );

  addImport(rootUid, bridgeUid, 'CLI delegates normalize and promote to telemetry-bridge.');
  addImport(rootUid, contractDocUid, 'CLI and bridge validate against published contract enums.');
  addImport(rootUid, auditUid, 'Maintenance agents run telemetry-audit after pipeline edits.');
  addImport(bridgeUid, telemetryEventSchemaUid, 'Bridge parses telemetry events through intake-contracts.');
  addImport(bridgeUid, pipelineRunSchemaUid, 'Bridge opens and closes pipeline_runs with shared schema.');
  addImport(bridgeUid, evalSignalSchemaUid, 'Bridge stores eval_signals from collect payloads.');
  addImport(bridgeUid, schemaUid, 'Bridge aligns runtime validation with @repo/schemas observability types.');
  addImport(apiUid, schemaUid, 'Ingest route validates payloads with observability Zod schemas.');
  addImport(apiUid, bridgeUid, 'Ingest route persists events through bridge store helpers.');
  addImport(sessionOpsUid, signalCardUid, 'Session Ops panel renders OpsSignalCard rows.');
  addImport(sessionOpsUid, apiUid, 'Session Ops panel reads telemetry feed from API route.');
  addImport(rootUid, migrationUid, 'Promote stage writes tenant-scoped rows defined in migration 009.');
  addImport(bridgeUid, greptimeUid, 'Dual-write path emits agent_spans via Greptime client when configured.');
  addImport(auditUid, contractDocUid, 'Contracts lens compares golden fixture to observability-contract.v1.json.');

  dsp(`add-to-toc --toc ${rootUid} ${[
    rootUid,
    bridgeUid,
    auditUid,
    contractDocUid,
    schemaUid,
    migrationUid,
    apiUid,
    greptimeUid,
    sessionOpsUid,
    signalCardUid,
    telemetryEventSchemaUid,
    pipelineRunSchemaUid,
    evalSignalSchemaUid,
    syncFnUid,
    reportFnUid,
  ].join(' ')}`);

  dsp('rebuild-cache');
  console.log(`Bootstrapped observability DSP subgraph (root ${rootUid})`);
}

main();
