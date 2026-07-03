#!/usr/bin/env node
/**
 * Agent session audit — agenttrace doctor + overview markdown report.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { logOrchestrator } from "./lib/agent-orchestrator-log.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REPORT = resolve(ROOT, "docs/inbox-pipeline/reports/agent-sessions-latest.md");

function agenttraceBin() {
  const local = resolve(ROOT, ".tools/agenttrace.exe");
  if (existsSync(local)) return local;
  return "agenttrace";
}

function runAgenttrace(args) {
  const result = spawnSync(agenttraceBin(), args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
    status: result.status ?? 1,
  };
}

function main() {
  const withBacklog = process.argv.includes("--backlog");

  const doctor = runAgenttrace(["--doctor"]);
  const overview = runAgenttrace(["--overview", "-f", "markdown"]);

  const sections = [
    "# Agent session audit (latest)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## agenttrace doctor",
    "",
    doctor.ok ? "Status: ok" : `Status: failed (exit ${doctor.status})`,
    "",
    "```",
    doctor.stdout || doctor.stderr || "(no output)",
    "```",
    "",
    "## agenttrace overview",
    "",
    overview.stdout || overview.stderr || "(no sessions found — run agenttrace after coding sessions)",
    "",
    "## Local commands",
    "",
    "- `yarn agenttrace --latest`",
    "- `yarn agent:status --json`",
    "- `node scripts/agent-eval-collect.mjs`",
    "",
  ];

  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, sections.join("\n"), "utf8");
  console.log(`wrote ${REPORT}`);

  if (withBacklog) {
    const backlog = spawnSync(process.execPath, [resolve(__dirname, "backlog-health.mjs")], {
      cwd: ROOT,
      encoding: "utf8",
      shell: false,
    });
    if (backlog.status !== 0) {
      console.warn("[agent-audit] backlog-health failed:", backlog.stderr || backlog.stdout);
    }
  }

  if (!doctor.ok) {
    logOrchestrator("error", "agent_audit_doctor_failed", {
      message: doctor.stderr || doctor.stdout,
    });
    process.exit(1);
  }
}

main();
