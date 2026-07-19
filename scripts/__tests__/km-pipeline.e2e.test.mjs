import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadContract,
  parseInboxFile,
  validateFunnelFile,
} from '../lib/inbox-contract.mjs';
import {
  beadsStartPipelineRun,
  beadsFinishPipelineRun,
} from '../lib/beads-hooks.mjs';
import { readKmMetrics, getKmMetricsPath } from '../lib/km-metrics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, 'fixtures/km-inbox-sample.md');

describe('km-pipeline e2e (offline)', () => {
  it('validates fixture inbox file against contract v1', () => {
    const contract = loadContract();
    const parsed = parseInboxFile(FIXTURE, 'km-inbox-sample.md');
    const findings = validateFunnelFile(parsed, contract);
    const errors = findings.filter((f) => f.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(parsed.frontmatter.c4_container).toBe('root-orchestration');
  });

  it('fixture has non-empty body', () => {
    const raw = readFileSync(FIXTURE, 'utf8');
    expect(raw).toMatch(/KM pipeline E2E fixture/);
  });

  it('beads pipeline lifecycle skips cleanly when BEADS_DISABLED=1', async () => {
    const prev = process.env.BEADS_DISABLED;
    process.env.BEADS_DISABLED = '1';
    try {
      const { issueId } = await beadsStartPipelineRun({
        title: 'intake:e2e-fixture',
        description: 'offline km e2e test',
        pipelineRunId: 'e2e-fixture-run',
      });
      expect(issueId).toBeNull();
      const finished = await beadsFinishPipelineRun(null, true, 'noop');
      expect(finished.skipped).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.BEADS_DISABLED;
      else process.env.BEADS_DISABLED = prev;
    }
  });

  it('km metrics artifact path is defined', () => {
    const metricsPath = getKmMetricsPath();
    expect(metricsPath).toContain('km-metrics-latest.json');
    const state = readKmMetrics();
    expect(state.version).toBe('1.0');
    expect(Array.isArray(state.events)).toBe(true);
  });
});
