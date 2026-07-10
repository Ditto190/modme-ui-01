/**
 * Shared text normalization + content_hash (parity with doc_spider.py).
 * @see GenerativeUI_monorepo/scrape-pipeline/scrape_pipeline/spiders/doc_spider.py
 * @see docs/inbox-pipeline/contracts/scrape-promotion.v1.json (dedup sha256)
 */
import { createHash } from 'node:crypto';

/** Collapse whitespace — mirrors Python normalize_text */
export function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/** SHA-256 hex of normalized text — mirrors Python content_hash */
export function contentHash(text) {
  return createHash('sha256').update(normalizeText(text), 'utf8').digest('hex');
}
