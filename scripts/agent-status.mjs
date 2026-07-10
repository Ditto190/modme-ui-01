#!/usr/bin/env node
/**
 * Agent orchestrator status — JSON or text for agents/CI.
 * Usage: node scripts/agent-status.mjs [--json] [--ci]
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const asJson = process.argv.includes("--json");
const isCi = process.argv.includes("--ci");

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err) {
    return err.stderr?.toString()?.trim() || err.message;
  }
}

function parsePortsEnv() {
  const path = resolve(ROOT, ".worktree-ports.env");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function listWorktrees() {
  const raw = run("git worktree list --porcelain");
  const trees = [];
  let current = null;
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      if (current) trees.push(current);
      current = { path: line.slice(9), branch: null, head: null };
    } else if (current && line.startsWith("branch ")) {
      current.branch = line.slice(7);
    } else if (current && line.startsWith("HEAD ")) {
      current.head = line.slice(5);
    }
  }
  if (current) trees.push(current);
  return trees;
}

function doctorSummary() {
  if (process.platform !== "win32") {
    return { ok: true, skipped: "non-Windows" };
  }
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resolve(ROOT, "scripts/worktree-doctor.ps1"), "-Quiet"],
    { cwd: ROOT, encoding: "utf8" },
  );
  return {
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    output: (result.stdout || result.stderr || "").slice(0, 2000),
  };
}

function activeSession() {
  const envPath = process.env.AGENT_SESSION_ENVELOPE;
  if (envPath && existsSync(envPath)) {
    try {
      return JSON.parse(readFileSync(envPath, "utf8"));
    } catch {
      return null;
    }
  }
  const sessionsDir = resolve(ROOT, "logs/agent-orchestrator/sessions");
  if (!existsSync(sessionsDir)) return null;
  return null;
}

const payload = {
  at: new Date().toISOString(),
  repoRoot: ROOT,
  branch: run("git branch --show-current"),
  worktrees: listWorktrees(),
  ports: parsePortsEnv(),
  doctor: doctorSummary(),
  session: activeSession(),
  beads: process.env.BEADS_ISSUE_ID ?? null,
};

if (isCi) {
  if (!payload.doctor.ok && !payload.doctor.skipped) {
    console.error("agent-status: worktree doctor failed");
    process.exit(1);
  }
  console.log("agent-status: ok");
  process.exit(0);
}

if (asJson) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`branch: ${payload.branch}`);
  console.log(`worktrees: ${payload.worktrees.length}`);
  for (const wt of payload.worktrees) {
    console.log(`  - ${wt.path} (${wt.branch ?? "detached"})`);
  }
  const p = payload.ports;
  if (Object.keys(p).length > 0) {
    console.log("ports:", Object.entries(p).map(([k, v]) => `${k}=${v}`).join(" "));
  }
  console.log(`doctor: ${payload.doctor.ok ? "ok" : "issues"}`);
}
