import { z } from 'zod';

/** Synced from docs/inbox-pipeline/contracts/code-chunk.v1.json */
export const AST_KINDS = [
  'export',
  'function',
  'class',
  'interface',
  'type_alias',
  'zod_schema',
  'prisma_model',
  'mcp_tool',
  'enum',
  'const',
];

export const codeChunkSchema = z.object({
  path: z.string().min(1),
  ast_kind: z.enum(AST_KINDS),
  symbol_name: z.string().min(1),
  content_hash: z.string().length(64),
  text: z.string().min(1),
  schema_json: z.record(z.unknown()).optional(),
  line_start: z.number().int().positive().optional(),
  line_end: z.number().int().positive().optional(),
  tags: z.array(z.string()).max(12).default([]),
});

export const codeChunkBatchSchema = z.object({
  chunks: z.array(codeChunkSchema).min(1),
  indexed_at: z.string().datetime().optional(),
});
