import { z } from 'zod';

export const PIPELINE_STATUSES = ['running', 'completed', 'failed', 'skipped'];

export const pipelineRunSchema = z.object({
  tenant_id: z.string().uuid(),
  pipeline: z.string().default('telemetry'),
  mode: z.string().default('collect'),
  trigger_source: z.string().default('manual'),
  status: z.enum(PIPELINE_STATUSES),
  started_at: z.string(),
  finished_at: z.string().nullable().optional(),
  source_path: z.string().nullable().optional(),
  stats: z.record(z.unknown()).default({}),
  error_message: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  duration_ms: z.number().int().nonnegative().nullable().optional(),
});
