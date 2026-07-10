import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const MANIFEST = resolve(ROOT, "data/molecule-index/manifest.json");

const RECORD_KINDS = [
  "ts_ast",
  "zod_module",
  "mcp_molecule",
  "toolset_entry",
  "knowledge_chunk",
  "legacy_satellite",
] as const;

describe("molecule index branded contract", () => {
  it("manifest record kinds match discriminated union", () => {
    expect(existsSync(MANIFEST)).toBe(true);
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    expect(manifest.record_kinds.sort()).toEqual([...RECORD_KINDS].sort());
  });

  it("each molecule has branded id fields", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    for (const mol of manifest.molecules) {
      expect(typeof mol.id).toBe("string");
      expect(mol.id.length).toBeGreaterThan(0);
      expect(typeof mol.semver).toBe("string");
      expect(RECORD_KINDS).toContain(mol.kind);
    }
  });
});
