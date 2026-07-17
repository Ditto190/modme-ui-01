/**
 * beads BFS dispatch — plan shape and layer ordering tests.
 * Run: yarn vitest run scripts/__tests__/beads-bfs-dispatch.test.mjs
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DISPATCH_SCRIPT = join(ROOT, 'scripts/beads-bfs-dispatch.mjs');

function runDispatch(args = []) {
  const result = spawnSync(process.execPath, [DISPATCH_SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function parsePlan(stdout) {
  const trimmed = stdout.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  return JSON.parse(trimmed.slice(start, end + 1));
}

describe('beads-bfs-dispatch', () => {
  /** @type {ReturnType<typeof parsePlan>} */
  let plan;

  beforeAll(() => {
    const { status, stdout } = runDispatch(['--dry-run']);
    expect(status).toBe(0);
    plan = parsePlan(stdout);
  }, 60_000);

  it('dry-run emits plan JSON', () => {
    expect(plan).toBeTruthy();
    expect(plan.dry_run).toBe(true);
    expect(Array.isArray(plan.layers)).toBe(true);
    expect(plan).toHaveProperty('issue_count');
    expect(plan).toHaveProperty('generated_at');
  });

  it('layers contain issue dispatch metadata when issues present', () => {
    for (const layer of plan.layers) {
      expect(typeof layer.layer).toBe('number');
      expect(Array.isArray(layer.issues)).toBe(true);
      for (const issue of layer.issues) {
        expect(issue).toHaveProperty('issue_id');
        expect(issue).toHaveProperty('title');
        expect(issue).toHaveProperty('suggested_role');
        expect(issue).toHaveProperty('suggested_collection');
        expect(issue).toHaveProperty('claim_paths');
      }
    }
  });

  it('plan layers are monotonically increasing', () => {
    let prev = -1;
    for (const layer of plan.layers) {
      expect(layer.layer).toBeGreaterThanOrEqual(prev);
      prev = layer.layer;
    }
  });
});
