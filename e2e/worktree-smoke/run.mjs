#!/usr/bin/env node
/**
 * Worktree orchestration smoke — no servers required.
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyChangedStacks } from "../../scripts/lib/path-filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function run(cmd, args, { cwd = ROOT } = {}) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const stacks = classifyChangedStacks(["next-forge/apps/app/page.tsx"]);
if (!stacks.forge) {
  console.error("path-filter smoke failed");
  process.exit(1);
}

run("node", ["scripts/generate-mprocs-config.mjs"]);
run("node", ["scripts/agent-status.mjs", "--ci"]);
run("node", ["scripts/km-bootstrap-smoke.mjs"]);
run("node", ["scripts/validate-launch-json.mjs", "--require-manifest-sync"]);

const mprocs = spawnSync(process.execPath, ["scripts/generate-mprocs-config.mjs", "--stdout"], {
  cwd: ROOT,
  encoding: "utf8",
});
if (mprocs.status !== 0 || !mprocs.stdout?.includes("km_bootstrap")) {
  console.error("worktree-smoke: mprocs missing km_bootstrap");
  process.exit(1);
}
if (!/km_bootstrap:[\s\S]*?autostart: true/.test(mprocs.stdout)) {
  console.error("worktree-smoke: km_bootstrap must have autostart: true");
  process.exit(1);
}

// Prefer npx vitest — root yarn may lack node_modules in worktrees
const wiringVitest = spawnSync(
  "npx",
  [
    "--yes",
    "vitest",
    "run",
    "scripts/__tests__/km-startup-wiring.test.mjs",
    "--config",
    "vitest.config.mjs",
  ],
  { cwd: ROOT, encoding: "utf8", shell: true }
);
if (wiringVitest.status !== 0) {
  console.error(wiringVitest.stdout || wiringVitest.stderr);
  process.exit(wiringVitest.status ?? 1);
}

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
