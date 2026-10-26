#!/usr/bin/env node
/**
 * Verify UniversalWorkbench non-migrate patterns:
 * - registry nonMigrate entries exist in coverage-map
 * - coverage paths exist and stay under UW prefix
 * - no next-forge paths on archive patterns
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const UW_PREFIX = 'GenerativeUI_monorepo/UniversalWorkbench';
const FORGE_PREFIX = 'next-forge/';

const registry = JSON.parse(
  readFileSync(join(ROOT, 'specs/013-agent-workflow-gates/patterns/registry.json'), 'utf8')
);
const map = JSON.parse(
  readFileSync(join(ROOT, 'specs/013-agent-workflow-gates/patterns/coverage-map.json'), 'utf8')
);

const errors = [];

for (const [id, meta] of Object.entries(registry.patterns)) {
  if (!meta.nonMigrate) continue;

  const entry = map.patterns[id];
  if (!entry) {
    errors.push(`${id}: missing coverage-map entry`);
    continue;
  }

  for (const rel of entry.paths ?? []) {
    if (!rel.startsWith(UW_PREFIX)) {
      errors.push(`${id}: path not under ${UW_PREFIX}: ${rel}`);
    }
    if (rel.startsWith(FORGE_PREFIX) || rel.includes('/next-forge/')) {
      errors.push(`${id}: forge path not allowed on nonMigrate pattern: ${rel}`);
    }
    if (!existsSync(join(ROOT, rel))) {
      errors.push(`${id}: missing path ${rel}`);
    }
  }

  for (const rel of entry.variants ?? []) {
    if (!existsSync(join(ROOT, rel))) {
      errors.push(`${id}: missing variant path ${rel}`);
    }
  }

  if (entry.checklistDomain !== 'uw-archive') {
    errors.push(`${id}: checklistDomain must be uw-archive (got ${entry.checklistDomain})`);
  }
}

if (errors.length) {
  console.error('pattern:uw FAILED');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const count = Object.values(registry.patterns).filter((p) => p.nonMigrate).length;
console.log(`pattern:uw OK — ${count} nonMigrate UW patterns verified`);
