import { describe, it, expect } from 'vitest';
import { writeInboxReport, REPORT_PATHS } from '../lib/inbox-report.mjs';
import { readFileSync, existsSync } from 'node:fs';

describe('inbox report', () => {
  it('writes latest.json and latest.md', () => {
    const report = writeInboxReport({
      source: 'test',
      lens: 'funnel',
      strict: false,
      summary: {
        files: 1,
        errors: 0,
        warnings: 0,
        total: 0,
        automatable: 0,
        byCode: {},
        byLens: {},
        passed: true,
        findings: [],
      },
      findings: [],
    });

    expect(report.passed).toBe(true);
    expect(existsSync(REPORT_PATHS.json)).toBe(true);
    expect(existsSync(REPORT_PATHS.markdown)).toBe(true);
    const md = readFileSync(REPORT_PATHS.markdown, 'utf8');
    expect(md).toContain('Inbox Pipeline Quality Report');
  });
});
