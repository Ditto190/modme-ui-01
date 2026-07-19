import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadContract,
  validateFrontmatter,
  validateMdFilename,
  inferTypeFromFilename,
  isIsoTimestamp,
  listInboxFilesSync,
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

  it('validates leaf name for nested web-clipper paths', () => {
    expect(
      validateMdFilename(
        'web-clipper/obsidian/2026-06-20T13-08-00_research_researcher_zettelkasten.md'
      )
    ).toBeNull();
    expect(validateMdFilename('web-clipper/gascity.md')?.code).toBe(
      'INBOX.FM.FILENAME_CONVENTION'
    );
  });

  it('lists top-level and recursive web-clipper files only', () => {
    const dir = mkdtempSync(join(tmpdir(), 'inbox-list-'));
    try {
      writeFileSync(
        join(dir, 'shopping-list.md'),
        '---\ntimestamp: 2026-01-01T00:00:00Z\nagent: t\ntype: research\n---\n'
      );
      writeFileSync(join(dir, 'README.md'), '# skip');
      mkdirSync(join(dir, 'web-clipper', 'obsidian'), { recursive: true });
      writeFileSync(
        join(dir, 'web-clipper', 'obsidian', '2026-06-20T13-08-00_research_researcher_note.md'),
        '---\ntimestamp: 2026-01-01T00:00:00Z\nagent: t\ntype: research\n---\n'
      );
      mkdirSync(join(dir, 'schema-org-guide'), { recursive: true });
      writeFileSync(join(dir, 'schema-org-guide', 'dump.md'), 'x');

      const files = listInboxFilesSync(dir);
      expect(files).toContain('shopping-list.md');
      expect(files).toContain(
        'web-clipper/obsidian/2026-06-20T13-08-00_research_researcher_note.md'
      );
      expect(files.some((f) => f.startsWith('schema-org-guide/'))).toBe(false);
      expect(files).not.toContain('README.md');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('warns on invalid c4_container', () => {
    const findings = validateFrontmatter(
      {
        timestamp: '2026-06-20T13:08:52Z',
        agent: 'cursor',
        type: 'architecture',
        c4_container: 'unknown-container',
      },
      contract
    );
    expect(findings.some((f) => f.code === 'INBOX.FM.INVALID_C4_CONTAINER')).toBe(true);
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
