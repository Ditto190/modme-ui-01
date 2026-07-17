import { z } from 'zod';

export const GENUI_TIERS = ['static', 'declarative', 'open-ended'];

export const ROUTE_HINTS = ['dashboard', 'visualization', 'component', 'audit'];

export const moleculeExampleSchema = z.object({
  description: z.string(),
  input: z.record(z.unknown()),
  expectedOutcome: z.string(),
});

export const moleculeRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  genUItier: z.enum(GENUI_TIERS),
  parameterSchema: z.record(z.unknown()),
  constraints: z.array(z.string()),
  route_hint: z.enum(ROUTE_HINTS).optional(),
  tags: z.array(z.string()).default([]),
  underlyingTools: z.array(z.string()).default([]),
  examples: z.array(moleculeExampleSchema).default([]),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  component_path: z.string().optional(),
});

export const moleculeCatalogSchema = z.object({
  version: z.string().min(1),
  schema_version: z.literal('1.0.0'),
  generated_at: z.string().datetime(),
  stack: z.string().min(1),
  source_only: z.literal(false),
  content_hashes: z.record(z.string().length(64)),
  molecule_ids: z.array(z.string()),
  molecules: z.array(moleculeRecordSchema).min(1),
  tiers: z.object({
    static: z.array(z.string()),
    declarative: z.array(z.string()),
    'open-ended': z.array(z.string()),
  }),
});

/** Validate normalized catalog.v1.json at ingest boundary */
export function validateMoleculeCatalog(catalog) {
  return moleculeCatalogSchema.safeParse(catalog);
}
