import { z } from 'zod';
import { safeValidate, formatZodIssues } from './lib/result.mjs';
import { classifyOutputSchema } from './schemas/classify-output.mjs';
import { promoteEntrySchema } from './schemas/promote-contract.mjs';
import { codeChunkSchema } from './schemas/code-chunk.mjs';
import { telemetryEventSchema } from './schemas/telemetry-event.mjs';
import { pipelineRunSchema } from './schemas/pipeline-run.mjs';
import { evalSignalSchema } from './schemas/eval-signal.mjs';
import { testResultSchema } from './schemas/test-result.mjs';

export { safeValidate, formatZodIssues } from './lib/result.mjs';
export {
  classifyOutputSchema,
  ENTRY_TYPES,
  SEVERITIES,
  AGENT_ROLES,
} from './schemas/classify-output.mjs';
export {
  promoteEntrySchema,
  promoteBatchItemSchema,
  promoteBatchSchema,
} from './schemas/promote-contract.mjs';
export {
  codeChunkSchema,
  codeChunkBatchSchema,
  AST_KINDS,
} from './schemas/code-chunk.mjs';
export {
  TELEMETRY_LEVELS,
  telemetryEventSchema,
  telemetryEventBatchSchema,
} from './schemas/telemetry-event.mjs';
export {
  PIPELINE_STATUSES,
  pipelineRunSchema,
} from './schemas/pipeline-run.mjs';
export {
  EVAL_IMPACT_LEVELS,
  evalSignalSchema,
} from './schemas/eval-signal.mjs';
export {
  TEST_FRAMEWORKS,
  testResultSchema,
} from './schemas/test-result.mjs';

export const SCRAPE_PAGE_STATUSES = ['raw', 'classified', 'promoted', 'failed'];

/** @param {import('zod').ZodIssue[]} issues */
export function formatIssues(issues) {
  return formatZodIssues(issues);
}

/** Validate Ollama classifier output before scrape_classifications insert */
export function validateScrapeClassificationResult(data) {
  return safeValidate(classifyOutputSchema, data);
}

/** Validate inbox_entries row shape at promote boundary */
export function validateInboxPromoteEntry(entry) {
  return safeValidate(promoteEntrySchema, entry);
}

const scrapePromotionItemSchema = z.object({
  page_id: z.string(),
  inbox_entry_id: z.string().optional(),
  content_hash: z.string().length(64),
  promoted_at: z.string().optional(),
  export_path: z.string().optional(),
  code_pattern_ids: z.array(z.string()).optional(),
});

const scrapePromoteBatchOutputSchema = z.object({
  promoted_count: z.number().int().nonnegative(),
  skipped_count: z.number().int().nonnegative(),
  dry_run: z.boolean().optional(),
  promotions: z.array(scrapePromotionItemSchema),
});

/** Validate scrape-promote.mjs batch summary output */
export function validateScrapePromoteBatchOutput(output) {
  return safeValidate(scrapePromoteBatchOutputSchema, output);
}

/** Validate single code chunk from AST indexer */
export function validateCodeChunk(chunk) {
  return safeValidate(codeChunkSchema, chunk);
}

/** Validate telemetry event before telemetry-bridge upsert */
export function validateTelemetryEvent(event) {
  return safeValidate(telemetryEventSchema, event);
}

/** Validate pipeline run open/close payload */
export function validatePipelineRun(run) {
  return safeValidate(pipelineRunSchema, run);
}

/** Validate eval friction signal before eval_signals insert */
export function validateEvalSignal(signal) {
  return safeValidate(evalSignalSchema, signal);
}

/** Validate normalized Playwright/JUnit test result */
export function validateTestResult(result) {
  return safeValidate(testResultSchema, result);
}
