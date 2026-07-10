#!/usr/bin/env node
/**
 * Validate ECL harness structure and required docs.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const REQUIRED = [
  "docs/ECL.md",
  "docs/STATUS.md",
  "docs/ARCHITECTURE.md",
  "harness/config/environment.json",
  "harness/changes/templates/structured-change.md",
  "harness/templates/change/summary.md",
  "harness/templates/change/spec.md",
  "harness/templates/change/plan.md",
  "harness/templates/change/tasks.md",
  "harness/evolution/state.json",
];

const REQUIRED_DIRS = [
  "harness/changes/active",
  "harness/changes/parking",
  "harness/changes/archive",
];

let errors = 0;

function err(msg) {
  console.error(`lint-ecl: ${msg}`);
  errors += 1;
}

function ok(msg) {
  console.log(`lint-ecl: ${msg}`);
}

for (const rel of REQUIRED) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) err(`missing ${rel}`);
  else ok(`found ${rel}`);
}

for (const rel of REQUIRED_DIRS) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) err(`missing directory ${rel}/`);
  else ok(`found ${rel}/`);
}

const eclPath = join(ROOT, "docs/ECL.md");
if (existsSync(eclPath)) {
  const ecl = readFileSync(eclPath, "utf8");
  for (const section of ["Small Change", "Structured Change", "Verify"]) {
    if (!ecl.includes(section)) err(`docs/ECL.md missing section: ${section}`);
  }
}

const envPath = join(ROOT, "harness/config/environment.json");
if (existsSync(envPath)) {
  try {
    const env = JSON.parse(readFileSync(envPath, "utf8"));
    if (!env.stacks?.forge || !env.stacks?.generative) {
      err("environment.json missing stacks.forge or stacks.generative");
    }
  } catch (e) {
    err(`environment.json invalid JSON: ${e.message}`);
  }
}

const activeDir = join(ROOT, "harness/changes/active");
if (existsSync(activeDir)) {
  for (const entry of readdirSync(activeDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const changeMd = join(activeDir, entry.name, "CHANGE.md");
    if (!existsSync(changeMd)) err(`active/${entry.name} missing CHANGE.md`);
  }
}

if (errors > 0) {
  console.error(`lint-ecl: ${errors} error(s)`);
  process.exit(1);
}

ok("all checks passed");
