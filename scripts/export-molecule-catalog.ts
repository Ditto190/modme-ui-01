#!/usr/bin/env bun
/**
 * Export MoleculeLibrary entries as JSON catalog records (one file per molecule).
 * Invoked by molecule-index-orchestrator.mjs — reads GenerativeUI sources only.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MoleculeLibrary,
  getMoleculeComponent,
  type Molecule,
} from "../GenerativeUI_monorepo/apps/agent-generator/src/mcp-registry/molecule-generator.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MOLECULES_DIR = resolve(ROOT, "data/molecule-index/molecules");
const FORGE_CATALOG_DIR = resolve(
  ROOT,
  "next-forge/packages/gen-engine/catalog"
);

type RouteHint = "dashboard" | "visualization" | "component" | "audit";

function inferRouteHint(molecule: Molecule): RouteHint {
  if (molecule.id.includes("knowledge") || molecule.tags.includes("intake")) {
    return "audit";
  }
  if (
    molecule.tags.some((tag) =>
      ["git", "code", "filesystem", "development"].includes(tag)
    )
  ) {
    return "component";
  }
  if (molecule.tags.includes("web") || molecule.tags.includes("api")) {
    return "component";
  }
  if (molecule.tags.includes("reasoning") || molecule.tags.includes("analysis")) {
    return "visualization";
  }
  return "dashboard";
}

function serializeMolecule(molecule: Molecule) {
  return {
    id: molecule.id,
    name: molecule.name,
    description: molecule.description,
    genUItier: molecule.genUItier,
    parameterSchema: molecule.parameterSchema,
    constraints: molecule.constraints,
    route_hint: inferRouteHint(molecule),
    tags: molecule.tags,
    underlyingTools: molecule.underlyingTools,
    complexity: molecule.complexity,
    component_path: getMoleculeComponent(molecule),
  };
}

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function main() {
  const molecules = Object.values(MoleculeLibrary).map((factory) =>
    serializeMolecule(factory())
  );

  mkdirSync(MOLECULES_DIR, { recursive: true });
  mkdirSync(FORGE_CATALOG_DIR, { recursive: true });

  const contentHashes: Record<string, string> = {};

  for (const molecule of molecules) {
    const json = `${JSON.stringify(molecule, null, 2)}\n`;
    const filePath = resolve(MOLECULES_DIR, `${molecule.id}.json`);
    writeFileSync(filePath, json, "utf8");
    contentHashes[molecule.id] = sha256(json);
  }

  const catalog = {
    version: process.env.MOLECULE_INDEX_SEMVER ?? "1.0.0",
    schema_version: "1.0.0" as const,
    generated_at: new Date().toISOString(),
    stack: process.env.MOLECULE_INDEX_STACK ?? "forge",
    source_only: false as const,
    content_hashes: contentHashes,
    molecule_ids: molecules.map((m) => m.id),
    molecules,
    tiers: {
      static: molecules.filter((m) => m.genUItier === "static").map((m) => m.id),
      declarative: molecules
        .filter((m) => m.genUItier === "declarative")
        .map((m) => m.id),
      "open-ended": molecules
        .filter((m) => m.genUItier === "open-ended")
        .map((m) => m.id),
    },
  };

  const catalogJson = `${JSON.stringify(catalog, null, 2)}\n`;
  const catalogPath = resolve(ROOT, "data/molecule-index/catalog.v1.json");
  writeFileSync(catalogPath, catalogJson, "utf8");
  writeFileSync(
    resolve(FORGE_CATALOG_DIR, "catalog.v1.json"),
    catalogJson,
    "utf8"
  );

  console.log(
    JSON.stringify({
      ok: true,
      moleculeCount: molecules.length,
      catalogPath: "data/molecule-index/catalog.v1.json",
      tiers: catalog.tiers,
    })
  );
}

main();
