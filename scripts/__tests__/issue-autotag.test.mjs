import { describe, it, expect } from 'vitest';
import {
  stackLabelsForPaths,
  labelsForPaths,
  labelsForIssueBody,
  globMatches,
  syncBeadsExternalFromBody,
} from '../lib/issue-autotag.mjs';

describe('issue-autotag', () => {
  it('labels next-forge paths as stack:forge', () => {
    const labels = stackLabelsForPaths(['next-forge/apps/app/page.tsx']);
    expect(labels).toEqual(['stack:forge']);
  });

  it('labels GenerativeUI paths as stack:generative', () => {
    const labels = stackLabelsForPaths(['GenerativeUI_monorepo/apps/web/package.json']);
    expect(labels).toEqual(['stack:generative']);
  });

  it('labels orchestration paths', () => {
    const labels = stackLabelsForPaths(['scripts/intake-orchestrator.mjs']);
    expect(labels).toEqual(['stack:orchestration']);
  });

  it('labelsForPaths adds ci-cd for workflow files', () => {
    const labels = labelsForPaths(['.github/workflows/ci.yml']);
    expect(labels).toContain('stack:orchestration');
    expect(labels).toContain('ci-cd');
  });

  it('labelsForIssueBody detects beads-linked', () => {
    const labels = labelsForIssueBody('Linked beads modme-aqu for session');
    expect(labels).toContain('beads-linked');
  });

  it('globMatches supports globs', () => {
    expect(globMatches('next-forge/**', 'next-forge/apps/app/x.ts')).toBe(true);
    expect(globMatches('next-forge/**', 'GenerativeUI_monorepo/x.ts')).toBe(false);
  });

  it('syncBeadsExternalFromBody skips without beads-linked', async () => {
    const result = await syncBeadsExternalFromBody(
      'no beads here',
      'modme-abc',
      'https://github.com/x/y'
    );
    expect(result.skipped).toBe(true);
  });
});
