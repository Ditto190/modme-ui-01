#!/usr/bin/env node
/**
 * @feature OBSERVABILITY.CONTRACT.AUDIT
 * Audit observability contracts, Supabase pipeline rows, and sync dry-run.
 *
 * Usage:
 *   node scripts/telemetry-audit.mjs [--lens contracts|pipeline|sync|all] [--strict]
 */
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { redactSecrets } from './lib/telemetry-bridge.mjs';
import {
  createFinding,
  summarizeFindings,
  exitCodeFromSummary,
  loadExpectations,
  loadObservabilityContract,
  loadGoldenFixture,
} from './lib/telemetry-diagnostics.mjs';
import { writeTelemetryReport, REPO_ROOT } from './lib/telemetry-report.mjs';

const args = process.argv.slice(2);
const lensIdx = args.indexOf('--lens');
const LENS = lensIdx !== -1 ? args[lensIdx + 1] : 'all';
const STRICT = args.includes('--strict');

function auditContracts() {
  const findings = [];
  const contract = loadObservabilityContract(REPO_ROOT);
  const golden = loadGoldenFixture(REPO_ROOT);
  loadExpectations(REPO_ROOT);

  const pairs = [
    ['pipelineStatus', contract.enums.pipelineStatus, golden.enums.pipelineStatuses],
    ['evalImpact', contract.enums.evalImpact, golden.enums.evalImpactLevels],
    ['telemetryLevel', contract.enums.telemetryLevel, golden.enums.telemetryLevels],
  ];

  for (const [name, docEnums, goldenEnums] of pairs) {
    const docSet = new Set(docEnums ?? []);
    const goldenSet = new Set(goldenEnums ?? []);
    if (docSet.size !== goldenSet.size || [...docSet].some((v) => !goldenSet.has(v))) {
      findings.push(createFinding({
        code: 'OBS.CONTRACT.SNAPSHOT_DRIFT',
        lens: 'contracts',
        severity: 'error',
        automatable: true,
        message: `${name} enum drift between observability-contract.v1.json and golden fixture`,
        fixHint: 'Align docs/inbox-pipeline/contracts/observability-contract.v1.json and next-forge/packages/schemas/fixtures/observability-contract.golden.json',
      }));
    }
  }

  if (golden.contractVersion && contract.version) {
    const goldenMajor = String(golden.contractVersion).split('.')[0];
    const docMajor = String(contract.version).split('.')[0];
    if (goldenMajor !== docMajor) {
      findings.push(createFinding({
        code: 'OBS.CONTRACT.VERSION_MISMATCH',
        lens: 'contracts',
        severity: 'warning',
        automatable: false,
        message: `Contract version ${contract.version} vs golden ${golden.contractVersion}`,
      }));
    }
  }

  const fixtureWithSecret = 'token sk-abcdefghijklmnopqrstuvwxyz1234567890';
  const redacted = redactSecrets(fixtureWithSecret);
  if (redacted.includes('sk-')) {
    findings.push(createFinding({
      code: 'OBS.PAYLOAD.SECRET_LEAK',
      lens: 'contracts',
      severity: 'error',
      automatable: true,
      message: 'telemetry-bridge redactSecrets did not strip sk- pattern from fixture',
      fixHint: 'Update SECRET_PATTERNS in scripts/telemetry/lib/telemetry-bridge.mjs',
    }));
  }

  return { findings, filesScanned: 3 };
}

async function auditPipeline(contract) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('telemetry-audit: skipping pipeline lens (missing Supabase env)');
    return { findings: [], filesScanned: 0 };
  }

  const supabase = createClient(url, key);
  const findings = [];
  const greptimeEnabled = Boolean(process.env.GREPTIME_PSQL_URL);

  const tables = [
    { name: 'pipeline_runs', statusField: 'status', statusEnum: contract.enums.pipelineStatus },
    { name: 'telemetry_events', statusField: 'level', statusEnum: contract.enums.telemetryLevel, optionalStatus: true },
    { name: 'eval_signals', statusField: 'impact', statusEnum: contract.enums.evalImpact },
  ];

  for (const table of tables) {
    const { data: rows, error } = await supabase.from(table.name).select('*').limit(200);
    if (error) {
      findings.push(createFinding({
        code: 'OBS.DB.QUERY_FAILED',
        lens: 'pipeline',
        severity: 'error',
        automatable: false,
        message: `${table.name}: ${error.message}`,
      }));
      continue;
    }

    for (const row of rows ?? []) {
      if (!row.tenant_id) {
        findings.push(createFinding({
          code: 'OBS.DB.MISSING_TENANT',
          lens: 'pipeline',
          severity: 'error',
          file: `${table.name}:${row.id ?? 'unknown'}`,
          message: `${table.name} row missing tenant_id`,
        }));
      }

      const value = row[table.statusField];
      if (value != null && table.statusEnum && !table.statusEnum.includes(value)) {
        findings.push(createFinding({
          code: table.name === 'pipeline_runs'
            ? 'OBS.DB.INVALID_PIPELINE_STATUS'
            : table.name === 'eval_signals'
              ? 'OBS.DB.INVALID_EVAL_IMPACT'
              : 'OBS.DB.INVALID_TELEMETRY_LEVEL',
          lens: 'pipeline',
          severity: table.optionalStatus ? 'warning' : 'error',
          file: `${table.name}:${row.id ?? 'unknown'}`,
          message: `${table.name}.${table.statusField}=${value} not in contract enum`,
        }));
      }
    }
  }

  if (greptimeEnabled) {
    const { data: traceRefs, error } = await supabase
      .from('trace_refs')
      .select('telemetry_event_id, greptime_span_id')
      .limit(200);

    if (error) {
      findings.push(createFinding({
        code: 'OBS.DB.QUERY_FAILED',
        lens: 'pipeline',
        severity: 'warning',
        message: `trace_refs: ${error.message}`,
      }));
    } else {
      for (const row of traceRefs ?? []) {
        if (!row.telemetry_event_id || !row.greptime_span_id) {
          findings.push(createFinding({
            code: 'OBS.DB.TRACE_REF_ORPHAN',
            lens: 'pipeline',
            severity: 'warning',
            automatable: false,
            message: 'trace_refs row missing telemetry_event_id or greptime_span_id',
          }));
        }
      }
    }
  }

  return { findings, filesScanned: tables.length };
}

function auditSync() {
  const findings = [];
  try {
    execSync('node scripts/telemetry/telemetry-cli.mjs sync --dry-run', {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (err) {
    const stderr = err.stderr?.toString?.() ?? err.message ?? 'sync dry-run failed';
    findings.push(createFinding({
      code: 'OBS.SYNC.DRY_RUN_FAILED',
      lens: 'sync',
      severity: 'error',
      automatable: true,
      message: stderr.split('\n')[0] || 'telemetry-cli sync --dry-run failed',
      fixHint: 'Run node scripts/telemetry/telemetry-cli.mjs sync --dry-run locally',
    }));
  }

  return { findings, filesScanned: 1 };
}

async function main() {
  const contract = loadObservabilityContract(REPO_ROOT);
  let allFindings = [];
  let filesScanned = 0;

  const runContracts = LENS === 'contracts' || LENS === 'all';
  const runPipeline = LENS === 'pipeline' || LENS === 'all';
  const runSync = LENS === 'sync' || LENS === 'all';

  if (runContracts) {
    const r = auditContracts();
    allFindings = allFindings.concat(r.findings);
    filesScanned += r.filesScanned;
  }
  if (runPipeline) {
    const r = await auditPipeline(contract);
    allFindings = allFindings.concat(r.findings);
    filesScanned += r.filesScanned;
  }
  if (runSync) {
    const r = auditSync();
    allFindings = allFindings.concat(r.findings);
    filesScanned += r.filesScanned;
  }

  const summary = summarizeFindings(allFindings, { strict: STRICT });

  writeTelemetryReport({
    source: 'telemetry-audit',
    lens: LENS,
    strict: STRICT,
    summary: { ...summary, files: filesScanned },
    findings: summary.findings,
  });

  console.log(
    `telemetry-audit [${LENS}]: ${summary.errors} errors, ${summary.warnings} warnings (${summary.passed ? 'PASS' : 'FAIL'})`,
  );
  console.log('Report: docs/inbox-pipeline/reports/observability-latest.md');

  process.exit(exitCodeFromSummary(summary));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
