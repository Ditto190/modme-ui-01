/**
 * lean-ctx task profiles — example TOML contract tests.
 * Run: yarn vitest run scripts/__tests__/lean-ctx-task-profiles.test.mjs
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const EXAMPLE_PATH = join(ROOT, 'data/lean-ctx-task-profiles.toml.example');

const REQUIRED_PROFILES = [
  'orchestration',
  'inbox-intake',
  'forge-dev',
  'test-automation',
  'lean-ctx-docs',
  'observability-work',
  'session-audit',
  'url-capture-intake',
  'thermo-nuclear-review',
  'agent-workflow-gates',
  'molecule-index',
];

function parseProfileSections(toml) {
  const sections = [];
  const lines = toml.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const sectionMatch = line.match(/^\[task_profiles\.([^\]]+)\]/);
    if (sectionMatch) {
      current = sectionMatch[1];
      sections.push(current);
      continue;
    }
  }
  return sections;
}

function sectionHasKey(toml, profile, key) {
  const re = new RegExp(
    `\\[task_profiles\\.${profile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\][\\s\\S]*?${key}\\s*=`,
    'm'
  );
  return re.test(toml);
}

describe('lean-ctx-task-profiles.example', () => {
  const toml = readFileSync(EXAMPLE_PATH, 'utf8');

  it('example file exists and is non-empty', () => {
    expect(existsSync(EXAMPLE_PATH)).toBe(true);
    expect(toml.length).toBeGreaterThan(100);
  });

  it('declares all required orchestration profiles', () => {
    const sections = parseProfileSections(toml);
    for (const profile of REQUIRED_PROFILES) {
      expect(sections).toContain(profile);
    }
  });

  it('has no duplicate profile sections', () => {
    const sections = parseProfileSections(toml);
    const unique = new Set(sections);
    expect(unique.size).toBe(sections.length);
  });

  it('each profile sets lean_ctx_profile matching section name', () => {
    for (const profile of REQUIRED_PROFILES) {
      expect(sectionHasKey(toml, profile, 'lean_ctx_profile')).toBe(true);
      expect(toml).toMatch(
        new RegExp(
          `\\[task_profiles\\.${profile}\\][\\s\\S]*?lean_ctx_profile\\s*=\\s*"${profile}"`
        )
      );
    }
  });

  it('orchestration profile references catalog and beads dispatch', () => {
    expect(toml).toMatch(/lean-ctx-agent-catalog\.mjs/);
    expect(toml).toMatch(/beads-bfs-dispatch\.mjs/);
  });

  it('lean-ctx-docs profile includes upstream corpus path', () => {
    expect(toml).toMatch(/docs\/lean-ctx\/upstream\//);
  });
});
