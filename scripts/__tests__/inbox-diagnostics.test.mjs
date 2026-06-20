import { describe, it, expect } from 'vitest';
import { summarizeFindings, exitCodeFromSummary } from '../lib/inbox-diagnostics.mjs';

describe('inbox diagnostics', () => {
  it('summarizes findings by severity', () => {
    const summary = summarizeFindings([
      { code: 'A', severity: 'error', lens: 'funnel' },
      { code: 'B', severity: 'warning', lens: 'funnel' },
    ]);
    expect(summary.errors).toBe(1);
    expect(summary.warnings).toBe(1);
    expect(summary.passed).toBe(false);
  });

  it('strict mode promotes warnings to errors except advisory codes', () => {
    const summary = summarizeFindings(
      [
        { code: 'INBOX.FM.FILENAME_CONVENTION', severity: 'warning', lens: 'funnel' },
        { code: 'INBOX.FM.MISSING_AGENT', severity: 'warning', lens: 'funnel' },
      ],
      { strict: true }
    );
    expect(summary.errors).toBe(1);
    expect(summary.warnings).toBe(1);
  });

  it('returns exit 0 when passed', () => {
    const summary = summarizeFindings([]);
    expect(exitCodeFromSummary(summary)).toBe(0);
  });
});
