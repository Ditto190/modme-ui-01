#!/usr/bin/env node
/**
 * Derive GitHub labels from a preflight report JSON artifact.
 *
 * Usage:
 *   node scripts/apply-preflight-labels.mjs --from docs/devops/reports/preflight-latest.json
 *   node scripts/apply-preflight-labels.mjs --from report.json --pr 42 --apply
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { labelsFromPreflightReport } from "./lib/preflight-labels.mjs";

export { labelsFromPreflightReport } from "./lib/preflight-labels.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  /** @type {{ from?: string; pr?: number; apply: boolean; json: boolean }} */
  const out = { apply: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--from" && argv[i + 1]) out.from = argv[++i];
    else if (arg === "--pr" && argv[i + 1]) out.pr = Number(argv[++i]);
    else if (arg === "--apply") out.apply = true;
    else if (arg === "--json") out.json = true;
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

function applyLabels(prNumber, labels) {
  const result = spawnSync(
    "gh",
    ["pr", "edit", String(prNumber), "--add-label", labels.join(",")],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `gh pr edit failed (${result.status})`);
  }
}

function printHelp() {
  console.log(`apply-preflight-labels - map preflight report to GitHub labels

Usage:
  node scripts/apply-preflight-labels.mjs --from <report.json> [--pr N] [--apply] [--json]

Labels:
  ci:passed | ci:failed
  failure:lint | failure:test | failure:build | failure:env | failure:guard | failure:infra
  stack:forge | stack:generative
  needs-triage (on failure)
`);
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }
  if (!flags.from) {
    console.error("--from <report.json> is required");
    printHelp();
    process.exit(1);
  }

  const report = loadReport(flags.from);
  const labels = labelsFromPreflightReport(report);

  if (flags.json) {
    console.log(JSON.stringify({ labels, pr: flags.pr ?? null, ok: report.ok }, null, 2));
  } else {
    console.log(labels.join("\n"));
  }

  if (flags.apply) {
    if (!flags.pr) {
      console.error("--apply requires --pr <number>");
      process.exit(1);
    }
    applyLabels(flags.pr, labels);
    if (!flags.json) {
      console.log(`Applied ${labels.length} label(s) to PR #${flags.pr}`);
    }
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
