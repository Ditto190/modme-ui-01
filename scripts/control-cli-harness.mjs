#!/usr/bin/env node
/**
 * ModMe control-cli harness — deterministic orchestration probes (JSON default).
 * Usage: node scripts/control-cli-harness.mjs [--probe status|mprocs|smoke|tmux|all] [--human] [--brief] [--help]
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const BRIEF =
  "ModMe control-cli harness: probes agent-status, mprocs config, worktree smoke, and optional tmux status for multi-agent workspace orchestration.";

const PROBES = {
  status: {
    label: "agent-status",
    cmd: "node",
    args: ["scripts/agent-status.mjs", "--json"],
    ready: (out) => out.includes('"repoRoot"'),
  },
  mprocs: {
    label: "mprocs-generate",
    cmd: "node",
    args: ["scripts/generate-mprocs-config.mjs", "--stdout"],
    ready: (out) => out.includes("procs:"),
  },
  smoke: {
    label: "worktree-smoke",
    cmd: "node",
    args: ["e2e/worktree-smoke/run.mjs"],
    ready: (out) => out.includes("worktree-smoke: ok"),
  },
  tmux: {
    label: "tmux-status",
    cmd: "bash",
    args: ["scripts/agent-workspace-tmux.sh", "status"],
    ready: (out) => out.includes("git worktree list"),
    optional: true,
  },
};

const args = process.argv.slice(2);

function fail(code, message, suggestion) {
  const payload = { error: true, code, message, suggestion };
  process.stderr.write(`${JSON.stringify(payload)}\n`);
  process.exit(code === "USAGE" ? 2 : 1);
}

function hasCommand(name) {
  const which = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(which, [name], { encoding: "utf8", shell: true });
  return r.status === 0;
}

function runProbe(key) {
  const probe = PROBES[key];
  if (!probe) {
    fail("USAGE", `Unknown probe: ${key}`, `Use one of: ${Object.keys(PROBES).join(", ")}`);
  }

  if (probe.cmd === "bash" && !hasCommand("bash")) {
    return {
      probe: key,
      label: probe.label,
      ok: true,
      skipped: true,
      reason: "bash not on PATH",
    };
  }

  const result = spawnSync(probe.cmd, probe.args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: probe.cmd === "bash",
  });

  const combined = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const ok = result.status === 0 && probe.ready(combined);

  return {
    probe: key,
    label: probe.label,
    ok,
    exitCode: result.status ?? 1,
    output: combined.slice(0, 4000),
  };
}

if (args.includes("--brief")) {
  console.log(BRIEF);
  process.exit(0);
}

if (args.includes("--help")) {
  console.log(
    JSON.stringify(
      {
        brief: BRIEF,
        commands: [
          { name: "default", description: "Run all probes; JSON to stdout" },
          { name: "--probe", description: "Single probe: status|mprocs|smoke|tmux|all" },
          { name: "--human", description: "Transcript-style output" },
          { name: "--brief", description: "One-line identity" },
        ],
        probes: Object.keys(PROBES),
        issue: "Report failures via agent-session-finish envelope or docs/inbox-pipeline/",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const probeArg = args.find((a) => a.startsWith("--probe="))?.slice(8)
  ?? (args.includes("--probe") ? args[args.indexOf("--probe") + 1] : "all");
const asHuman = args.includes("--human");

const keys = probeArg === "all" ? Object.keys(PROBES) : [probeArg];
const results = keys.map((k) => runProbe(k));
const failed = results.filter((r) => !r.ok && !r.skipped);

if (asHuman) {
  for (const r of results) {
    if (r.skipped) {
      console.log(`[SKIP] ${r.label}: ${r.reason}`);
      continue;
    }
    console.log(`${r.ok ? "[OK]" : "[FAIL]"} ${r.label} (exit ${r.exitCode})`);
    if (!r.ok) console.log(r.output);
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

const report = {
  at: new Date().toISOString(),
  repoRoot: ROOT,
  ok: failed.length === 0,
  probes: results,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
