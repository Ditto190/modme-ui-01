import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
      assert.ok(map.patterns[id], `missing coverage for ${id}`);
    }
  });

  it('every coverage path exists on disk', () => {
    for (const [id, entry] of Object.entries(map.patterns)) {
      for (const rel of entry.paths ?? []) {
        assert.ok(pathExists(rel), `${id}: missing path ${rel}`);
      }
    }
  });

  it('every yarn verify command maps to package.json scripts', () => {
    for (const [id, entry] of Object.entries(map.patterns)) {
      for (const cmd of entry.verify ?? []) {
        for (const script of extractYarnScripts(cmd)) {
          assert.ok(PKG.scripts[script], `${id}: unknown script yarn ${script}`);
        }
      }
    }
  });

  it('every pattern has checklistDomain', () => {
    for (const [id, entry] of Object.entries(map.patterns)) {
      assert.ok(entry.checklistDomain, `${id}: missing checklistDomain`);
    }
  });
});
