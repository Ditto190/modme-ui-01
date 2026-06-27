/**
 * Scrape MCP tool Zod validators — runtime validation for scrape tool I/O.
 */

import { z } from 'zod';
import { generateZodModulesBatch } from './schema-crawler.js';
import {
  INBOX_ENTRY_TYPES,
  INBOX_SEVERITIES,
  INBOX_AGENT_ROLES,
  SCRAPE_JOB_STATUSES,
  SCRAPE_TOOL_SCHEMAS,
  type ScrapeToolName,
} from './scrape-schemas.js';

const crawlUrlPageSchema = z.object({
  page_id: z.string(),
  url: z.string(),
  status: z.enum(['raw', 'failed']),
  content_hash: z.string().min(64).max(64).optional(),
  http_status: z.number().int().optional(),
});

const classificationSchema = z.object({
  classification_id: z.string(),
  page_id: z.string(),
  entry_type: z.enum(INBOX_ENTRY_TYPES),
  severity: z.enum(INBOX_SEVERITIES),
  agent_role: z.enum(INBOX_AGENT_ROLES).optional(),
  title: z.string().optional(),
  summary: z.string().max(300),
  tags: z.array(z.string()).optional(),
  features: z.record(z.unknown()).optional(),
});

const promotionSchema = z.object({
  page_id: z.string(),
  inbox_entry_id: z.string().optional(),
  content_hash: z.string().min(64).max(64),
  source_format: z.literal('url').optional(),
  promoted_at: z.string().optional(),
  export_path: z.string().optional(),
});

const scrapeCrawlUrlInputSchema = z.object({
  manifest_slug: z.string(),
  seed_urls: z.array(z.string()).optional(),
  max_depth: z.number().int().min(0).max(10).optional(),
  dry_run: z.boolean().optional(),
});

const scrapeCrawlUrlOutputSchema = z.object({
  job_id: z.string(),
  manifest_id: z.string(),
  manifest_slug: z.string().optional(),
  status: z.enum(SCRAPE_JOB_STATUSES),
  pages_crawled: z.number().int(),
  pages: z.array(crawlUrlPageSchema),
});

const scrapeClassifyPageInputSchema = z.object({
  page_id: z.string().optional(),
  job_id: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  model: z.string().optional(),
});

const scrapeClassifyPageOutputSchema = z.object({
  classified_count: z.number().int(),
  classifications: z.array(classificationSchema),
});

const scrapePromoteBatchInputSchema = z.object({
  job_id: z.string().optional(),
  page_ids: z.array(z.string()).optional(),
  dry_run: z.boolean().optional(),
  export_md: z.boolean().optional(),
});

const scrapePromoteBatchOutputSchema = z.object({
  promoted_count: z.number().int(),
  skipped_count: z.number().int(),
  dry_run: z.boolean().optional(),
  promotions: z.array(promotionSchema),
});

export const scrapeTools = {
  'scrape.crawl_url': {
    name: 'scrape.crawl_url' as const,
    description: SCRAPE_TOOL_SCHEMAS[0].description,
    inputSchema: scrapeCrawlUrlInputSchema,
    outputSchema: scrapeCrawlUrlOutputSchema,
  },
  'scrape.classify_page': {
    name: 'scrape.classify_page' as const,
    description: SCRAPE_TOOL_SCHEMAS[1].description,
    inputSchema: scrapeClassifyPageInputSchema,
    outputSchema: scrapeClassifyPageOutputSchema,
  },
  'scrape.promote_batch': {
    name: 'scrape.promote_batch' as const,
    description: SCRAPE_TOOL_SCHEMAS[2].description,
    inputSchema: scrapePromoteBatchInputSchema,
    outputSchema: scrapePromoteBatchOutputSchema,
  },
} as const;

export function validateScrapeToolInput<T extends ScrapeToolName>(
  toolName: T,
  input: unknown
): z.infer<(typeof scrapeTools)[T]['inputSchema']> {
  return scrapeTools[toolName].inputSchema.parse(input);
}

export function validateScrapeToolOutput<T extends ScrapeToolName>(
  toolName: T,
  output: unknown
): z.infer<(typeof scrapeTools)[T]['outputSchema']> {
  return scrapeTools[toolName].outputSchema.parse(output);
}

export function emitScrapeZodModules(): Map<string, string> {
  return generateZodModulesBatch(
    SCRAPE_TOOL_SCHEMAS.map((def) => ({
      name: def.name.replace(/\./g, '_'),
      inputSchema: def.inputSchema,
      outputSchema: def.outputSchema,
    }))
  );
}

export { SCRAPE_TOOL_SCHEMAS } from './scrape-schemas.js';
