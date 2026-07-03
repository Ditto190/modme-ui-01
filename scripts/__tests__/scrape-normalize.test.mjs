import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { normalizeText, contentHash } from '../lib/scrape-normalize.mjs';

/** Golden vectors — parity with doc_spider.py normalize_text + content_hash */
function pythonNormalize(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function pythonContentHash(text) {
  return createHash('sha256').update(pythonNormalize(text), 'utf8').digest('hex');
}

describe('scrape-normalize (Python parity)', () => {
  const vectors = [
    '',
    'hello world',
    'hello\n\nworld',
    '  tabs\tand   spaces  ',
    'line one\r\nline two',
    'unicode cafe naive',
  ];

  for (const text of vectors) {
    it(`normalizeText matches Python for: ${JSON.stringify(text).slice(0, 40)}`, () => {
      expect(normalizeText(text)).toBe(pythonNormalize(text));
    });

    it(`contentHash matches Python for: ${JSON.stringify(text).slice(0, 40)}`, () => {
      expect(contentHash(text)).toBe(pythonContentHash(text));
    });
  }

  it('known golden hash for collapsed whitespace', () => {
    const input = 'hello\n\nworld';
    const expected = createHash('sha256').update('hello world', 'utf8').digest('hex');
    expect(contentHash(input)).toBe(expected);
  });
});
