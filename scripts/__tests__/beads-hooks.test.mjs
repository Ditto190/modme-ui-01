import { describe, it, expect } from 'vitest';
import {
  parseBdJson,
  extractIssueId,
  runBd,
  beadsCreate,
  beadsStartPipelineRun,
  beadsFinishPipelineRun,
} from '../lib/beads-hooks.mjs';

describe('beads-hooks', () => {
  it('parseBdJson parses object stdout', () => {
    const payload = parseBdJson('{"id":"modme-abc","title":"test"}');
    expect(payload?.id).toBe('modme-abc');
  });

  it('parseBdJson parses first element of array stdout', () => {
    const payload = parseBdJson('[{"id":"modme-xyz"}]');
    expect(payload?.id).toBe('modme-xyz');
  });

  it('extractIssueId reads id aliases', () => {
    expect(extractIssueId({ id: 'modme-a' })).toBe('modme-a');
    expect(extractIssueId({ issue_id: 'modme-b' })).toBe('modme-b');
    expect(extractIssueId({ issueId: 'modme-c' })).toBe('modme-c');
    expect(extractIssueId(null)).toBeNull();
  });

  it('runBd skips when BEADS_DISABLED=1', () => {
    const prev = process.env.BEADS_DISABLED;
    process.env.BEADS_DISABLED = '1';
    try {
      const result = runBd(['ready']);
      expect(result.skipped).toBe(true);
      expect(result.ok).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.BEADS_DISABLED;
      else process.env.BEADS_DISABLED = prev;
    }
  });

  it('beadsCreate skips when BEADS_DISABLED=1', async () => {
    const prev = process.env.BEADS_DISABLED;
    process.env.BEADS_DISABLED = '1';
    try {
      const result = await beadsCreate('intake:test', { description: 'dry run' });
      expect(result.skipped).toBe(true);
      expect(result.ok).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.BEADS_DISABLED;
      else process.env.BEADS_DISABLED = prev;
    }
  });

  it('beadsFinishPipelineRun no-ops without issue id', async () => {
    const result = await beadsFinishPipelineRun(null, true, 'ok');
    expect(result.skipped).toBe(true);
  });

  it('beadsStartPipelineRun returns null issue when disabled', async () => {
    const prev = process.env.BEADS_DISABLED;
    process.env.BEADS_DISABLED = '1';
    try {
      const { issueId } = await beadsStartPipelineRun({
        title: 'intake:test',
        description: 'dry',
        pipelineRunId: 'run-1',
      });
      expect(issueId).toBeNull();
    } finally {
      if (prev === undefined) delete process.env.BEADS_DISABLED;
      else process.env.BEADS_DISABLED = prev;
    }
  });
});
