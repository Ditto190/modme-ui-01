/** Branded IDs for molecule indexing spine (ADR-0012 / PORTING_GUIDE slices). */
export type MoleculeId = string & { readonly __brand: "MoleculeId" };
export type CodeChunkId = string & { readonly __brand: "CodeChunkId" };
export type SchemaVersion = string & { readonly __brand: "SchemaVersion" };

export type IndexRecordKind =
  | "ts_ast"
  | "zod_module"
  | "mcp_molecule"
  | "toolset_entry"
  | "knowledge_chunk"
  | "legacy_satellite";

export interface MoleculeIndexRecord {
  greptime_id: CodeChunkId | null;
  id: MoleculeId;
  kind: IndexRecordKind;
  path: string;
  route_hint?: "dashboard" | "visualization" | "component" | "audit";
  semver: SchemaVersion;
  zod_export: string | null;
}

export function asMoleculeId(id: string): MoleculeId {
  return id as MoleculeId;
}

export function asSchemaVersion(v: string): SchemaVersion {
  return v as SchemaVersion;
}
