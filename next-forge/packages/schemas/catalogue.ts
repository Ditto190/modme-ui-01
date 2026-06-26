import { z } from "zod";

/** Catalogue data contract v1 — sync with docs/inbox-pipeline/contracts/ */
export const CATALOGUE_CONTRACT_VERSION = "1.0";

export const CatalogueItemTypeSchema = z.enum([
  "agent",
  "skill",
  "instruction",
  "hook",
  "workflow",
  "plugin",
  "component",
]);

export const CatalogueItemStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);

export const CatalogueItemRecordSchema = z.object({
  id: z.string().uuid(),
  item_type: CatalogueItemTypeSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  taxonomy_code: z.string().nullable().optional(),
  status: CatalogueItemStatusSchema,
  source_entry_id: z.string().uuid().nullable().optional(),
  output_schema_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  popularity_score: z.number().nullable().optional(),
  published_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CatalogueItemRecord = z.infer<typeof CatalogueItemRecordSchema>;

export const CataloguePopularitySnapshotSchema = z.object({
  id: z.string().uuid(),
  catalogue_item_id: z.string().uuid(),
  timeframe: z.string().default("30d"),
  composite_score: z.number().nullable().optional(),
  metrics: z.record(z.string(), z.unknown()).default({}),
  captured_at: z.string(),
});

export type CataloguePopularitySnapshot = z.infer<
  typeof CataloguePopularitySnapshotSchema
>;

export const CatalogueListQuerySchema = z.object({
  action: z.enum(["list", "popular", "search"]).default("list"),
  type: CatalogueItemTypeSchema.optional(),
  status: CatalogueItemStatusSchema.default("published"),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CatalogueListQuery = z.infer<typeof CatalogueListQuerySchema>;
