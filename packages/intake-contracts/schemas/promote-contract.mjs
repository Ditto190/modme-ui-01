import { z } from 'zod';
import { ENTRY_TYPES, SEVERITIES, AGENT_ROLES } from './classify-output.mjs';

/** Synced from docs/inbox-pipeline/contracts/scrape-promotion.v1.json */
export const promoteEntrySchema = z.object({
  content_hash: z.string().length(64),
  source_file: z.string().min(1),
  source_format: z.literal('url'),
  raw_content: z.string().optional(),
  extracted_text: z.string().optional(),
  title: z.string().max(500).optional(),
  summary: z.string().max(1000).optional(),
  agent_name: z.string().optional(),
  agent_role: z.enum(AGENT_ROLES).optional(),
  tags: z.array(z.string()).default([]),
  severity: z.enum(SEVERITIES),
  entry_type: z.enum(ENTRY_TYPES),
  status: z.literal('indexed'),
  code_pattern_ids: z.array(z.string()).optional(),
  source_kind: z.enum(['inbox_file', 'scrape_url', 'code_pattern']).optional(),
});

export const promoteBatchItemSchema = z.object({
  page_id: z.string().uuid(),
  classification_id: z.string().uuid(),
  entry: promoteEntrySchema,
});

export const promoteBatchSchema = z.object({
  items: z.array(promoteBatchItemSchema).min(1),
  dry_run: z.boolean().optional(),
});
