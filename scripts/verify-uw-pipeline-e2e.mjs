#!/usr/bin/env node
/**
 * E2E smoke: UW non-migrate pattern catalogue → validate → index (dry-run) → ingest (dry-run).
 * Optional --live: probe Supabase and run live ingest + ast-only promote when reachable.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRootEnv } from "./lib/load-root-env.mjs";
import { debugLog, memorySnapshot } from "./lib/debug-ndjson.mjs";
import { probeSupabaseReachable } from "./lib/supabase-connectivity.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LIVE = process.argv.includes("--live");
const UW_NOTE =
  "GenerativeUI_monorepo/docs/inbox/2026-07-11T07-00-00_architecture_architect_uw-non-migrate-pattern-catalogue.md";

function run(cmd, args, label) {
  // #region agent log
  debugLog({
    location: "verify-uw-pipeline-e2e.mjs:run",
    message: "spawn step",
    data: { label, cmd, argCount: args.length, memory: memorySnapshot("spawn") },
    hypothesisId: "H2",
  });
  // #endregion
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
  const out = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0) {
    console.error(`FAIL ${label}\n${out}`);
    process.exit(result.status ?? 1);
  }
  console.log(`OK ${label}`);
  return out;
}

async function probeSupabase() {
  const result = await probeSupabaseReachable({ loadEnv: false });
  return result.ok;
}

console.log("== UW pattern pipeline E2E (local) ==\n");
// #region agent log
debugLog({
  location: "verify-uw-pipeline-e2e.mjs",
  message: "e2e start",
  data: { live: LIVE, memory: memorySnapshot("e2e-start") },
  hypothesisId: "H2",
});
// #endregion

run("node", [join(ROOT, "scripts/verify-uw-patterns.mjs")], "pattern:uw");
run(
  "node",
  ["--test", join(ROOT, "scripts/__tests__/pattern-coverage.test.mjs")],
  "pattern:coverage"
);
run("node", [join(ROOT, "scripts/inbox-audit.mjs"), "--lens", "funnel"], "inbox:audit:funnel");

if (!existsSync(join(ROOT, UW_NOTE))) {
  console.error(`FAIL inbox note missing: ${UW_NOTE}`);
  process.exit(1);
}
const noteBody = readFileSync(join(ROOT, UW_NOTE), "utf8");
if (!noteBody.includes("uw-archive") || !noteBody.includes("non-migrate")) {
  console.error("FAIL inbox note missing uw-archive / non-migrate tags in body");
  process.exit(1);
}
console.log("OK inbox catalogue note present");

run("node", [join(ROOT, "scripts/run-intake.mjs"), "--dry-run"], "intake dry-run");

run(
  "node",
  [
    join(ROOT, "scripts/code-index-orchestrator.mjs"),
    "--root",
    "GenerativeUI_monorepo/UniversalWorkbench/.flow",
    "--dry-run",
    "--promote",
  ],
  "code-index .flow dry-run"
);

run(
  "node",
  [
    join(ROOT, "scripts/code-index-orchestrator.mjs"),
    "--root",
    "GenerativeUI_monorepo/UniversalWorkbench/apps/agent/src/tools",
    "--dry-run",
    "--promote",
  ],
  "code-index tools dry-run"
);

if (LIVE) {
  console.log("\n== LIVE (Supabase probe) ==");
  const reachable = await probeSupabase();
  if (!reachable) {
    console.warn("SKIP live ingest/promote — Supabase unreachable from this host");
    console.log("\nUW pattern pipeline E2E: local gates PASS, live SKIPPED");
    process.exit(0);
  }
  run("node", [join(ROOT, "scripts/run-intake.mjs")], "intake live");
  run(
    "node",
    [
      join(ROOT, "scripts/code-index-orchestrator.mjs"),
      "--root",
      "GenerativeUI_monorepo/UniversalWorkbench/apps/agent/src/tools",
      "--ast-only",
      "--promote",
    ],
    "code-index tools ast-only promote"
  );
  run("node", [join(ROOT, "scripts/inbox-audit.mjs"), "--lens", "all"], "inbox:audit:all");
}

console.log("\nUW pattern pipeline E2E: PASS");
