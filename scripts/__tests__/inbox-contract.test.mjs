import { describe, it, expect } from 'vitest';
import {
  loadContract,
  validateFrontmatter,
  validateMdFilename,
  inferTypeFromFilename,
  isIsoTimestamp,
} from '../lib/inbox-contract.mjs';

describe('inbox contract', () => {
  const contract = loadContract();

  it('loads contract v1 with 384 embedding dimensions', () => {
    expect(contract.version).toBe('1.0');
    expect(contract.embeddingDimensions).toBe(384);
    expect(contract.enums.entryType).toContain('architecture');
  });

  it('validates complete frontmatter', () => {
    const findings = validateFrontmatter(
      {
        timestamp: '2026-06-20T13:08:52Z',
        agent: 'copilot',
        type: 'architecture',
        severity: 'high',
      },
      contract
    );
    expect(findings.filter((f) => f.severity === 'error')).toHaveLength(0);
  });

  it('flags missing timestamp', () => {
    const findings = validateFrontmatter(
      { agent: 'copilot', type: 'research' },
      contract
    );
    expect(findings.some((f) => f.code === 'INBOX.FM.MISSING_TIMESTAMP')).toBe(true);
  });

  it('flags invalid severity as automatable', () => {
    const findings = validateFrontmatter(
      {
        timestamp: '2026-06-20T13:08:52Z',
        agent: 'copilot',
        type: 'research',
        severity: 'urgent',
      },
      contract
    );
    const hit = findings.find((f) => f.code === 'INBOX.FM.INVALID_SEVERITY');
    expect(hit?.automatable).toBe(true);
  });

  it('detects ISO timestamps', () => {
    expect(isIsoTimestamp('2026-06-20T13:08:52Z')).toBe(true);
    expect(isIsoTimestamp('not-a-date')).toBe(false);
  });

  it('infers type from structured filename', () => {
    expect(
      inferTypeFromFilename('2026-06-20T13-08-00_architecture_architect_test.md')
    ).toBe('architecture');
  });

  it('warns on non-structured md filename', () => {
    const finding = validateMdFilename('shopping-list.md');
    expect(finding?.code).toBe('INBOX.FM.FILENAME_CONVENTION');
  });

  it('validates scrape-promote funnel export frontmatter fixture', () => {
    const now = '2026-06-28T12:00:00.000Z';
    const findings = validateFrontmatter(
      {
        timestamp: now,
        agent: 'scrape-pipeline',
        agent_role: 'researcher',
        type: 'research',
        severity: 'medium',
        tags: ['lean-ctx', 'shopping-list'],
        title: 'Lean-ctx performance tuning',
        summary: 'Performance tuning checklist and slow-log guidance.',
      },
      contract
    );
    expect(findings.filter((f) => f.severity === 'error')).toHaveLength(0);
    expect(
      validateMdFilename('2026-06-28T12-00-00_research_researcher_leanctx-com-docs-performance-tuning.md')
        ?.severity
    ).not.toBe('error');
  });
});
