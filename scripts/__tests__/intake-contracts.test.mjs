import { describe, it, expect } from 'vitest';
import {
  classifyOutputSchema,
  promoteEntrySchema,
  codeChunkSchema,
  safeValidate,
  formatZodIssues,
} from '../../packages/intake-contracts/index.mjs';

describe('intake-contracts', () => {
  it('accepts valid classify output', () => {
    const result = safeValidate(classifyOutputSchema, {
      entry_type: 'research',
      severity: 'medium',
      agent_role: 'researcher',
      title: 'Test page',
      summary: 'A summary',
      tags: ['docs'],
      features: {},
    });
    expect(result.ok).toBe(true);
  });

  it('rejects malformed classify output', () => {
    const result = safeValidate(classifyOutputSchema, {
      entry_type: 'not-a-type',
      severity: 'medium',
      agent_role: 'researcher',
      title: '',
      summary: 'x',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(formatZodIssues(result.issues).length).toBeGreaterThan(0);
    }
  });

  it('accepts valid promote entry', () => {
    const hash = 'a'.repeat(64);
    const result = safeValidate(promoteEntrySchema, {
      content_hash: hash,
      source_file: 'https://example.com/docs',
      source_format: 'url',
      severity: 'high',
      entry_type: 'architecture',
      status: 'indexed',
      source_kind: 'scrape_url',
    });
    expect(result.ok).toBe(true);
  });

  it('accepts valid code chunk', () => {
    const hash = 'b'.repeat(64);
    const result = safeValidate(codeChunkSchema, {
      path: 'scripts/foo.mjs',
      ast_kind: 'export',
      symbol_name: 'main',
      content_hash: hash,
      text: 'export function main() {}',
      tags: ['intake'],
    });
    expect(result.ok).toBe(true);
  });
});
