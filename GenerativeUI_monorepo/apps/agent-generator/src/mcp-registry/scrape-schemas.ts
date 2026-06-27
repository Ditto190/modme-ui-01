/**
 * scrape-schemas.ts
 *
 * Canonical JSON Schema definitions for scrape MCP tools.
 * Input/output shapes align with staging tables:
 * scrape_manifests, scrape_jobs, scrape_pages, scrape_classifications.
 */

import type { JSONSchema } from './registry-fetcher.js';

/** Inbox-contract entry_type enum */
export const INBOX_ENTRY_TYPES = [
  'architecture',
  'design',
  'code-review',
  'solution',
  'research',
  'snippet',
  'link',
  'component',
] as const;

export const INBOX_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export const INBOX_AGENT_ROLES = [
  'frontend',
  'backend',
  'devops',
  'architect',
  'reviewer',
  'researcher',
] as const;

export const SCRAPE_JOB_STATUSES = ['pending', 'running', 'done', 'failed'] as const;

export const SCRAPE_PAGE_STATUSES = ['raw', 'classified', 'promoted', 'failed'] as const;

export const SCRAPE_TOOL_NAMES = [
  'scrape.crawl_url',
  'scrape.classify_page',
  'scrape.promote_batch',
] as const;

export type ScrapeToolName = (typeof SCRAPE_TOOL_NAMES)[number];

export interface ScrapeToolSchemaDefinition {
  name: ScrapeToolName;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
}

const crawlUrlPageSchema: JSONSchema = {
  type: 'object',
  properties: {
    page_id: { type: 'string', description: 'scrape_pages.id' },
    url: { type: 'string', description: 'Canonical page URL' },
    status: {
      type: 'string',
      enum: ['raw', 'failed'],
      description: 'Initial scrape_pages.status after crawl',
    },
    content_hash: {
      type: 'string',
      minLength: 64,
      maxLength: 64,
      description: 'sha256(normalized_text) — scrape_pages.content_hash',
    },
    http_status: { type: 'integer', description: 'HTTP response status code' },
  },
  required: ['page_id', 'url', 'status'],
};

const classificationSchema: JSONSchema = {
  type: 'object',
  properties: {
    classification_id: { type: 'string', description: 'scrape_classifications.id' },
    page_id: { type: 'string', description: 'FK scrape_pages.id' },
    entry_type: {
      type: 'string',
      enum: [...INBOX_ENTRY_TYPES],
      description: 'Inbox-contract entry_type',
    },
    severity: {
      type: 'string',
      enum: [...INBOX_SEVERITIES],
      description: 'Inbox-contract severity',
    },
    agent_role: {
      type: 'string',
      enum: [...INBOX_AGENT_ROLES],
      description: 'Suggested agent_role for promoted inbox row',
    },
    title: { type: 'string', description: 'Suggested inbox title' },
    summary: {
      type: 'string',
      maxLength: 300,
      description: 'scrape_classifications.summary (max 300 chars)',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'scrape_classifications.tags (max 8)',
    },
    features: {
      type: 'object',
      description: 'scrape_classifications.features JSONB (topics, api_docs, etc.)',
    },
  },
  required: ['classification_id', 'page_id', 'entry_type', 'severity', 'summary'],
};

const promotionSchema: JSONSchema = {
  type: 'object',
  properties: {
    page_id: { type: 'string', description: 'scrape_pages.id' },
    inbox_entry_id: {
      type: 'string',
      description: 'inbox_entries.id after promotion',
    },
    content_hash: {
      type: 'string',
      minLength: 64,
      maxLength: 64,
      description: 'Dedup key shared with inbox_entries',
    },
    source_format: {
      type: 'string',
      enum: ['url'],
      description: 'Promoted inbox source_format',
    },
    promoted_at: {
      type: 'string',
      description: 'ISO 8601 timestamp when scrape_pages.inbox_entry_id was set',
    },
    export_path: {
      type: 'string',
      description: 'Optional funnel .md path when export_md=true',
    },
  },
  required: ['page_id', 'content_hash'],
};

export const scrapeCrawlUrlSchema: ScrapeToolSchemaDefinition = {
  name: 'scrape.crawl_url',
  description:
    'Start a Scrapy crawl for a manifest slug; upserts scrape_jobs and scrape_pages (status=raw)',
  inputSchema: {
    type: 'object',
    properties: {
      manifest_slug: {
        type: 'string',
        description: 'Unique slug from scrape_manifests.slug',
      },
      seed_urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional seed URL override (defaults to manifest seeds)',
      },
      max_depth: {
        type: 'integer',
        minimum: 0,
        maximum: 10,
        description: 'Crawl depth limit',
      },
      dry_run: {
        type: 'boolean',
        description: 'Simulate crawl without DB writes',
      },
    },
    required: ['manifest_slug'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      job_id: { type: 'string', description: 'scrape_jobs.id' },
      manifest_id: { type: 'string', description: 'scrape_manifests.id' },
      manifest_slug: { type: 'string', description: 'scrape_manifests.slug' },
      status: {
        type: 'string',
        enum: [...SCRAPE_JOB_STATUSES],
        description: 'scrape_jobs.status',
      },
      pages_crawled: { type: 'integer', description: 'Count of pages upserted' },
      pages: {
        type: 'array',
        items: crawlUrlPageSchema,
        description: 'Per-URL crawl results written to scrape_pages',
      },
    },
    required: ['job_id', 'manifest_id', 'status', 'pages_crawled', 'pages'],
  },
};

export const scrapeClassifyPageSchema: ScrapeToolSchemaDefinition = {
  name: 'scrape.classify_page',
  description:
    'Classify raw scrape_pages via Ollama; writes scrape_classifications and sets status=classified',
  inputSchema: {
    type: 'object',
    properties: {
      page_id: {
        type: 'string',
        description: 'Single scrape_pages.id to classify',
      },
      job_id: {
        type: 'string',
        description: 'Classify up to limit raw pages for this scrape_jobs.id',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'Batch size when job_id is set (default 50)',
      },
      model: {
        type: 'string',
        description: 'Ollama model override (OLLAMA_MODEL env default)',
      },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      classified_count: { type: 'integer', description: 'Rows classified in this call' },
      classifications: {
        type: 'array',
        items: classificationSchema,
        description: 'Ollama structured output persisted to scrape_classifications',
      },
    },
    required: ['classified_count', 'classifications'],
  },
};

export const scrapePromoteBatchSchema: ScrapeToolSchemaDefinition = {
  name: 'scrape.promote_batch',
  description:
    'Promote classified scrape_pages to inbox_entries; sets inbox_entry_id and promoted_at',
  inputSchema: {
    type: 'object',
    properties: {
      job_id: {
        type: 'string',
        description: 'Promote all eligible pages for this scrape_jobs.id',
      },
      page_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Explicit scrape_pages.id list to promote',
      },
      dry_run: {
        type: 'boolean',
        description: 'Preview promotion mapping without writes',
      },
      export_md: {
        type: 'boolean',
        description: 'Write optional review .md to GenerativeUI_monorepo/docs/inbox/',
      },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      promoted_count: { type: 'integer', description: 'Rows promoted to inbox_entries' },
      skipped_count: {
        type: 'integer',
        description: 'Rows skipped (already promoted or missing classification)',
      },
      dry_run: { type: 'boolean', description: 'Whether this was a dry-run' },
      promotions: {
        type: 'array',
        items: promotionSchema,
        description: 'Promotion results with inbox_entry_id when not dry_run',
      },
    },
    required: ['promoted_count', 'skipped_count', 'promotions'],
  },
};

/** All scrape tool schema definitions for schema-crawler batch generation */
export const SCRAPE_TOOL_SCHEMAS: ScrapeToolSchemaDefinition[] = [
  scrapeCrawlUrlSchema,
  scrapeClassifyPageSchema,
  scrapePromoteBatchSchema,
];
