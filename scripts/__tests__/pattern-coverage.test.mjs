<<<<<<< HEAD
import { describe, it, expect } from 'vitest';
=======
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
>>>>>>> origin/dev
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const MAP_PATH = join(ROOT, 'specs/013-agent-workflow-gates/patterns/coverage-map.json');
const REGISTRY_PATH = join(ROOT, 'specs/013-agent-workflow-gates/patterns/registry.json');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

function pathExists(relPath) {
  return existsSync(join(ROOT, relPath));
}

function extractYarnScripts(verifyCmd) {
  const match = verifyCmd.match(/^yarn\s+([^\s&]+)/);
  return match ? [match[1]] : [];
}

const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));

describe('pattern coverage map', () => {
  it('every registry pattern has a coverage-map entry', () => {
    for (const id of Object.keys(registry.patterns)) {
<<<<<<< HEAD
      expect(map.patterns[id], `missing coverage for ${id}`).toBeTruthy();
=======
      assert.ok(map.patterns[id], `missing coverage for ${id}`);
>>>>>>> origin/dev
    }
  });

  it('every coverage path exists on disk', () => {
    for (const [id, entry] of Object.entries(map.patterns)) {
      for (const rel of entry.paths ?? []) {
<<<<<<< HEAD
        expect(pathExists(rel), `${id}: missing path ${rel}`).toBe(true);
=======
        assert.ok(pathExists(rel), `${id}: missing path ${rel}`);
>>>>>>> origin/dev
      }
    }
  });

  it('every yarn verify command maps to package.json scripts', () => {
<<<<<<< HEAD
    for (const entry of Object.values(map.patterns)) {
      for (const cmd of entry.verify ?? []) {
        for (const script of extractYarnScripts(cmd)) {
          expect(PKG.scripts[script], `missing script ${script} for ${cmd}`).toBeTruthy();
=======
    for (const [id, entry] of Object.entries(map.patterns)) {
      for (const cmd of entry.verify ?? []) {
        for (const script of extractYarnScripts(cmd)) {
          assert.ok(PKG.scripts[script], `${id}: unknown script yarn ${script}`);
>>>>>>> origin/dev
        }
      }
    }
  });

  it('every pattern has checklistDomain', () => {
    for (const [id, entry] of Object.entries(map.patterns)) {
<<<<<<< HEAD
      expect(entry.checklistDomain, `${id} missing checklistDomain`).toBeTruthy();
=======
      assert.ok(entry.checklistDomain, `${id}: missing checklistDomain`);
>>>>>>> origin/dev
    }
  });
});
