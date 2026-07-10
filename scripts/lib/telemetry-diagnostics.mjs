/**
 * Observability pipeline finding codes and helpers.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const LENSES = ['contracts', 'pipeline', 'sync', 'all'];

export function createFinding({
  code,
  lens,
  severity = 'error',
  file = null,
  automatable = false,
  message,
  fixHint = null,
}) {
  return {
    code,
    lens,
    severity,
    file,
    automatable,
    message,
    fixHint,
  };
}

const STRICT_EXEMPT_CODES = new Set([
  'OBS.DB.TRACE_REF_ORPHAN',
  'OBS.DB.INVALID_TELEMETRY_LEVEL',
]);

export function summarizeFindings(findings, { strict = false } = {}) {
  const effective = strict
    ? findings.map((f) => {
      if (f.severity !== 'warning' || STRICT_EXEMPT_CODES.has(f.code)) return f;
      return { ...f, severity: 'error' };
    })
    : findings;

  const errors = effective.filter((f) => f.severity === 'error').length;
  const warnings = effective.filter((f) => f.severity === 'warning').length;
  const automatable = effective.filter((f) => f.automatable).length;

  const byCode = {};
  const byLens = {};
  for (const f of effective) {
    byCode[f.code] = (byCode[f.code] ?? 0) + 1;
    byLens[f.lens ?? 'unknown'] = (byLens[f.lens ?? 'unknown'] ?? 0) + 1;
  }

  return {
    errors,
    warnings,
    total: effective.length,
    automatable,
    byCode,
    byLens,
    passed: errors === 0,
    findings: effective,
  };
}

export function exitCodeFromSummary(summary) {
  return summary.passed ? 0 : 1;
}

export function loadExpectations(repoRoot) {
  const path = join(
    repoRoot,
    'docs/inbox-pipeline/contracts/expectations/observability.v1.json',
  );
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadObservabilityContract(repoRoot) {
  const path = join(
    repoRoot,
    'docs/inbox-pipeline/contracts/observability-contract.v1.json',
  );
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadGoldenFixture(repoRoot) {
  const path = join(
    repoRoot,
    'next-forge/packages/schemas/fixtures/observability-contract.golden.json',
  );
  return JSON.parse(readFileSync(path, 'utf8'));
}
