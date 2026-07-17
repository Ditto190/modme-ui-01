#!/usr/bin/env node
/**
 * Classify open PRs for merge / retarget / close / escalate actions.
 * Usage: node scripts/pr-triage/classify-pr.mjs [--base main] [--repo OWNER/REPO]
 */

import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, ghJson } from "./lib/gh.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const args = parseArgs(process.argv.slice(2));
const STALE_DAYS = 60;

function daysSince(iso) {
  if (!iso) return 999;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function hasFailingChecks(pr) {
  const rollup = pr.statusCheckRollup ?? [];
  return rollup.some(
    (c) =>
      (c.conclusion && c.conclusion !== "SUCCESS" && c.conclusion !== "NEUTRAL" && c.conclusion !== "SKIPPED") ||
      (c.state && c.state === "FAILURE"),
  );
}

function commitsOnDevOnly(headRef) {
  try {
    execSync("git fetch origin dev --quiet", { cwd: ROOT, stdio: "pipe" });
    const out = execSync(`git log origin/dev..origin/${headRef} --oneline`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return null;
  }
}

const fields = [
  "number",
  "title",
  "url",
  "headRefName",
  "baseRefName",
  "author",
  "createdAt",
  "updatedAt",
  "isDraft",
  "mergeable",
  "statusCheckRollup",
].join(",");

const listArgs = ["pr", "list", "--state", "open", "--json", fields];
if (args.base) {
  listArgs.push("--base", args.base);
}

const openPrs = ghJson(listArgs, { repo: args.repo });

const classified = openPrs.map((pr) => {
  const age = daysSince(pr.updatedAt ?? pr.createdAt);
  const failing = hasFailingChecks(pr);
  const wrongBase = pr.baseRefName === "main";
  const isDependabot = String(pr.headRefName).startsWith("dependabot/");
  const uniqueCommits = commitsOnDevOnly(pr.headRefName);

  let action = "review";
  let reason = "Open PR awaiting triage";

  if (wrongBase && age > STALE_DAYS && failing) {
    action = isDependabot ? "close_dependabot" : "close_stale";
    reason = `Stale (${Math.floor(age)}d), wrong base main, CI failing`;
  } else if (wrongBase && !failing && age <= STALE_DAYS) {
    action = "retarget_dev";
    reason = "Wrong base main but recent and CI green";
  } else if (wrongBase && age > STALE_DAYS) {
    action = "close_or_retarget";
    reason = `Stale (${Math.floor(age)}d) on main`;
  } else if (pr.baseRefName === "dev" && !failing && age <= STALE_DAYS) {
    action = "merge_candidate";
    reason = "Dev PR with green checks";
  } else if (failing) {
    action = "fix_ci";
    reason = "CI failures";
  }

  if (uniqueCommits && uniqueCommits.length > 0 && action.startsWith("close")) {
    action = "escalate_before_close";
    reason += `; ${uniqueCommits.length} commit(s) not on dev`;
  }

  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    headRefName: pr.headRefName,
    baseRefName: pr.baseRefName,
    author: pr.author?.login ?? "",
    ageDays: Math.floor(age),
    action,
    reason,
  };
});

const summary = {
  total: classified.length,
  repo: args.repo,
  baseFilter: args.base || "all",
  byAction: classified.reduce((acc, p) => {
    acc[p.action] = (acc[p.action] ?? 0) + 1;
    return acc;
  }, {}),
  prs: classified,
};

if (args.format === "markdown") {
  console.log(`# PR classification (${summary.total})\n`);
  console.log("| PR | Base | Action | Reason |");
  console.log("|----|------|--------|--------|");
  for (const p of classified) {
    console.log(`| [#${p.number}](${p.url}) | ${p.baseRefName} | ${p.action} | ${p.reason} |`);
  }
} else {
  console.log(JSON.stringify(summary, null, 2));
}
