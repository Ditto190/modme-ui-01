/**
 * Append intake stage validation errors to docs/inbox-pipeline/reports/latest.md
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { REPORT_PATHS } from './inbox-report.mjs';

/**
 * @param {{ stage: string, url?: string, path?: string, issues: string[], severity?: 'error' | 'warning' }} entry
 */
export function appendValidationError(entry) {
  const generatedAt = new Date().toISOString();
  const target = entry.url || entry.path || 'unknown';
  const severity = entry.severity || 'error';
  const block = [
    '',
    `### INTAKE.VALIDATION.${entry.stage.toUpperCase()} (${severity})`,
    `- **Stage:** \`${entry.stage}\``,
    `- **Target:** \`${target}\``,
    `- **Time:** ${generatedAt}`,
    ...entry.issues.map((i) => `- ${i}`),
    '',
  ].join('\n');

  appendFileSync(REPORT_PATHS.markdown, block);

  const jsonPath = REPORT_PATHS.json;
  if (!existsSync(jsonPath)) return;

  try {
    const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
    report.findings = report.findings || [];
    report.findings.push({
      code: `INTAKE.VALIDATION.${entry.stage.toUpperCase()}`,
      severity,
      message: entry.issues.join('; '),
      file: target,
      stage: entry.stage,
      generatedAt,
    });
    report.summary = report.summary || {};
    if (severity === 'error') {
      report.summary.errors = (report.summary.errors || 0) + 1;
      report.passed = false;
    } else {
      report.summary.warnings = (report.summary.warnings || 0) + 1;
    }
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  } catch {
    // non-fatal if report json is malformed
  }
}
