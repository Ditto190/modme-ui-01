/**
 * @feature INBOX.PIPELINE.WORKFLOW
 * @domain INBOX
 * @layer AGENT
 * Workflow: End-to-end inbox pipeline (ingest → embed → categorize → output)
 * Extends the statusReport workflow pattern.
 */
import { z } from 'zod';
import {
  executeTool,
  type ToolRegistry,
} from '../tools/index.js';

const InboxPipelineEntrySchema = z.object({
  content_hash: z.string(),
  source_file: z.string(),
  source_format: z.enum(['md', 'txt', 'pdf', 'url', 'jsx', 'snippet', 'html', 'csv']),
  raw_content: z.string().optional(),
  title: z.string().optional(),
  tags: z.array(z.string()).default([]),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  agent_name: z.string().optional(),
  session_id: z.string().optional(),
});

const InboxPipelineInputSchema = z.object({
  agentServerUrl: z.string().url().default('http://localhost:8000'),
  entries: z.array(InboxPipelineEntrySchema).min(1),
  mode: z.enum(['ingest_only', 'full_pipeline']).default('full_pipeline'),
  dry_run: z.boolean().default(false),
});

export type InboxPipelineInput = z.infer<typeof InboxPipelineInputSchema>;

export type InboxPipelineResult = {
  success: boolean;
  ingested: number;
  duplicates: number;
  categorized: number;
  errors: string[];
  entry_ids: string[];
  summary: string;
};

type InboxIngestExecutionResult = Awaited<ReturnType<ToolRegistry['inboxIngest']['execute']>>;
type MdaCategorizeExecutionResult = Awaited<ReturnType<ToolRegistry['mdaCategorize']['execute']>>;

export async function inboxPipelineWorkflow(
  input: InboxPipelineInput
): Promise<InboxPipelineResult> {
  const parsed = InboxPipelineInputSchema.parse(input);
  const { agentServerUrl, dry_run, entries, mode } = parsed;

  const entry_ids: string[] = [];
  const errors: string[] = [];
  let duplicates = 0;

  for (const entry of entries) {
    const result = (await executeTool('inboxIngest', {
      agentServerUrl,
      ...entry,
    })) as InboxIngestExecutionResult;

    if (result.success && result.entry_id !== undefined) {
      entry_ids.push(result.entry_id);

      if (result.duplicate) {
        duplicates += 1;
      }

      continue;
    }

    if (result.error !== undefined) {
      errors.push(result.error);
    }
  }

  if (mode === 'ingest_only' || entry_ids.length === 0) {
    return {
      success: errors.length === 0,
      ingested: entry_ids.length,
      duplicates,
      categorized: 0,
      errors,
      entry_ids,
      summary: `Ingested ${entry_ids.length} entries`,
    };
  }

  const categorizeResult = (await executeTool('mdaCategorize', {
    agentServerUrl,
    dry_run,
    entry_ids,
    mode: 'all',
  })) as MdaCategorizeExecutionResult;

  errors.push(...categorizeResult.errors);

  return {
    success: errors.length === 0,
    ingested: entry_ids.length,
    duplicates,
    categorized: categorizeResult.processed,
    errors,
    entry_ids,
    summary: `Pipeline complete: ${entry_ids.length} ingested, ${categorizeResult.processed} categorized`,
  };
}
