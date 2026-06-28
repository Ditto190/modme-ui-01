import { describe, it, expect } from 'vitest';
import {
  githubBlobToRaw,
  urlWithoutFragment,
  parseShoppingListLines,
  filterBySection,
  buildCollectionYaml,
} from '../lib/shopping-list-parse.mjs';

const SAMPLE_LINES = [
  '[date][]',
  'https://leanctx.com/docs/performance-tuning/#slow-log > USE THIS',
  'https://leanctx.com/docs/performance-tuning/#checklist > Create smart git automation',
  'https://leanctx.com/docs/performance-tuning/',
  '## GAS CITY FLEET',
  'https://github.com/gastownhall/gascity/blob/main/docs/getting-started/coming-from-gastown.md',
  'IMPORTANT > https://leanctx.com/docs/configuration/#multi-root-workspaces',
];

describe('shopping-list harvest', () => {
  it('converts GitHub blob URLs to raw.githubusercontent.com', () => {
    const blob =
      'https://github.com/gastownhall/gascity/blob/main/docs/getting-started/coming-from-gastown.md';
    expect(githubBlobToRaw(blob)).toBe(
      'https://raw.githubusercontent.com/gastownhall/gascity/main/docs/getting-started/coming-from-gastown.md'
    );
  });

  it('dedupes URLs by origin without fragment', () => {
    const { entries } = parseShoppingListLines(SAMPLE_LINES);
    const perfKey = urlWithoutFragment('https://leanctx.com/docs/performance-tuning/');
    expect(entries.has(perfKey)).toBe(true);
    const entry = entries.get(perfKey);
    expect(entry.fragments).toContain('slow-log');
    expect(entry.fragments).toContain('checklist');
    expect(entry.annotations.some((a) => /USE THIS/i.test(a))).toBe(true);
    expect(entry.priority).toBe('high');
  });

  it('builds collection YAML with required scrape-job fields', () => {
    const { entries } = parseShoppingListLines(SAMPLE_LINES);
    const filtered = filterBySection(entries, 'lean-ctx');
    const collection = buildCollectionYaml(
      'lean-ctx-shopping-list',
      'Test',
      filtered.map((e) => e.url)
    );
    expect(collection.slug).toBe('lean-ctx-shopping-list');
    expect(collection.seeds.length).toBeGreaterThan(0);
    expect(collection.seeds.every((s) => s.startsWith('http'))).toBe(true);
  });

  it('isolates gascity-fleet section', () => {
    const { entries } = parseShoppingListLines(SAMPLE_LINES);
    const gascity = filterBySection(entries, 'gascity');
    expect(gascity).toHaveLength(1);
    expect(gascity[0].url).toContain('raw.githubusercontent.com');
  });
});
