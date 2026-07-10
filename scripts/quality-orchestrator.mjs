#!/usr/bin/env node
/**
 * Route preflight failures / PR context to Cursor subagents or tmux agent-manager.
 *
 * Usage:
 *   yarn quality:route --from docs/devops/reports/preflight-latest.json
 *   yarn quality:route --pr 123 --runtime cursor
 *   yarn quality:route --pr 123 --runtime tmux
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { labelsFromPreflightReport } from "./lib/preflight-labels.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(__dirname, "quality-orchestrator.manifest.json");

/** @type {import("./quality-orchestrator.manifest.json")} */
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

function parseArgs(argv) {
  /** @type {{
   *   from?: string;
   *   pr?: number;
   *   runtime: string;
   *   json: boolean;
   *   applyLabels: boolean;
   *   dryRun: boolean;
   * }} */
  const out = {
    runtime: "cursor",
    json: false,
    applyLabels: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--from" && argv[i + 1]) out.from = argv[++i];
    else if (arg === "--pr" && argv[i + 1]) out.pr = Number(argv[++i]);
    else if (arg === "--runtime" && argv[i + 1]) out.runtime = argv[++i];
    else if (arg === "--json") out.json = true;
    else if (arg === "--apply-labels") out.applyLabels = true;
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

function loadReport(relativePath) {
  const reportPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(ROOT, relativePath);
  if (!fs.existsSync(reportPath)) {
    throw new Error(`report not found: ${relativePath}`);
  }
  return JSON.parse(fs.readFileSync(reportPath, "utf8"));
}

function ghJson(args) {
  const result = spawnSync("gh", args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `gh ${args.join(" ")} failed`);
  }
  return JSON.parse(result.stdout || "[]");
}

function fetchPrContext(prNumber) {
  const pr = ghJson(["pr", "view", String(prNumber), "--json", "number,title,state,additions,deletions,headRefName"]);
  let checks = [];
  try {
    checks = ghJson(["pr", "checks", String(prNumber), "--json", "name,state,conclusion,workflow"]);
  } catch {
    checks = [];
  }
  return { pr, checks };
}

/**
 * @param {string} failureClass
 * @param {string} runtime
 */
function routeFailureClass(failureClass, runtime) {
  const route = manifest.routing.failureClass[failureClass];
  if (!route) {
    return { agents: [], employees: [], followUp: [] };
  }
  const agents = runtime === "tmux" ? [] : (route.cursor ?? []);
  const employees = runtime === "tmux" ? (route.tmux ?? []) : [];
  const followUp = route.cursorFollowUp ?? [];
  return { agents, employees, followUp };
}

/**
 * @param {ReturnType<typeof loadReport>} report
 * @param {string} runtime
 */
function planFromReport(report, runtime) {
  /** @type {string[]} */
  const agents = [];
  /** @type {string[]} */
  const employees = [];
  /** @type {string[]} */
  const followUp = [];

  if (report.ok) {
    return {
      kind: "green",
      summary: "Preflight passed — no failure routing",
      agents: ["bugbot"],
      employees: runtime === "tmux" ? ["EMP_REVIEW"] : [],
      followUp: ["yarn preflight:fast"],
      labels: labelsFromPreflightReport(report),
    };
  }

  const failureClasses = report.summary?.failureClasses ?? ["infra"];
  for (const failureClass of failureClasses) {
    const route = routeFailureClass(failureClass, runtime);
    agents.push(...route.agents);
    employees.push(...route.employees);
    followUp.push(...route.followUp);
  }

  return {
    kind: "failure",
    summary: `Route ${failureClasses.join(", ")} via ${runtime}`,
    agents: [...new Set(agents)],
    employees: [...new Set(employees)],
    followUp: [...new Set(followUp)],
    labels: labelsFromPreflightReport(report),
    failureClasses,
  };
}

function isWslAvailable() {
  const result = spawnSync("wsl", ["-e", "true"], { encoding: "utf8" });
  return result.status === 0;
}

function dispatchTmux(employees, dryRun) {
  const script = path.join(ROOT, manifest.runtimes.tmux.agentManagerScript);
  if (!fs.existsSync(script)) {
    return {
      ok: false,
      message: `agent-manager not installed at ${manifest.runtimes.tmux.agentManagerScript}`,
      commands: employees.map((emp) => `python3 ${script} assign ${emp}`),
    };
  }
  if (!isWslAvailable()) {
    return {
      ok: false,
      message: "WSL required for --runtime tmux on Windows",
      commands: employees.map((emp) => `wsl python3 ${script} assign ${emp}`),
    };
  }
  if (dryRun) {
    return {
      ok: true,
      message: "dry-run tmux dispatch",
      commands: employees.map((emp) => `wsl python3 ${script} assign ${emp}`),
    };
  }
  for (const emp of employees) {
    spawnSync("wsl", ["python3", script, "assign", emp], { cwd: ROOT, stdio: "inherit" });
  }
  return { ok: true, message: `dispatched ${employees.length} employee slot(s)` };
}

function buildCursorPrompt(plan, report, prContext) {
  const lines = [
    "# ModMe quality route",
    "",
    `**Kind:** ${plan.kind}`,
    `**Summary:** ${plan.summary}`,
    "",
  ];
  if (prContext?.pr) {
    lines.push(`**PR:** #${prContext.pr.number} — ${prContext.pr.title}`);
    lines.push("");
  }
  if (report?.profile) {
    lines.push(`**Preflight profile:** ${report.profile} (ok=${report.ok})`);
    const failed = (report.steps ?? []).filter((s) => s.status === "failed");
    for (const step of failed) {
      lines.push(`- FAIL \`${step.id}\`: ${step.logExcerpt || step.title}`);
    }
    lines.push("");
  }
  lines.push("## Dispatch agents");
  for (const agent of plan.agents) {
    const meta = manifest.agents.tierA[agent];
    const ref = meta?.subagent ?? meta?.skill ?? meta?.agent ?? meta?.path ?? agent;
    lines.push(`- **${agent}** → \`${ref}\``);
  }
  if (plan.followUp.length > 0) {
    lines.push("", "## Suggested follow-up");
    for (const cmd of plan.followUp) {
      lines.push(`- \`${cmd}\``);
    }
  }
  return lines.join("\n");
}

function printHelp() {
  console.log(`quality-orchestrator — route preflight / PR failures to agents

Usage:
  yarn quality:route --from docs/devops/reports/preflight-latest.json [--runtime cursor|tmux]
  yarn quality:route --pr <N> [--from report.json] [--runtime cursor|tmux]
  yarn quality:route --from report.json --pr <N> --apply-labels

Options:
  --runtime cursor|tmux   Default: cursor
  --apply-labels            gh pr edit --add-label (requires --pr)
  --dry-run                 Print tmux commands without executing
  --json                    Machine-readable plan
`);
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }
  if (!flags.from && !flags.pr) {
    console.error("Provide --from <report.json> and/or --pr <N>");
    printHelp();
    process.exit(1);
  }
  if (!manifest.runtimes[flags.runtime]) {
    console.error(`Unknown runtime: ${flags.runtime}`);
    process.exit(1);
  }

  /** @type {ReturnType<typeof loadReport> | null} */
  let report = null;
  if (flags.from) {
    report = loadReport(flags.from);
  } else {
    report = {
      ok: false,
      profile: "ci",
      summary: { failureClasses: ["infra"] },
      steps: [],
    };
  }

  let prContext = null;
  if (flags.pr) {
    prContext = fetchPrContext(flags.pr);
    if (!flags.from) {
      const failedCheck = prContext.checks.find((c) => c.conclusion === "FAILURE" || c.state === "FAILURE");
      if (failedCheck) {
        report.summary = report.summary ?? { failureClasses: [] };
        report.summary.failureClasses = ["infra"];
      }
    }
  }

  const plan = planFromReport(report, flags.runtime);
  const prompt = buildCursorPrompt(plan, report, prContext);

  let tmuxResult = null;
  if (flags.runtime === "tmux" && plan.employees.length > 0) {
    tmuxResult = dispatchTmux(plan.employees, flags.dryRun);
  }

  if (flags.applyLabels && flags.pr) {
    const applyScript = path.join(__dirname, "apply-preflight-labels.mjs");
    spawnSync(process.execPath, [applyScript, "--from", flags.from ?? manifest.related.preflightReportDefault, "--pr", String(flags.pr), "--apply"], {
      cwd: ROOT,
      stdio: "inherit",
    });
  }

  const output = {
    runtime: flags.runtime,
    plan,
    tmux: tmuxResult,
    cursorPrompt: flags.runtime === "cursor" ? prompt : undefined,
    pr: prContext?.pr ?? null,
  };

  if (flags.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(prompt);
    if (tmuxResult) {
      console.log("\n## tmux");
      console.log(tmuxResult.message);
      for (const cmd of tmuxResult.commands ?? []) {
        console.log(`  ${cmd}`);
      }
    }
    console.log("\nLabels:", plan.labels.join(", "));
  }
}

main();
