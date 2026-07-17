import { z } from "zod";

export const GENUI_TIERS = ["static", "declarative", "open-ended"] as const;
export const ROUTE_HINTS = [
  "dashboard",
  "visualization",
  "component",
  "audit",
] as const;

export type GenUiTier = (typeof GENUI_TIERS)[number];
export type RouteHint = (typeof ROUTE_HINTS)[number];

export const MoleculeExampleSchema = z.object({
  description: z.string(),
  input: z.record(z.string(), z.unknown()),
  expectedOutcome: z.string(),
});

export type MoleculeExample = z.infer<typeof MoleculeExampleSchema>;

export const MoleculeRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  genUItier: z.enum(GENUI_TIERS),
  parameterSchema: z.record(z.string(), z.unknown()),
  constraints: z.array(z.string()),
  route_hint: z.enum(ROUTE_HINTS).optional(),
  tags: z.array(z.string()).default([]),
  underlyingTools: z.array(z.string()).default([]),
  examples: z.array(MoleculeExampleSchema).default([]),
  complexity: z.enum(["simple", "moderate", "complex"]).optional(),
  component_path: z.string().optional(),
});

export type MoleculeRecord = z.infer<typeof MoleculeRecordSchema>;

export const MoleculeCatalogSchema = z.object({
  version: z.string().min(1),
  schema_version: z.literal("1.0.0"),
  generated_at: z.string().datetime(),
  stack: z.string().min(1),
  source_only: z.literal(false),
  content_hashes: z.record(z.string(), z.string().length(64)),
  molecule_ids: z.array(z.string()),
  molecules: z.array(MoleculeRecordSchema).min(1),
  tiers: z.object({
    static: z.array(z.string()),
    declarative: z.array(z.string()),
    "open-ended": z.array(z.string()),
  }),
});

export type MoleculeCatalog = z.infer<typeof MoleculeCatalogSchema>;

export function parseMoleculeCatalog(raw: unknown): MoleculeCatalog {
  return MoleculeCatalogSchema.parse(raw);
}

export function parseMoleculeRecord(raw: unknown): MoleculeRecord {
  return MoleculeRecordSchema.parse(raw);
}
