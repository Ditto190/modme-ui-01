#!/usr/bin/env node
/**
 * Agent evaluation report — collects session-logger + optional agenttrace,
 * emits JSON (default) or static HTML report.
 *
 * Agent-Friendly CLI (ai-native-cli Phase 1):
 *   - Default stdout = JSON
 *   - Errors to stderr as structured JSON
 *   - Exit 0 success, 1 general, 2 usage
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LOGS_DIR = join(ROOT, "logs", "copilot");
const SESSION_LOG = join(LOGS_DIR, "session.log");
const PROMPTS_LOG = join(LOGS_DIR, "prompts.log");
const EVAL_JSONL = join(ROOT, "logs", "eval", "eval-events.jsonl");

const args = process.argv.slice(2);
const HUMAN = args.includes("--human");
const DRY_RUN = args.includes("--dry-run");
const SINCE =
  args.find((a) => a.startsWith("--since="))?.split("=")[1] ?? "7d";
const OUTPUT = args.find((a) => a.startsWith("--output="))?.split("=")[1];
const AGENTTRACE = args.find((a) => a.startsWith("--agenttrace="))?.split("=")[1];

function usageError(message, suggestion) {
  const payload = {
    error: true,
    code: "USAGE_ERROR",
    message,
    suggestion: suggestion ?? "node scripts/agent-eval-report.mjs [--since=7d] [--dry-run] [--human] [--output=reports/agent-eval/index.html]",
  };
  process.stderr.write(`${JSON.stringify(payload)}\n`);
  process.exit(2);
}

if (args.includes("--help")) {
  const help = {
    help: "Agent evaluation report — session-logger + behavioral insight",
    commands: [
      {
        name: "default",
        description: "Collect metrics and emit JSON report",
        flags: ["--since=7d", "--dry-run", "--human", "--output=<path>", "--agenttrace=<path>"],
      },
    ],
  };
  process.stdout.write(`${JSON.stringify(help, null, 2)}\n`);
  process.exit(0);
}

function parseSinceDays(since) {
  const m = /^(\d+)d$/.exec(since);
  if (!m) usageError(`Invalid --since=${since}`, "Use format like 7d or 30d");
  return Number(m[1]);
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

function filterSince(entries, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => {
    const ts = Date.parse(e.timestamp ?? "");
    return !Number.isNaN(ts) && ts >= cutoff;
  });
}

function loadCollectPayload() {
  if (!existsSync(EVAL_JSONL)) return null;
  const lines = readJsonLines(EVAL_JSONL);
  return lines.find((l) => l.type === "eval.collect") ?? null;
}

function buildReport({ sessions, prompts, sinceDays, collect }) {
  const sessionStarts = sessions.filter((e) => e.event === "sessionStart");
  const sessionEnds = sessions.filter((e) => e.event === "sessionEnd");
  const startedIds = new Set(sessionStarts.map((e) => e.id));
  const endedIds = new Set(sessionEnds.map((e) => e.id));
  const orphanEnds = [...endedIds].filter((id) => !startedIds.has(id)).length;
  const orphanStarts = [...startedIds].filter((id) => !endedIds.has(id)).length;

  return {
    generatedAt: new Date().toISOString(),
    windowDays: sinceDays,
    sources: {
      sessionLogger: existsSync(SESSION_LOG),
      promptsLogger: existsSync(PROMPTS_LOG),
      evalEvents: existsSync(EVAL_JSONL),
      agenttrace: AGENTTRACE ? existsSync(resolve(ROOT, AGENTTRACE)) : false,
    },
    metrics: {
      sessionsStarted: sessionStarts.length,
      sessionsEnded: sessionEnds.length,
      promptsLogged: prompts.length,
      orphanSessionStarts: orphanStarts,
      orphanSessionEnds: orphanEnds,
      totalSignals: collect?.totalSignals ?? 0,
      totalThemes: collect?.totalThemes ?? 0,
    },
    behavioral: {
      themes: collect?.themes ?? [],
      contracts: collect?.contracts ?? [],
      resume: collect?.resume ?? null,
    },
    popularity: {
      note: "Phase 4: merge local_usage + behavioral_score into catalogue_popularity_snapshots",
    },
  };
}

function renderHtml(report) {
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ModMe Agent Evaluation Report</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 960px; line-height: 1.5; }
    h1 { font-size: 1.5rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
    th { background: #f4f4f4; }
    .meta { color: #555; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Agent Evaluation Report</h1>
  <p class="meta">Generated ${esc(report.generatedAt)} · window ${report.windowDays}d</p>
  <h2>Session metrics</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Sessions started</td><td>${report.metrics.sessionsStarted}</td></tr>
    <tr><td>Sessions ended</td><td>${report.metrics.sessionsEnded}</td></tr>
    <tr><td>Prompts logged</td><td>${report.metrics.promptsLogged}</td></tr>
    <tr><td>Orphan starts (no end)</td><td>${report.metrics.orphanSessionStarts}</td></tr>
    <tr><td>Orphan ends (no start)</td><td>${report.metrics.orphanSessionEnds}</td></tr>
  </table>
  <h2>Behavioral themes</h2>
  <table>
    <tr><th>Theme</th><th>Signals</th><th>Max impact</th></tr>
    ${(report.behavioral.themes ?? [])
      .map(
        (t) =>
          `<tr><td>${esc(t.label ?? t.id)}</td><td>${t.signalCount ?? 0}</td><td>${esc(t.maxImpact ?? "")}</td></tr>`
      )
      .join("") || "<tr><td colspan=\"3\">No themes — run yarn eval:collect first</td></tr>"}
  </table>
  <script type="application/json" id="raw-data">${esc(JSON.stringify(report))}</script>
</body>
</html>`;
}

function main() {
  const sinceDays = parseSinceDays(SINCE);
  const sessions = filterSince(readJsonLines(SESSION_LOG), sinceDays);
  const prompts = filterSince(readJsonLines(PROMPTS_LOG), sinceDays);
  const collect = loadCollectPayload();
  const report = buildReport({ sessions, prompts, sinceDays, collect });

  if (DRY_RUN) {
    report.dryRun = true;
    report.wouldWrite = OUTPUT ?? null;
  }

  if (OUTPUT && !DRY_RUN) {
    const outPath = resolve(ROOT, OUTPUT);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, renderHtml(report), "utf8");
    report.outputPath = OUTPUT;
  }

  if (HUMAN) {
    process.stdout.write(
      `Agent eval (${sinceDays}d): ${report.metrics.sessionsStarted} sessions, ${report.metrics.promptsLogged} prompts\n`
    );
  } else {
    process.stdout.write(`${JSON.stringify({ result: report })}\n`);
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(
    `${JSON.stringify({
      error: true,
      code: "EVAL_FAILED",
      message: err instanceof Error ? err.message : String(err),
      suggestion: "Ensure logs/copilot/session.log exists or run session-logger start first",
    })}\n`
  );
  process.exit(1);
}
