#!/usr/bin/env node
/**
 * Normalize session-logger + prompts into eval-events.jsonl.
 * Derive friction signals + theme groups (feedback-themes pattern).
 * Emit where-was-i-style resume packet when orphan sessions detected.
 *
 * Agent-Friendly: JSON stdout, structured stderr, exit 0/1/2
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LOGS_DIR = join(ROOT, "logs", "copilot");
const EVAL_DIR = join(ROOT, "logs", "eval");
const SESSION_LOG = join(LOGS_DIR, "session.log");
const PROMPTS_LOG = join(LOGS_DIR, "prompts.log");
const THEMES_PATH = join(ROOT, "docs", "evaluation", "contracts", "themes.json");
const OUT_JSONL = join(EVAL_DIR, "eval-events.jsonl");
const RESUME_PATH = join(ROOT, "reports", "agent-eval", "resume.json");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SINCE = args.find((a) => a.startsWith("--since="))?.split("=")[1] ?? "7d";
const AGENTTRACE_PATH = args.find((a) => a.startsWith("--agenttrace="))?.split("=")[1];
const EVENTS_LOG = join(LOGS_DIR, "events.log");
const MARKERS_PATH = join(ROOT, ".cursor", "hooks", "state", "lean-ctx-session-markers.jsonl");
const TRACE_STATE = join(ROOT, ".cursor", "hooks", "state", "agenttrace-latest.json");

function fail(code, message, suggestion) {
  process.stderr.write(
    `${JSON.stringify({ error: true, code, message, suggestion })}\n`
  );
  process.exit(code === "USAGE" ? 2 : 1);
}

function parseSinceDays(since) {
  const m = /^(\d+)d$/.exec(since);
  if (!m) fail("USAGE", `Invalid --since=${since}`, "Use 7d or 30d");
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

function loadAgenttraceSnapshot(path) {
  const resolved = path ?? (existsSync(TRACE_STATE) ? TRACE_STATE : null);
  if (!resolved || !existsSync(resolved)) return null;
  try {
    return JSON.parse(readFileSync(resolved, "utf8"));
  } catch {
    return { raw: readFileSync(resolved, "utf8").slice(0, 4000) };
  }
}

function loadHookMarkers() {
  return readJsonLines(MARKERS_PATH);
}

function clusterPromptThemes(prompts) {
  /** Lightweight keyword buckets — Phase 5 defers Gemma3n batch embeddings to nightly jobs. */
  const buckets = new Map();
  for (const p of prompts) {
    const msg = (p.message ?? "").toLowerCase();
    const keys = [];
    if (/hook|lean-ctx|session/i.test(msg)) keys.push("observability");
    if (/supabase|prisma|database/i.test(msg)) keys.push("data");
    if (/worktree|git|branch/i.test(msg)) keys.push("git-workflow");
    if (/test|verify|ci/i.test(msg)) keys.push("quality");
    if (keys.length === 0) keys.push("general");
    for (const k of keys) {
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
  }
  return [...buckets.entries()]
    .map(([id, count]) => ({ id, count, method: "keyword-cluster" }))
    .sort((a, b) => b.count - a.count);
}

function loadThemes() {
  if (!existsSync(THEMES_PATH)) return { themes: [] };
  return JSON.parse(readFileSync(THEMES_PATH, "utf8"));
}

function matchThemes(text, themes) {
  const lower = text.toLowerCase();
  const matched = [];
  for (const theme of themes) {
    const needles = [theme.id, theme.label, ...(theme.aliases ?? [])].map((s) =>
      String(s).toLowerCase()
    );
    if (needles.some((n) => lower.includes(n))) matched.push(theme.id);
  }
  return [...new Set(matched)];
}

function inferSignals(sessions, prompts, themes) {
  const signals = [];
  let sigIdx = 0;

  for (const p of prompts) {
    const msg = p.message ?? "";
    const themeIds = matchThemes(msg, themes);
    for (const themeId of themeIds) {
      signals.push({
        id: `sig-${++sigIdx}`,
        source: "session-logger-prompt",
        title: `Prompt matched theme ${themeId}`,
        description: msg.slice(0, 280),
        impact: /critical|don't|never|must not/i.test(msg) ? "high" : "medium",
        themes: [themeId],
        sessionId: p.sessionId,
        createdAt: p.timestamp,
      });
    }
  }

  const starts = sessions.filter((e) => e.event === "sessionStart");
  const ends = sessions.filter((e) => e.event === "sessionEnd");
  const startedIds = new Set(starts.map((e) => e.id));
  const endedIds = new Set(ends.map((e) => e.id));

  for (const id of startedIds) {
    if (!endedIds.has(id)) {
      signals.push({
        id: `sig-${++sigIdx}`,
        source: "session-logger",
        title: "Orphan session (no sessionEnd)",
        description: `Session ${id} started but never ended — where-was-i candidate`,
        impact: "medium",
        themes: ["session-continuity"],
        sessionId: id,
        createdAt: starts.find((s) => s.id === id)?.timestamp,
      });
    }
  }

  return signals;
}

function computeThemeGroups(signals, themeDefs) {
  const impactOrder = { high: 3, medium: 2, low: 1 };
  return themeDefs
    .map((theme) => {
      const themed = signals.filter((s) => s.themes?.includes(theme.id));
      const maxImpact = themed.reduce(
        (max, s) =>
          impactOrder[s.impact] > impactOrder[max] ? s.impact : max,
        "low"
      );
      const sources = [...new Set(themed.map((s) => s.source))];
      return {
        ...theme,
        signalCount: themed.length,
        maxImpact,
        sources,
        signals: themed,
      };
    })
    .filter((t) => t.signalCount > 0)
    .sort((a, b) => {
      if (impactOrder[b.maxImpact] !== impactOrder[a.maxImpact]) {
        return impactOrder[b.maxImpact] - impactOrder[a.maxImpact];
      }
      return b.signalCount - a.signalCount;
    });
}

function buildResumePacket(sessions, prompts) {
  const orphanStarts = sessions.filter(
    (e) =>
      e.event === "sessionStart" &&
      !sessions.some((x) => x.event === "sessionEnd" && x.id === e.id)
  );
  if (orphanStarts.length === 0) return null;

  const latest = orphanStarts[orphanStarts.length - 1];
  const sessionPrompts = prompts.filter((p) => p.sessionId === latest.id);

  return {
    gatheredAt: new Date().toISOString(),
    pattern: "where-was-i",
    sessionId: latest.id,
    cwd: latest.cwd,
    trackedFiles: latest.trackedFiles ?? [],
    recentPrompts: sessionPrompts.slice(-5).map((p) => p.message?.slice(0, 200)),
    note: "Resume packet for interrupted agent session",
  };
}

function stubContractResults() {
  return [
    {
      contract: "modme-agent-core",
      ruleId: "verify-before-done",
      passed: null,
      severity: "high",
      note: "Phase 2: wire transcript + git replay detectors",
    },
  ];
}

function main() {
  const sinceDays = parseSinceDays(SINCE);
  const sessions = filterSince(readJsonLines(SESSION_LOG), sinceDays);
  const prompts = filterSince(readJsonLines(PROMPTS_LOG), sinceDays);
  const events = filterSince(readJsonLines(EVENTS_LOG), sinceDays);
  const markers = loadHookMarkers();
  const agenttrace = loadAgenttraceSnapshot(AGENTTRACE_PATH);
  const promptClusters = clusterPromptThemes(prompts);
  const { themes: themeDefs } = loadThemes();

  const signals = inferSignals(sessions, prompts, themeDefs);
  const themeGroups = computeThemeGroups(signals, themeDefs);
  const resume = buildResumePacket(sessions, prompts);

  const payload = {
    collectedAt: new Date().toISOString(),
    windowDays: sinceDays,
    sessions: sessions.length,
    prompts: prompts.length,
    events: events.length,
    markers: markers.length,
    promptClusters,
    agenttrace: agenttrace ? { present: true } : { present: false },
    signals,
    themes: themeGroups,
    totalSignals: signals.length,
    totalThemes: themeGroups.length,
    contracts: stubContractResults(),
    resume,
  };

  const lines = [
    JSON.stringify({ type: "eval.collect", ...payload }),
    ...signals.map((s) => JSON.stringify({ type: "eval.signal", ...s })),
  ];

  if (!DRY_RUN) {
    mkdirSync(EVAL_DIR, { recursive: true });
    writeFileSync(OUT_JSONL, `${lines.join("\n")}\n`, "utf8");
    if (resume) {
      mkdirSync(dirname(RESUME_PATH), { recursive: true });
      writeFileSync(RESUME_PATH, `${JSON.stringify(resume, null, 2)}\n`, "utf8");
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      result: {
        dryRun: DRY_RUN,
        output: DRY_RUN ? null : OUT_JSONL,
        resume: DRY_RUN ? null : resume ? RESUME_PATH : null,
        ...payload,
      },
    })}\n`
  );
}

try {
  main();
} catch (err) {
  fail(
    "COLLECT_FAILED",
    err instanceof Error ? err.message : String(err),
    "Run session-logger start/prompt or widen --since="
  );
}
