#!/usr/bin/env node
/**
 * Universal lean-ctx intake — ctx_index corpus + knowledge export.
 * Usage: node scripts/lean-ctx-universal-intake.mjs [--dry-run] [--skip-audit] [--full]
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_AUDIT = args.includes("--skip-audit");
const FULL = args.includes("--full");

const CORPUS_PATHS = [
  "GenerativeUI_monorepo/docs/inbox",
  "docs/inbox-pipeline",
  "docs/handover",
  ".agents/skills",
  "prompts",
  "scripts/collections",
];

function runNode(script, scriptArgs = []) {
  const result = spawnSync(process.execPath, [resolve(ROOT, script), ...scriptArgs], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return result.status ?? 1;
}

function runLeanCtx(argsList, label) {
  if (DRY_RUN) {
    console.log(`[dry-run] lean-ctx ${argsList.join(" ")} (${label})`);
    return 0;
  }
  try {
    execSync(`lean-ctx ${argsList.join(" ")}`, {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    return 0;
  } catch (err) {
    console.warn(`lean-ctx-universal-intake: ${label} skipped (advisory):`, err.message ?? err);
    return 0;
  }
}

function corpusExists() {
  return CORPUS_PATHS.some((p) => existsSync(resolve(ROOT, p)));
}

function main() {
  console.log("lean-ctx-universal-intake:", { dryRun: DRY_RUN, full: FULL, skipAudit: SKIP_AUDIT });

  if (!corpusExists()) {
    console.warn("lean-ctx-universal-intake: no corpus paths found — skipped");
    process.exit(0);
  }

  if (!SKIP_AUDIT) {
    const auditCode = runNode("scripts/inbox-audit.mjs", ["--lens", "funnel"]);
    if (auditCode !== 0) {
      console.error("lean-ctx-universal-intake: inbox audit failed");
      process.exit(auditCode);
    }
  }

  runLeanCtx(["index", "build"], "index build");
  if (FULL) {
    runLeanCtx(["index", "build-full"], "index build-full");
  }

  if (!DRY_RUN) {
    runNode("scripts/run-lean-ctx-intake.mjs", FULL ? ["--full"] : []);
  } else {
    console.log("[dry-run] would export knowledge via run-lean-ctx-intake.mjs");
  }

  console.log("\nlean-ctx-universal-intake: complete");
  console.log("Corpus paths:", CORPUS_PATHS.join(", "));
}

main();
