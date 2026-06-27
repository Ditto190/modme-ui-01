#!/usr/bin/env node
/**
 * Run verify:forge / verify:generative based on changed files (ci.yml filters).
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyChangedStacks, gitChangedFiles } from "./path-filter.mjs";
import { logOrchestratorException } from "./agent-orchestrator-log.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function runYarn(script) {
  console.log(`verify-stack: yarn ${script}`);
  const result = spawnSync("yarn", [script], { cwd: ROOT, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    logOrchestratorException("run-verify-stack", new Error(`yarn ${script} failed`), {
      exit_code: result.status,
    });
    process.exit(result.status ?? 1);
  }
}

const files = gitChangedFiles();
const stacks = classifyChangedStacks(files);

console.log(`verify-stack: ${files.length} changed files`);
console.log(`verify-stack: forge=${stacks.forge} generative=${stacks.generative}`);

if (!stacks.forge && !stacks.generative) {
  console.log("verify-stack: no monorepo app paths changed — skipping");
  process.exit(0);
}

if (stacks.forge) runYarn("verify:forge");
if (stacks.generative) runYarn("verify:generative");

console.log("verify-stack: passed");
