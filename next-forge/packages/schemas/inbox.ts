import { z } from "zod";

/** Inbox data contract v1 — sync with docs/inbox-pipeline/contracts/ */

export const INBOX_CONTRACT_VERSION = "1.0";

export const InboxEntryTypeSchema = z.enum([
  "architecture",
  "design",
  "code-review",
  "solution",
  "research",
  "snippet",
  "link",
  "component",
]);

export const InboxSeveritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const InboxAgentRoleSchema = z.enum([
  "frontend",
  "backend",
  "devops",
  "architect",
  "reviewer",
  "researcher",
]);

export const InboxSourceFormatSchema = z.enum([
  "md",
  "txt",
  "pdf",
  "url",
  "jsx",
  "snippet",
  "html",
  "csv",
]);

export const InboxPipelineStageSchema = z.enum([
  "indexed",
  "categorized",
  "archived",
  "superseded",
]);

export const InboxFrontmatterSchema = z.object({
  timestamp: z.string().datetime({ offset: true }).or(z.string().min(1)),
  agent: z.string().min(1),
  type: InboxEntryTypeSchema,
  agent_role: InboxAgentRoleSchema.optional(),
  session_id: z.string().optional(),
  tags: z.array(z.string()).default([]),
  severity: InboxSeveritySchema.default("medium"),
  related_files: z.array(z.string()).optional(),
  branch: z.string().optional(),
  pr_number: z.number().nullable().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
});

export type InboxFrontmatter = z.infer<typeof InboxFrontmatterSchema>;

/** Relaxed frontmatter for non-.md files (no frontmatter block) */
export const InboxFrontmatterOptionalSchema = InboxFrontmatterSchema.partial({
  timestamp: true,
  agent: true,
  type: true,
});

export const InboxFunnelFileSchema = z.object({
  path: z.string(),
  format: InboxSourceFormatSchema,
  frontmatter: InboxFrontmatterOptionalSchema.optional(),
  contentHash: z.string().length(64),
  title: z.string().optional(),
});

export type InboxFunnelFile = z.infer<typeof InboxFunnelFileSchema>;

export const InboxEntryRecordSchema = z.object({
  id: z.string().uuid(),
  content_hash: z.string().length(64),
  source_file: z.string(),
  source_format: InboxSourceFormatSchema,
  raw_content: z.string().nullable().optional(),
  extracted_text: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  agent_name: z.string().nullable().optional(),
  agent_role: InboxAgentRoleSchema.nullable().optional(),
  session_id: z.string().nullable().optional(),
  branch_name: z.string().nullable().optional(),
  pr_number: z.number().nullable().optional(),
  tags: z.array(z.string()).default([]),
  severity: InboxSeveritySchema,
  entry_type: z.string().nullable().optional(),
  status: InboxPipelineStageSchema,
  storage_url: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type InboxEntryRecord = z.infer<typeof InboxEntryRecordSchema>;

export const InboxIndexEntrySchema = z.object({
  id: z.string(),
  filename: z.string(),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  type: z.string().nullable().optional(),
  severity: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export const InboxIndexManifestSchema = z.object({
  version: z.literal("1.0"),
  last_updated: z.string(),
  entry_count: z.number().int().nonnegative(),
  entries: z.array(InboxIndexEntrySchema),
});

export type InboxIndexManifest = z.infer<typeof InboxIndexManifestSchema>;

/** Embedding dimension standard (MiniLM) */
export const INBOX_EMBEDDING_DIMENSIONS = 384;
