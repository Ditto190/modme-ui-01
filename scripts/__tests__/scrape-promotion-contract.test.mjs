import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateScrapePromoteBatchOutput,
  validateInboxPromoteEntry,
  validateScrapeClassificationResult,
  SCRAPE_PAGE_STATUSES,
} from '../../packages/intake-contracts/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const PROMOTE_CONTRACT = JSON.parse(
  readFileSync(resolve(ROOT, 'docs/inbox-pipeline/contracts/scrape-promotion.v1.json'), 'utf8')
);

describe('scrape-promotion contract', () => {
  it('contract includes failed page status', () => {
    expect(PROMOTE_CONTRACT.enums.pageStatus).toContain('failed');
    expect(SCRAPE_PAGE_STATUSES).toContain('failed');
  });

  it('validates promote batch dry-run output', () => {
    const result = validateScrapePromoteBatchOutput({
      promoted_count: 1,
      skipped_count: 0,
      dry_run: true,
      promotions: [
        {
          page_id: 'page-1',
          content_hash: 'a'.repeat(64),
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects promotion with invalid content_hash length', () => {
    const result = validateScrapePromoteBatchOutput({
      promoted_count: 1,
      skipped_count: 0,
      promotions: [
        {
          page_id: 'page-1',
          content_hash: 'short',
        },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('validates inbox promote entry with source_kind and code_pattern_ids', () => {
    const result = validateInboxPromoteEntry({
      id: '550e8400-e29b-41d4-a716-446655440000',
      content_hash: 'b'.repeat(64),
      source_file: 'https://example.com/docs',
      source_format: 'url',
      source_kind: 'scrape_url',
      raw_content: 'text',
      extracted_text: 'text',
      title: 'Docs',
      summary: 'Summary',
      agent_name: 'scrape-pipeline',
      agent_role: 'researcher',
      tags: ['docs'],
      severity: 'high',
      entry_type: 'architecture',
      status: 'indexed',
      code_pattern_ids: ['greptime-id-1'],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects malformed classify result (invalid entry_type)', () => {
    const result = validateScrapeClassificationResult({
      entry_type: 'not-a-type',
      severity: 'medium',
      agent_role: 'researcher',
      title: 'T',
      summary: 'S',
      tags: [],
      features: {},
    });
    expect(result.ok).toBe(false);
  });

  it('field mapping enums align with contract', () => {
    expect(PROMOTE_CONTRACT.enums.entryType).toContain('architecture');
    expect(PROMOTE_CONTRACT.fieldMapping.status).toBe('indexed');
    expect(PROMOTE_CONTRACT.requiredJoin.status).toBe("scrape_pages.status = 'classified'");
  });
});
