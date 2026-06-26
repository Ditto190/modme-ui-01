/**
 * Write inbox audit reports (ADR-pattern).
 */
import { writeFileSync, mkdirSync, appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './inbox-contract.mjs';

export const REPORT_PATHS = {
  json: join(REPO_ROOT, 'docs/inbox-pipeline/reports/latest.json'),
  markdown: join(REPO_ROOT, 'docs/inbox-pipeline/reports/latest.md'),
  jsonl: join(REPO_ROOT, '.cursor/hooks/state/inbox-errors.jsonl'),
};

export function writeInboxReport({
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
      fixAllDryRun: 'yarn inbox:fix',
      fixAllApply: 'yarn inbox:fix:apply',
      revalidate: 'yarn inbox:audit',
      test: 'yarn inbox:test',
      orchestrate: 'yarn intake:orchestrate',
    },
    paths: {
      json: 'docs/inbox-pipeline/reports/latest.json',
      markdown: 'docs/inbox-pipeline/reports/latest.md',
      jsonl: '.cursor/hooks/state/inbox-errors.jsonl',
    },
    root: REPO_ROOT,
  };

  mkdirSync(join(REPO_ROOT, 'docs/inbox-pipeline/reports'), { recursive: true });
  mkdirSync(join(REPO_ROOT, '.cursor/hooks/state'), { recursive: true });

  writeFileSync(REPORT_PATHS.json, `${JSON.stringify(report, null, 2)}\n`);

  const md = buildMarkdown(report);
  writeFileSync(REPORT_PATHS.markdown, md);

  const jsonlLine = JSON.stringify({
    ts: generatedAt,
    source,
    lens,
    passed: summary.passed,
    errors: summary.errors,
    warnings: summary.warnings,
    topCodes: Object.keys(summary.byCode).slice(0, 5),
  });
  appendFileSync(REPORT_PATHS.jsonl, `${jsonlLine}\n`);

  return report;
}

function buildMarkdown(report) {
  const lines = [
    '# Inbox Pipeline Quality Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Source: \`${report.source}\``,
    `Lens: **${report.lens}**`,
    `Status: **${report.passed ? 'PASS' : 'FAIL'}**`,
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Files scanned | ${report.summary.files ?? 0} |`,
    `| Errors | ${report.summary.errors} |`,
    `| Warnings | ${report.summary.warnings} |`,
    `| Automatable | ${report.summary.automatable} |`,
    '',
    '## Automation',
    '',
    '```powershell',
    'yarn inbox:audit              # re-run audit',
    'yarn inbox:fix                # preview safe fixes',
    'yarn inbox:fix:apply          # apply safe fixes',
    'yarn intake:orchestrate       # full pipeline',
    '```',
    '',
  ];

  if (report.findings.length === 0) {
    lines.push('_No findings._', '');
    return lines.join('\n');
  }

  lines.push('## Findings', '');
  for (const f of report.findings) {
    lines.push(`### ${f.code} (${f.severity})`);
    if (f.file) lines.push(`- **File:** \`${f.file}\``);
    lines.push(`- ${f.message}`);
    if (f.fixHint) lines.push(`- Fix: ${f.fixHint}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function loadLatestReport() {
  if (!existsSync(REPORT_PATHS.json)) return null;
  return JSON.parse(readFileSync(REPORT_PATHS.json, 'utf8'));
}
