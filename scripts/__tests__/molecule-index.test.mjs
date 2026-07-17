import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateMoleculeCatalog } from '../../packages/intake-contracts/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const MANIFEST = resolve(ROOT, 'data/molecule-index/manifest.json');
const CATALOG = resolve(ROOT, 'data/molecule-index/catalog.v1.json');

describe('molecule-index manifest contract', () => {
  it('manifest exists with required fields after orchestrator run', () => {
    if (!existsSync(MANIFEST)) {
      const gen = spawnSync(
        'node',
        ['scripts/molecule-index-orchestrator.mjs', '--stack', 'forge', '--semver', '1.0.0'],
        { cwd: ROOT, encoding: 'utf8', shell: true }
      );
      expect(gen.status, gen.stderr).toBe(0);
    }
    expect(existsSync(MANIFEST)).toBe(true);
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    expect(manifest.version).toBeTruthy();
    expect(Array.isArray(manifest.molecules)).toBe(true);
    expect(manifest.molecules.length).toBeGreaterThan(0);
    expect(Array.isArray(manifest.record_kinds)).toBe(true);
    for (const mol of manifest.molecules) {
      expect(mol.kind).toBeTruthy();
      expect(mol.id).toBeTruthy();
      expect(mol.path).toBeTruthy();
      expect(mol.semver).toBeTruthy();
      expect(manifest.record_kinds).toContain(mol.kind);
    }
  });

  it('catalog.v1.json validates against intake contract when present', () => {
    if (!existsSync(CATALOG)) {
      return;
    }
    const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
    const result = validateMoleculeCatalog(catalog);
    expect(result.success, JSON.stringify(result.error?.issues ?? [])).toBe(true);
    expect(catalog.source_only).toBe(false);
    expect(catalog.tiers.static.length).toBeGreaterThan(0);
    expect(catalog.tiers.declarative.length).toBeGreaterThan(0);
    expect(catalog.tiers['open-ended'].length).toBeGreaterThan(0);
  });

  it(
    'orchestrator dry-run exits 0 for all stacks',
    () => {
      for (const stack of ['forge', 'generative', 'legacy-root']) {
        const result = spawnSync(
          process.execPath,
          ['scripts/molecule-index-orchestrator.mjs', '--stack', stack, '--dry-run'],
          { cwd: ROOT, encoding: 'utf8' }
        );
        expect(result.status, `${stack}: ${result.stderr}`).toBe(0);
      }
    },
    120_000
  );
});
