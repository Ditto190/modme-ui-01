#!/usr/bin/env node
/**
 * @feature INBOX.PIPELINE.ORCHESTRATE
 * Quality-gated intake pipeline orchestrator.
 *
 * Usage:
 *   node scripts/intake-orchestrator.mjs --mode=session|ci|pr-validate|staging-dry-run|scrape|code-index|full [--dry-run] [--skip-fix] [--lean-ctx-index] [--lean-ctx-index]
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beadsCreate, beadsUpdate } from "./lib/beads-hooks.mjs";
import { loadRootEnv } from "./lib/load-root-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="));
const MODE = modeArg ? modeArg.split("=")[1] : "session";
const DRY_RUN = args.includes("--dry-run");
const SKIP_FIX = args.includes("--skip-fix");
const LEAN_CTX_INDEX = args.includes("--lean-ctx-index");

function runNode(script, scriptArgs = []) {
  const result = spawnSync(process.execPath, [resolve(ROOT, script), ...scriptArgs], {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

async function runStep(label, script, scriptArgs = []) {
  return runStepWithPipeline(label, "inbox", MODE, script, scriptArgs);
}

async function runStepWithPipeline(label, pipeline, mode, script, scriptArgs = []) {
  const bridge = await import("./telemetry/lib/telemetry-bridge.mjs");
  const started = Date.now();
  const run = await bridge.openPipelineRun({
    pipeline,
    mode,
    triggerSource: "intake-orchestrator",
    metadata: { label },
    dryRun: DRY_RUN,
  });

  console.log(`\n== ${label} ==`);
  const code = runNode(script, scriptArgs);

  await bridge.closePipelineRun({
    pipelineRunId: run.id,
    status: code === 0 ? "completed" : "failed",
    stats: { duration_ms: Date.now() - started, label },
    errorMessage: code !== 0 ? `${label} exit ${code}` : null,
    dryRun: DRY_RUN,
  });

  if (code !== 0) {
    console.error(`intake-orchestrator: ${label} failed (exit ${code})`);
    process.exit(code);
  }
}

async function main() {
  loadRootEnv({ fileWins: true });

  let pipelineRunId = null;
  let closePipelineRun = null;
  try {
    const bridge = await import("./telemetry/lib/telemetry-bridge.mjs");
    const run = await bridge.openPipelineRun({
      pipeline: "inbox",
      mode: MODE,
      triggerSource: "intake-orchestrator",
      dryRun: DRY_RUN,
    });
    pipelineRunId = run.id;
    closePipelineRun = bridge.closePipelineRun;
  } catch (bridgeErr) {
    console.warn(
      "intake-orchestrator: pipeline_run open advisory:",
      bridgeErr instanceof Error ? bridgeErr.message : bridgeErr
    );
  }

  const auditLens =
    MODE === "pr-validate" ? "funnel" : MODE === "staging-dry-run" ? "all" : "funnel";
  const auditStrict = MODE === "pr-validate" || MODE === "ci";

  if (MODE !== "code-index") {
    await runStepWithPipeline("Audit funnel", "inbox", `${MODE}-audit`, "scripts/inbox-audit.mjs", [
      "--lens",
      auditLens === "all" ? "all" : "funnel",
      ...(auditStrict ? ["--strict"] : []),
    ]);
  }

  if (!SKIP_FIX && MODE !== "pr-validate" && MODE !== "code-index") {
    await runStepWithPipeline(
      "Fix (dry-run preview)",
      "inbox",
      `${MODE}-fix`,
      "scripts/inbox-fix.mjs",
      ["--dry-run", "--from-report"]
    );
  }

  if (MODE === "pr-validate") {
    console.log("\nintake-orchestrator: pr-validate complete (no writes)");
    if (closePipelineRun) {
      await closePipelineRun({
        pipelineRunId,
        status: "completed",
        stats: { mode: MODE },
        dryRun: DRY_RUN,
      });
    }
    process.exit(0);
  }

  if (MODE === "scrape" || MODE === "full") {
    await beadsCreate(`intake:${MODE}`, { priority: 2 });
    const manifestArg = args.find((a) => a.startsWith("--manifest="));
    const manifest = manifestArg ? manifestArg.split("=")[1] : "docs-sitemap";
    const engineArg = args.find((a) => a.startsWith("--engine="));
    const scrapeArgs = [
      `--manifest=${manifest}`,
      ...(DRY_RUN ? ["--dry-run"] : []),
      ...(engineArg ? [engineArg] : []),
    ];
    await runStep("Scrape orchestrator", "scripts/scrape-orchestrator.mjs", scrapeArgs);
  }

  if (MODE === "code-index" || MODE === "full") {
    const codeArgs = [...(DRY_RUN ? ["--dry-run"] : []), "--promote"];
    await runStep("Code AST index", "scripts/code-index-orchestrator.mjs", codeArgs);
  }

  if (LEAN_CTX_INDEX || MODE === "full") {
    const indexArgs = [...(DRY_RUN ? ["--dry-run"] : [])];
    await runStep("lean-ctx universal index", "scripts/lean-ctx-universal-intake.mjs", indexArgs);
  }

  if (MODE === "code-index") {
    await beadsUpdate(`intake:${MODE}`, "done");
    console.log("\nintake-orchestrator: code-index complete");
    if (closePipelineRun) {
      await closePipelineRun({
        pipelineRunId,
        status: "completed",
        stats: { mode: MODE },
        dryRun: DRY_RUN,
      });
    }
    process.exit(0);
  }

  const ingestArgs = DRY_RUN || MODE === "staging-dry-run" ? ["--dry-run"] : [];
  await runStep("Ingest", "scripts/inbox-ingest.mjs", ingestArgs);

  if (MODE === "staging-dry-run") {
    console.log("\nintake-orchestrator: staging dry-run complete");
    if (closePipelineRun) {
      await closePipelineRun({
        pipelineRunId,
        status: "completed",
        stats: { mode: MODE },
        dryRun: DRY_RUN,
      });
    }
    process.exit(0);
  }

  if (!DRY_RUN && (MODE === "session" || MODE === "ci" || MODE === "full")) {
    await runStep("Embeddings", "scripts/inbox-embeddings.mjs", []);
    await runStep("MDA categorize", "scripts/mda-categorize.mjs", []);
    await runStep("Audit pipeline", "scripts/inbox-audit.mjs", ["--lens", "pipeline"]);
  }

  if (LEAN_CTX_INDEX && MODE !== "pr-validate" && MODE !== "code-index") {
    await runStep(
      "Lean-ctx universal index",
      "scripts/lean-ctx-universal-intake.mjs",
      DRY_RUN ? ["--dry-run"] : []
    );
  }

  if (MODE === "full") {
    await beadsUpdate("intake:full", "done");
  }

  console.log("\nintake-orchestrator: complete");

  if (closePipelineRun) {
    await closePipelineRun({
      pipelineRunId,
      status: "completed",
      stats: { mode: MODE, dry_run: DRY_RUN },
      dryRun: DRY_RUN,
    });
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
