/**
 * Typed wrapper for scripts/yaml-parser.mjs
 * This file provides TypeScript-friendly exports that call the ESM CLI module.
 */
export type CollectionSet = {
  source: string;
  collection: Record<string, unknown> | unknown[] | object;
  validation?: { valid: boolean; errors?: unknown[] | null } | null;
};

export async function generateCollectionSet(
  inputPath: string,
  options?: { schemaPath?: string }
): Promise<CollectionSet | null> {
  const mod = await import("../../scripts/yaml-parser.mjs");
  if (mod && typeof mod.generateCollectionSet === "function") {
    return await mod.generateCollectionSet(inputPath, options);
  }
  throw new Error("yaml-parser module not available");
}

export async function parseFrontmatter(
  filePath: string
): Promise<Record<string, unknown> | null> {
  const mod = await import("../../scripts/yaml-parser.mjs");
  if (mod && typeof mod.parseFrontmatter === "function") {
    return await mod.parseFrontmatter(filePath);
  }
  return null;
}
