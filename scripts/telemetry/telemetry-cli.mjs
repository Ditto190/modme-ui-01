#!/usr/bin/env node
/**
 * ai-native-cli telemetry tool — JSON default, structured stderr, exit 0/1/2
 *
 * Subcommands: sync | collect | report | ingest-copilot
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRootEnv } from "../lib/load-root-env.mjs";
import { detectAgentPlatform, SpanTaxonomy } from "./lib/agent-platform-adapters.mjs";
import {
  bridgeCollectPayload,
  closePipelineRun,
  openPipelineRun,
  registerObservabilityReportArtefact,
  resolveTenantId,
} from "./lib/telemetry-bridge.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const args = process.argv.slice(2);
const COMMAND = args[0];
const DRY_RUN = args.includes("--dry-run");
const HUMAN = args.includes("--human");
const SINCE = args.find((a) => a.startsWith("--since="))?.split("=")[1] ?? "7d";
const TENANT_ID = args.find((a) => a.startsWith("--tenant-id="))?.split("=")[1];
const OUTPUT = args.find((a) => a.startsWith("--output="))?.split("=")[1];

function fail(code, message, suggestion) {
  process.stderr.write(`${JSON.stringify({ error: true, code, message, suggestion })}\n`);
  process.exit(code === "USAGE" ? 2 : 1);
}

function emit(result, stats = {}) {
  const payload = { result, stats, pipeline_run_id: result.pipeline_run_id ?? null };
  if (HUMAN) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }
}

function readJsonLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function collectSessionEvents() {
  const sessionLog = join(ROOT, "logs", "copilot", "session.log");
  const promptsLog = join(ROOT, "logs", "copilot", "prompts.log");
  const events = [];

  for (const entry of readJsonLines(sessionLog)) {
    events.push({
      message: `session:${entry.event} ${entry.id ?? ""}`.trim(),
      source: "session-logger",
      level: entry.event === "sessionEnd" ? "info" : "debug",
      session_id: entry.id,
      metadata: { cwd: entry.cwd, trackedFiles: entry.trackedFiles },
    });
  }

  for (const entry of readJsonLines(promptsLog)) {
    events.push({
      message: String(entry.message ?? "").slice(0, 500),
      source: "session-logger-prompt",
      level: "info",
      session_id: entry.sessionId,
      metadata: { event: "prompt" },
    });
  }

  return events;
}

function collectOrchestratorErrors() {
  const errLog = join(ROOT, "logs", "agent-orchestrator", "errors.jsonl");
  return readJsonLines(errLog).map((e) => ({
    message: String(e.event ?? "orchestrator-error"),
    source: "agent-orchestrator",
    level: "error",
    session_id: e.session_id ?? null,
    severity: "high",
    metadata: e,
  }));
}

/**
 * Shared metadata injected on every lean-ctx event for session correlation.
 */
function leanCtxSharedMeta() {
  return {
    session_id: process.env.AGENT_SESSION_ID ?? process.env.CURSOR_SESSION_ID ?? null,
    worktree: process.env.WORKTREE_NAME ?? null,
    branch: process.env.GIT_BRANCH ?? null,
    agent_platform: process.env.AGENT_SESSION_ID
      ? "cursor-agent"
      : process.env.CURSOR_SESSION_ID
        ? "cursor-editor"
        : "unknown",
  };
}

function collectLeanCtxJournal() {
  const journalDir = join(process.env.LEAN_CTX_STATE_DIR ?? join(ROOT, "logs", "lean-ctx"));
  if (!existsSync(journalDir)) return [];
  const events = [];
  try {
    for (const file of readdirSync(journalDir)) {
      if (!file.startsWith("journal")) continue;
      const content = readFileSync(join(journalDir, file), "utf8");
      for (const line of content.split(/\r?\n/).filter(Boolean)) {
        let entry = {};
        try {
          entry = JSON.parse(line);
        } catch {
          entry = { raw: line.slice(0, 300) };
        }
        events.push({
          message: `lean-ctx:journal ${entry.event ?? entry.action ?? String(line).slice(0, 120)}`,
          source: "lean-ctx-journal",
          level: "debug",
          session_id: entry.session_id ?? leanCtxSharedMeta().session_id,
          metadata: { ...leanCtxSharedMeta(), file, ...entry },
        });
      }
    }
  } catch {
    /* directory may be empty */
  }
  return events;
}

function collectLeanCtxTee() {
  const teeDir = join(process.env.LEAN_CTX_STATE_DIR ?? join(ROOT, "logs", "lean-ctx"), "tee");
  if (!existsSync(teeDir)) return [];
  const events = [];
  try {
    for (const file of readdirSync(teeDir)) {
      const filePath = join(teeDir, file);
      let content = "";
      try {
        content = readFileSync(filePath, "utf8").slice(0, 2000);
      } catch {
        continue;
      }
      events.push({
        message: `lean-ctx:tee failure captured: ${basename(file)}`,
        source: "lean-ctx-tee",
        level: "error",
        severity: "medium",
        session_id: leanCtxSharedMeta().session_id,
        metadata: { ...leanCtxSharedMeta(), file, snippet: content.slice(0, 500) },
      });
    }
  } catch {
    /* directory may be empty */
  }
  return events;
}

function collectLeanCtxMarkers() {
  const markerPath = join(ROOT, ".cursor", "hooks", "state", "lean-ctx-session-markers.jsonl");
  if (!existsSync(markerPath)) return [];
  const events = [];
  for (const entry of readJsonLines(markerPath)) {
    events.push({
      message: `lean-ctx:marker ${entry.event ?? "unknown"}`,
      source: "lean-ctx-marker",
      level: "info",
      session_id: entry.session_id ?? leanCtxSharedMeta().session_id,
      metadata: { ...leanCtxSharedMeta(), ...entry },
    });
  }
  return events;
}

function collectLeanCtxArchive() {
  const archiveDir = join(
    process.env.LEAN_CTX_DATA_DIR ?? join(ROOT, "data", "lean-ctx"),
    "archive"
  );
  if (!existsSync(archiveDir)) return [];
  const events = [];
  try {
    const files = readdirSync(archiveDir).slice(0, 50); // cap at 50 reference IDs
    for (const file of files) {
      const filePath = join(archiveDir, file);
      let stat;
      try {
        stat = statSync(filePath);
      } catch {
        continue;
      }
      events.push({
        message: `lean-ctx:archive ref ${file}`,
        source: "lean-ctx-archive",
        level: "debug",
        session_id: leanCtxSharedMeta().session_id,
        metadata: { ...leanCtxSharedMeta(), ref_id: file, size_bytes: stat.size },
      });
    }
  } catch {
    /* directory may be empty */
  }
  return events;
}

function collectTestResultEvents() {
  const dir = join(ROOT, "test-results");
  if (!existsSync(dir)) return [];
  const events = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const data = JSON.parse(readFileSync(join(dir, file), "utf8"));
      events.push({
        message: `test-result:${file}`,
        source: "test-results",
        level: data.status === "failed" ? "error" : "info",
        severity: data.status === "failed" ? "high" : "low",
        metadata: data,
      });
    } catch {
      // skip invalid
    }
  }
  return events;
}

async function cmdSync() {
  const started = Date.now();
  const run = await openPipelineRun({
    tenantId: TENANT_ID,
    pipeline: "telemetry",
    mode: "sync",
    triggerSource: "telemetry-cli",
    dryRun: DRY_RUN,
  });

  const events = [
    ...collectSessionEvents(),
    ...collectOrchestratorErrors(),
    ...collectTestResultEvents(),
    ...collectLeanCtxJournal(),
    ...collectLeanCtxTee(),
    ...collectLeanCtxMarkers(),
    ...collectLeanCtxArchive(),
  ];

  const bridge = await bridgeCollectPayload({
    events,
    tenantId: TENANT_ID,
    pipelineRunId: run.id,
    dryRun: DRY_RUN,
  });

  const stats = {
    ...bridge.stats,
    duration_ms: Date.now() - started,
    events_collected: events.length,
    since: SINCE,
    dry_run: DRY_RUN,
  };

  await closePipelineRun({
    pipelineRunId: run.id,
    status: "completed",
    stats,
    dryRun: DRY_RUN,
  });

  emit(
    {
      command: "sync",
      tenant_id: resolveTenantId(TENANT_ID),
      pipeline_run_id: run.id,
      dry_run: DRY_RUN,
    },
    stats
  );
}

async function cmdCollect() {
  const collectArgs = ["--since", SINCE];
  if (DRY_RUN) collectArgs.push("--dry-run");

  const proc = spawnSync(
    process.execPath,
    [resolve(ROOT, "scripts/agent-eval-collect.mjs"), ...collectArgs],
    { cwd: ROOT, encoding: "utf8" }
  );

  if (proc.status !== 0) {
    fail(
      "COLLECT_FAILED",
      proc.stderr || "agent-eval-collect failed",
      "Check logs/copilot/session.log"
    );
  }

  let collectPayload = {};
  try {
    const line = proc.stdout.trim().split("\n").pop();
    collectPayload = JSON.parse(line).result ?? {};
  } catch {
    collectPayload = {};
  }

  const run = await openPipelineRun({
    tenantId: TENANT_ID,
    pipeline: "agent-eval",
    mode: "collect",
    dryRun: DRY_RUN,
  });

  const bridge = await bridgeCollectPayload({
    themes: collectPayload.themes ?? [],
    signals: collectPayload.signals ?? [],
    events: (collectPayload.signals ?? []).map((s) => ({
      message: s.title,
      source: s.source,
      level: s.impact === "high" ? "warn" : "info",
      session_id: s.sessionId,
      severity: s.impact === "high" ? "high" : "medium",
      metadata: { themes: s.themes },
    })),
    tenantId: TENANT_ID,
    pipelineRunId: run.id,
    dryRun: DRY_RUN,
  });

  const stats = {
    ...bridge.stats,
    signals: collectPayload.totalSignals ?? 0,
    themes: collectPayload.totalThemes ?? 0,
    dry_run: DRY_RUN,
  };

  await closePipelineRun({
    pipelineRunId: run.id,
    status: "completed",
    stats,
    dryRun: DRY_RUN,
  });

  emit(
    {
      command: "collect",
      pipeline_run_id: run.id,
      collect: collectPayload,
      dry_run: DRY_RUN,
    },
    stats
  );
}

async function cmdReport() {
  const reportArgs = [];
  if (DRY_RUN) reportArgs.push("--dry-run");
  if (OUTPUT) reportArgs.push("--output", OUTPUT);

  const proc = spawnSync(
    process.execPath,
    [resolve(ROOT, "scripts/agent-eval-report.mjs"), ...reportArgs],
    { cwd: ROOT, encoding: "utf8" }
  );

  if (proc.status !== 0) {
    fail("REPORT_FAILED", proc.stderr || "agent-eval-report failed", "Run eval:collect first");
  }

  let reportResult = {};
  try {
    reportResult = JSON.parse(proc.stdout.trim().split("\n").pop()).result ?? {};
  } catch {
    reportResult = { raw: proc.stdout };
  }

  emit({ command: "report", dry_run: DRY_RUN, ...reportResult }, { dry_run: DRY_RUN });

  if (OUTPUT && !DRY_RUN) {
    await registerObservabilityReportArtefact({
      outputPath: OUTPUT,
      dryRun: DRY_RUN,
    });
  }
}

async function cmdIngestCopilot() {
  const pyArgs = [];
  if (DRY_RUN) pyArgs.push("--dry-run");
  else pyArgs.push("--live");
  if (TENANT_ID) pyArgs.push("--tenant-id", TENANT_ID);

  const proc = spawnSync(
    "python",
    [resolve(ROOT, "GenerativeUI_monorepo/intake-pipeline/orchestrator.py"), ...pyArgs],
    { cwd: ROOT, encoding: "utf8" }
  );

  if (proc.status !== 0) {
    fail(
      "INGEST_COPILOT_FAILED",
      proc.stderr || proc.stdout || "orchestrator.py failed",
      "Ensure Python deps for GenerativeUI intake-pipeline"
    );
  }

  let copilotResult = {};
  try {
    const lines = proc.stdout.trim().split("\n").filter(Boolean);
    copilotResult = JSON.parse(lines[lines.length - 1]).result ?? {};
  } catch {
    copilotResult = { raw: proc.stdout?.slice(0, 2000) };
  }

  emit(
    {
      command: "ingest-copilot",
      dry_run: DRY_RUN,
      tenant_id: resolveTenantId(TENANT_ID),
      ...copilotResult,
    },
    { exit_code: proc.status }
  );
}

/**
 * Main command: collect all lean-ctx sources and promote to telemetry pipeline.
 * Collector helpers (collectLeanCtxJournal/Tee/Markers/Archive) are defined
 * earlier in the file and also called from cmdSync().
 */
async function cmdLeanCtxCollect() {
  const started = Date.now();
  const platform = detectAgentPlatform();

  const run = await openPipelineRun({
    tenantId: TENANT_ID,
    pipeline: "lean-ctx",
    mode: "collect",
    triggerSource: "telemetry-cli-lean-ctx",
    metadata: { agent_platform: platform.agent_platform },
    dryRun: DRY_RUN,
  });

  const events = [
    ...collectLeanCtxJournal(),
    ...collectLeanCtxTee(),
    ...collectLeanCtxMarkers(),
    ...collectLeanCtxArchive(),
  ];

  const platformEvent = {
    message: `lean-ctx-collect:platform-detected:${platform.agent_platform}`,
    source: "lean-ctx-collect",
    level: "info",
    session_id: process.env.AGENT_SESSION_ID ?? null,
    metadata: {
      agent_platform: platform.agent_platform,
      otel_resource: platform.otel_resource,
      otel_span: SpanTaxonomy.telemetrySync(run.id, events.length),
    },
  };
  events.push(platformEvent);

  const bridge = await bridgeCollectPayload({
    events,
    tenantId: TENANT_ID,
    pipelineRunId: run.id,
    dryRun: DRY_RUN,
  });

  const stats = {
    ...bridge.stats,
    duration_ms: Date.now() - started,
    lean_ctx_events: events.length,
    agent_platform: platform.agent_platform,
    dry_run: DRY_RUN,
  };

  await closePipelineRun({
    pipelineRunId: run.id,
    status: "completed",
    stats,
    dryRun: DRY_RUN,
  });

  emit(
    {
      command: "lean-ctx-collect",
      tenant_id: resolveTenantId(TENANT_ID),
      pipeline_run_id: run.id,
      agent_platform: platform.agent_platform,
      dry_run: DRY_RUN,
    },
    stats
  );
}

function printUsage() {
  fail(
    "USAGE",
    "Usage: telemetry-cli.mjs <sync|collect|report|ingest-copilot|lean-ctx-collect> [--dry-run] [--human] [--since=7d] [--tenant-id=] [--output=path]",
    "Example: node scripts/telemetry/telemetry-cli.mjs sync --dry-run"
  );
}

async function main() {
  loadRootEnv({ fileWins: true });

  if (!COMMAND || args.includes("--help") || args.includes("-h")) {
    printUsage();
  }

  switch (COMMAND) {
    case "sync":
      await cmdSync();
      break;
    case "collect":
      await cmdCollect();
      break;
    case "report":
      await cmdReport();
      break;
    case "ingest-copilot":
      await cmdIngestCopilot();
      break;
    case "lean-ctx-collect":
      await cmdLeanCtxCollect();
      break;
    default:
      printUsage();
  }
}

main().catch((err) => {
  fail(
    "RUNTIME",
    err instanceof Error ? err.message : String(err),
    "Check DEV_TENANT_ID and Supabase env"
  );
});
