import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import assert from 'assert';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(__dirname, '..', '..', '..', 'scripts', 'update-adr-readme.mjs');
const fixtureDir = path.resolve(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'inbox');

// Run script in dry-run mode
const adjustedFixtureDir = path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures', 'inbox');
const res = spawnSync('node', [script, '--inbox', adjustedFixtureDir, '--dry-run'], { encoding: 'utf-8' });

const out = (res.stdout || '') + '\n' + (res.stderr || '');

// Assertions
assert.ok(out.includes('## Summary'), 'Missing Summary heading');
assert.ok(out.includes('## Mapped Patterns'), 'Missing Mapped Patterns');
assert.ok(out.includes('## Evidence'), 'Missing Evidence');
assert.ok(out.includes('sample-note.md'), 'Missing evidence line for sample-note.md');

console.log('update-adr-readme test passed');
