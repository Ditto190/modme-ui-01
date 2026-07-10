#!/usr/bin/env node
/**
 * Load canonical stack path filters from scripts/lib/stack-paths.json.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {{ version: number, filters: Record<string, { prefixes: string[], ciGlobs: string[] }> }} */
const manifest = JSON.parse(
  readFileSync(resolve(__dirname, "stack-paths.json"), "utf8"),
);

/**
 * @returns {Record<string, string[]>}
 */
export function getPathFilterPrefixes() {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const [name, cfg] of Object.entries(manifest.filters)) {
    out[name] = cfg.prefixes;
  }
  return out;
}

/**
 * YAML block for dorny/paths-filter (forge, generative, orchestration, harness, e2e).
 * @returns {string}
 */
export function getCiPathsFilterYaml() {
  const lines = [];
  for (const [name, cfg] of Object.entries(manifest.filters)) {
    if (!cfg.ciGlobs?.length) continue;
    lines.push(`            ${name}:`);
    for (const glob of cfg.ciGlobs) {
      lines.push(`              - '${glob}'`);
    }
  }
  return lines.join("\n");
}

export { manifest };
