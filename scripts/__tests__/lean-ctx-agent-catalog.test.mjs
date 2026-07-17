/**
 * lean-ctx agent catalog — seed, validate, resolve contract tests.
 * Run: yarn vitest run scripts/__tests__/lean-ctx-agent-catalog.test.mjs
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const SEED_PATH = join(ROOT, 'scripts/collections/lean-ctx-agent-catalog.seed.json');
const CATALOG_SCRIPT = join(ROOT, 'scripts/lean-ctx-agent-catalog.mjs');

function runCatalog(args) {
  const result = spawnSync(process.execPath, [CATALOG_SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function parseJson(stdout) {
  const trimmed = stdout.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  return JSON.parse(trimmed.slice(start, end + 1));
}

describe('lean-ctx-agent-catalog seed', () => {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));

  it('defines version and agents array', () => {
    expect(seed.version).toBeGreaterThanOrEqual(1);
    expect(seed.agents.length).toBeGreaterThanOrEqual(5);
  });

  it('includes required A2A roles', () => {
    const roles = new Set(seed.agents.map((a) => a.role));
    for (const role of ['dev', 'review', 'test', 'plan', 'orchestrator']) {
      expect(roles.has(role)).toBe(true);
    }
  });

  it('mcp_gateways have namespace and mcp_server', () => {
    expect(seed.mcp_gateways?.length).toBeGreaterThanOrEqual(1);
    for (const gw of seed.mcp_gateways) {
      expect(gw.namespace).toBeTruthy();
      expect(gw.mcp_server).toBeTruthy();
    }
  });
});

describe('lean-ctx-agent-catalog CLI', () => {
  beforeAll(() => {
    runCatalog(['seed']);
  }, 30_000);

  it('validate exits 0 with agent count', () => {
    const { status, stdout } = runCatalog(['validate']);
    expect(status).toBe(0);
    const body = parseJson(stdout);
    expect(body?.ok).toBe(true);
    expect(body?.agents).toBeGreaterThan(0);
  });

  it('resolve maps orchestration intent to orchestrator role', () => {
    const { status, stdout } = runCatalog(['resolve', '--intent', 'beads dispatch orchestration']);
    expect(status).toBe(0);
    const body = parseJson(stdout);
    expect(body?.role).toBe('orchestrator');
    expect(body?.collection).toBe('modme-lean-ctx-advanced');
  });

  it('resolve maps inbox intent to dev role with intake collection hint', () => {
    const { status, stdout } = runCatalog(['resolve', '--intent', 'inbox intake pipeline']);
    expect(status).toBe(0);
    const body = parseJson(stdout);
    expect(body?.role).toBe('dev');
    expect(body?.collection).toBe('modme-inbox-mda');
  });

  it('catalog file is created under data/', () => {
    const catalogPath = join(ROOT, 'data/lean-ctx-agent-catalog.json');
    expect(existsSync(catalogPath)).toBe(true);
  });
});
