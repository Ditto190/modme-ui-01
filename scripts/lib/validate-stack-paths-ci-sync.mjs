#!/usr/bin/env node
/**
 * Ensure .github/workflows/ci.yml dorny/paths-filter blocks match stack-paths.json.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { manifest } from "./load-stack-paths.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CI_PATH = resolve(ROOT, ".github/workflows/ci.yml");

const ci = readFileSync(CI_PATH, "utf8");
let errors = 0;

for (const [name, cfg] of Object.entries(manifest.filters)) {
  if (!cfg.ciGlobs?.length) continue;
  for (const glob of cfg.ciGlobs) {
    const quoted = `'${glob}'`;
    if (!ci.includes(quoted) && !ci.includes(`"${glob}"`)) {
      console.error(
        `validate-stack-paths: ci.yml missing glob for filter "${name}": ${glob}`,
      );
      errors += 1;
    }
  }
}

if (errors > 0) {
  console.error(
    `validate-stack-paths: ${errors} mismatch(es) — update ci.yml or scripts/lib/stack-paths.json together`,
  );
  process.exit(1);
}

console.log("validate-stack-paths: ci.yml matches stack-paths.json");
