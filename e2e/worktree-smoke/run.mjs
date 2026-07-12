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

const status = spawnSync("node", ["scripts/agent-status.mjs", "--json"], {
  cwd: ROOT,
  encoding: "utf8",
});
if (status.status !== 0) {
  console.error(status.stderr || status.stdout);
  process.exit(status.status ?? 1);
}
try {
  const payload = JSON.parse(status.stdout);
  if (!payload.repoRoot || !Array.isArray(payload.worktrees)) {
    console.error("agent-status JSON schema smoke failed");
    process.exit(1);
  }
} catch {
  console.error("agent-status JSON parse failed");
  process.exit(1);
}

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
  { cwd: ROOT, encoding: "utf8" },
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
