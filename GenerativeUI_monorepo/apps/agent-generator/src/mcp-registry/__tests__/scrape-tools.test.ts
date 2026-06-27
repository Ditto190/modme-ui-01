import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateZodFromJSONSchema, generateZodModulesBatch } from '../schema-crawler.js';
import {
  SCRAPE_TOOL_SCHEMAS,
  scrapeCrawlUrlSchema,
  SCRAPE_TOOL_NAMES,
} from '../scrape-schemas.js';
import {
  scrapeTools,
  validateScrapeToolInput,
  validateScrapeToolOutput,
  emitScrapeZodModules,
} from '../scrape-tools.js';

describe('scrape MCP schemas', () => {
  it('defines three scrape tool names', () => {
    assert.strictEqual(SCRAPE_TOOL_NAMES.length, 3);
    assert.ok(SCRAPE_TOOL_NAMES.includes('scrape.crawl_url'));
    assert.ok(SCRAPE_TOOL_NAMES.includes('scrape.classify_page'));
    assert.ok(SCRAPE_TOOL_NAMES.includes('scrape.promote_batch'));
  });

  it('generates Zod code from scrape.crawl_url input schema', () => {
    const result = generateZodFromJSONSchema(
      scrapeCrawlUrlSchema.inputSchema,
      'scrape_crawl_urlInput'
    );
    assert.ok(result.zodCode.includes('z.object'), 'crawl_url input should be an object schema');
    assert.ok(
      result.zodCode.includes('manifest_slug'),
      'crawl_url input should include manifest_slug'
    );
    assert.ok(result.typeDefinition.includes('manifest_slug'));
  });

  it('batch-generates Zod modules for all scrape tools', () => {
    const modules = generateZodModulesBatch(
      SCRAPE_TOOL_SCHEMAS.map(def => ({
        name: def.name.replace(/\./g, '_'),
        inputSchema: def.inputSchema,
        outputSchema: def.outputSchema,
      }))
    );
    assert.strictEqual(modules.size, 3);
    for (const def of SCRAPE_TOOL_SCHEMAS) {
      const key = def.name.replace(/\./g, '_');
      assert.ok(modules.has(key), `missing module for ${def.name}`);
      assert.ok(modules.get(key)!.includes('InputSchema'));
      assert.ok(modules.get(key)!.includes('OutputSchema'));
    }
  });

  it('emitScrapeZodModules returns codegen map', () => {
    const modules = emitScrapeZodModules();
    assert.strictEqual(modules.size, 3);
  });

  it('validates scrape.crawl_url input and output', () => {
    const input = validateScrapeToolInput('scrape.crawl_url', {
      manifest_slug: 'docs-sitemap',
      max_depth: 2,
    });
    assert.strictEqual(input.manifest_slug, 'docs-sitemap');

    const output = validateScrapeToolOutput('scrape.crawl_url', {
      job_id: 'job_1',
      manifest_id: 'manifest_1',
      status: 'done',
      pages_crawled: 1,
      pages: [
        {
          page_id: 'page_1',
          url: 'https://example.com/docs',
          status: 'raw',
          content_hash: 'a'.repeat(64),
        },
      ],
    });
    assert.strictEqual(output.pages_crawled, 1);
  });

  it('validates scrape.classify_page output with inbox-contract enums', () => {
    const output = validateScrapeToolOutput('scrape.classify_page', {
      classified_count: 1,
      classifications: [
        {
          classification_id: 'cls_1',
          page_id: 'page_1',
          entry_type: 'research',
          severity: 'medium',
          summary: 'API documentation overview',
          tags: ['docs', 'api'],
        },
      ],
    });
    assert.strictEqual(output.classified_count, 1);
    assert.strictEqual(output.classifications[0]?.entry_type, 'research');
  });

  it('validates scrape.promote_batch dry-run output', () => {
    const output = validateScrapeToolOutput('scrape.promote_batch', {
      promoted_count: 0,
      skipped_count: 0,
      dry_run: true,
      promotions: [],
    });
    assert.strictEqual(output.dry_run, true);
  });

  it('scrapeTools registry exposes all three validators', () => {
    assert.ok(scrapeTools['scrape.crawl_url'].inputSchema);
    assert.ok(scrapeTools['scrape.classify_page'].outputSchema);
    assert.ok(scrapeTools['scrape.promote_batch'].inputSchema);
  });
});
