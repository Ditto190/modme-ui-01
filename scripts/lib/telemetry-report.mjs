/**
 * Write observability audit reports (ADR-pattern, mirrors inbox-report).
 */
import { writeFileSync, mkdirSync, appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, '../..');

export const REPORT_PATHS = {
  json: join(REPO_ROOT, 'docs/inbox-pipeline/reports/observability-latest.json'),
  markdown: join(REPO_ROOT, 'docs/inbox-pipeline/reports/observability-latest.md'),
  jsonl: join(REPO_ROOT, '.cursor/hooks/state/observability-errors.jsonl'),
};

function buildMarkdown(report) {
  const lines = [
    '# Observability Pipeline Audit Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Lens: \`${report.lens}\` | Strict: ${report.strict} | Passed: **${report.passed ? 'YES' : 'NO'}**`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Errors | ${report.summary.errors} |`,
    `| Warnings | ${report.summary.warnings} |`,
    `| Total findings | ${report.summary.total} |`,
    `| Rows/files scanned | ${report.summary.files ?? 0} |`,
    '',
  ];

  if (report.findings.length === 0) {
    lines.push('_No findings._', '');
  } else {
    lines.push('## Findings', '');
    for (const f of report.findings) {
      lines.push(`- **${f.severity.toUpperCase()}** \`${f.code}\` (${f.lens}) — ${f.message}`);
      if (f.fixHint) lines.push(`  - Fix: ${f.fixHint}`);
    }
    lines.push('');
  }

  lines.push(
    '## Commands',
    '',
    '```powershell',
    'yarn telemetry:audit --lens all',
    'yarn telemetry:test',
    'yarn telemetry:sync:dry-run',
    'yarn dsp:observability:stats',
    '```',
    '',
  );

  if (!report.passed && report.summary.errors > 0) {
    lines.push(
      '> **Operational hint:** If Session Ops feed is empty, run `cd next-forge && bun run db:push` then `yarn telemetry:sync`.',
      '',
    );
  }

  return `${lines.join('\n')}\n`;
}

export function writeTelemetryReport({
  source,
  lens,
  strict = false,
  summary,
  findings,
}) {
  const generatedAt = new Date().toISOString();
  const report = {
    version: '1.0',
    generatedAt,
    source,
    lens,
    strict,
    passed: summary.passed,
    summary: {
      files: summary.files ?? 0,
      errors: summary.errors,
      warnings: summary.warnings,
      total: summary.total,
      automatable: summary.automatable,
      byLens: summary.byLens,
      byCode: summary.byCode,
    },
    findings,
    automation: {
      revalidate: 'yarn telemetry:audit',
      test: 'yarn telemetry:test',
      syncDryRun: 'yarn telemetry:sync:dry-run',
      dspStats: 'yarn dsp:observability:stats',
    },
    paths: {
      json: 'docs/inbox-pipeline/reports/observability-latest.json',
      markdown: 'docs/inbox-pipeline/reports/observability-latest.md',
      jsonl: '.cursor/hooks/state/observability-errors.jsonl',
    },
    root: REPO_ROOT,
  };

  mkdirSync(join(REPO_ROOT, 'docs/inbox-pipeline/reports'), { recursive: true });
  mkdirSync(join(REPO_ROOT, '.cursor/hooks/state'), { recursive: true });

  writeFileSync(REPORT_PATHS.json, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(REPORT_PATHS.markdown, buildMarkdown(report));

  for (const f of findings.filter((x) => x.severity === 'error')) {
    const line = JSON.stringify({ ts: generatedAt, ...f });
    appendFileSync(REPORT_PATHS.jsonl, `${line}\n`);
  }

  return report;
}

export function readLatestReport() {
  if (!existsSync(REPORT_PATHS.json)) return null;
  return JSON.parse(readFileSync(REPORT_PATHS.json, 'utf8'));
}
