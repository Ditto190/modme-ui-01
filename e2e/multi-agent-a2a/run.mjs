#!/usr/bin/env node
/**
 * Multi-agent A2A smoke — catalog validate + beads BFS dry-run.
 * No servers or beads DB required (bd failure is advisory).
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  return r.stdout ?? "";
}

function parseJson(stdout) {
  const trimmed = stdout.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) {
    console.error("multi-agent-a2a: expected JSON output");
    process.exit(1);
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

const catalogOut = run("node", ["scripts/lean-ctx-agent-catalog.mjs", "validate"]);
const catalog = parseJson(catalogOut);
if (!catalog.ok) {
  console.error("multi-agent-a2a: catalog validate failed", catalog);
  process.exit(1);
}

const resolveOut = run("node", [
  "scripts/lean-ctx-agent-catalog.mjs",
  "resolve",
  "--intent",
  "orchestration beads dispatch",
]);
const resolved = parseJson(resolveOut);
if (resolved.role !== "orchestrator") {
  console.error("multi-agent-a2a: expected orchestrator role, got", resolved.role);
  process.exit(1);
}

const bfsOut = run("node", ["scripts/beads-bfs-dispatch.mjs", "--dry-run"]);
const plan = parseJson(bfsOut);
if (!Array.isArray(plan.layers)) {
  console.error("multi-agent-a2a: invalid BFS plan");
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    agents: catalog.agents,
    role: resolved.role,
    bfs_layers: plan.layers.length,
    issue_count: plan.issue_count,
  })
);
console.log("multi-agent-a2a: ok");
