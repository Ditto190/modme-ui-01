#!/usr/bin/env node

/**

 * Worktree orchestration smoke — no servers required.

 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyChangedStacks } from "../../scripts/lib/path-filter.mjs";
import { HEAVY_DEP_SPECS } from "../../scripts/lib/worktree-link-deps.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));

if (!packageJson.scripts?.["workspace:bootstrap:shared"]) {
  console.error("worktree-smoke: missing yarn script workspace:bootstrap:shared");
  process.exit(1);
}

if (!existsSync(resolve(ROOT, "scripts/lib/worktree-link-deps.ps1"))) {
  console.error("worktree-smoke: missing scripts/lib/worktree-link-deps.ps1");
  process.exit(1);
}

if (HEAVY_DEP_SPECS.length !== 4) {
  console.error("worktree-smoke: HEAVY_DEP_SPECS contract mismatch");
  process.exit(1);
}

function run(cmd, args, { cwd = ROOT } = {}) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });

  if (r.status !== 0) process.exit(r.status ?? 1);
}

const stacks = classifyChangedStacks(["next-forge/apps/app/page.tsx"]);

if (!stacks.forge) {
  console.error("path-filter smoke failed: forge");

  process.exit(1);
}

const uwStacks = classifyChangedStacks([
  "GenerativeUI_monorepo/UniversalWorkbench/apps/web/src/routes/index.lazy.tsx",
]);

if (!uwStacks.generative) {
  console.error("path-filter smoke failed: generative/UW");

  process.exit(1);
}

const uwContractPaths = [
  "GenerativeUI_monorepo/UniversalWorkbench/apps/api/src/server.smoke.test.ts",

  "GenerativeUI_monorepo/UniversalWorkbench/apps/web/e2e/home.smoke.spec.ts",

  "GenerativeUI_monorepo/UniversalWorkbench/playwright.config.ts",
];

for (const rel of uwContractPaths) {
  if (!existsSync(resolve(ROOT, rel))) {
    console.error(`worktree-smoke: missing UW artifact ${rel}`);

    process.exit(1);
  }
}

run("node", ["scripts/generate-mprocs-config.mjs"]);

run("node", ["scripts/agent-status.mjs", "--ci"]);

const check = spawnSync(
  "node",

  [
    "scripts/lib/agent-task-registry-check.mjs",

    "--title",

    "smoke test task",

    "--session-id",

    "00000000-0000-0000-0000-000000000001",

    "--force",
  ],

  { cwd: ROOT, encoding: "utf8" }
);

if (check.status !== 0) {
  console.error(check.stderr || check.stdout);

  process.exit(check.status ?? 1);
}

run("node", [
  "scripts/lib/agent-task-registry-close.mjs",

  "--session-id",

  "00000000-0000-0000-0000-000000000001",
]);



run("node", ["scripts/pre-commit-checks.mjs"]);

console.log("worktree-smoke: ok");

