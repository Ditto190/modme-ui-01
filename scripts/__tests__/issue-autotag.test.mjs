import { describe, it, expect } from 'vitest';
import {
  stackLabelsForPaths,
  labelsForPaths,
  labelsForIssueBody,
  globMatches,
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

  it('labelsForIssueBody detects beads and self-heal markers', () => {
    const body = 'Linked modme-abc123. Self-heal: Yes';
    const labels = labelsForIssueBody(body);
    expect(labels).toContain('beads-linked');
    expect(labels).toContain('devops-autofix');
  });

  it('globMatches supports simple globs', () => {
    expect(globMatches('scripts/**', 'scripts/foo.mjs')).toBe(true);
    expect(globMatches('scripts/**', 'next-forge/apps/x.ts')).toBe(false);
  });
});
