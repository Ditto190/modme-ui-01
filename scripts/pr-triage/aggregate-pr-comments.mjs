#!/usr/bin/env node
/**
 * Aggregate PR review comments by severity (implements get-pr-comments skill).
 * Usage: node scripts/pr-triage/aggregate-pr-comments.mjs --pr 91 [--repo OWNER/REPO] [--markdown]
 */

import { execSync } from "node:child_process";
import { parseArgs, ghApi, ghJson, DEFAULT_REPO } from "./lib/gh.mjs";

const args = parseArgs(process.argv.slice(2));

function resolvePrNumber() {
  if (args.pr) return args.pr;
  try {
    const pr = ghJson(["pr", "view", "--json", "number"], { repo: args.repo });
    return pr.number;
  } catch {
    throw new Error("No --pr and no PR for current branch. Pass --pr <number>.");
  }
}

function inferSeverity(body, user) {
  const text = String(body ?? "");
  if (/!\[high\]|P1:|severity:\s*high|\bCRITICAL\b/i.test(text)) return "high";
  if (/!\[medium\]|P2:|severity:\s*medium/i.test(text)) return "medium";
  if (/!\[low\]|P3:|severity:\s*low|nit/i.test(text)) return "low";
  if (/coderabbitai|cubic-dev|gemini-code-assist|bugbot/i.test(user ?? "")) return "medium";
  return "low";
}

const prNumber = resolvePrNumber();
const [owner, repoName] = args.repo.split("/");

const inline = ghApi(`repos/${owner}/${repoName}/pulls/${prNumber}/comments`) ?? [];
const issueComments = ghApi(`repos/${owner}/${repoName}/issues/${prNumber}/comments`) ?? [];

const prMeta = ghJson(["pr", "view", String(prNumber), "--json", "title,url,headRefName,baseRefName,reviewDecision"], {
  repo: args.repo,
});

const items = [];

for (const c of inline) {
  items.push({
    kind: "review",
    user: c.user?.login ?? "",
    path: c.path ?? "",
    line: c.line ?? c.original_line ?? null,
    severity: inferSeverity(c.body, c.user?.login),
    body: String(c.body ?? "").slice(0, 500),
    url: c.html_url,
  });
}

for (const c of issueComments) {
  items.push({
    kind: "discussion",
    user: c.user?.login ?? "",
    path: "",
    line: null,
    severity: inferSeverity(c.body, c.user?.login),
    body: String(c.body ?? "").slice(0, 500),
    url: c.html_url,
  });
}

const bySeverity = { high: [], medium: [], low: [] };
for (const item of items) {
  bySeverity[item.severity].push(item);
}

const actionList = [];
for (const item of bySeverity.high) {
  actionList.push({
    priority: 1,
    action: item.path ? `Fix ${item.path}${item.line ? `:${item.line}` : ""}` : "Address review comment",
    severity: "high",
    url: item.url,
  });
}
for (const item of bySeverity.medium) {
  actionList.push({
    priority: 2,
    action: item.path ? `Review ${item.path}` : "Review discussion comment",
    severity: "medium",
    url: item.url,
  });
}
for (const item of bySeverity.low) {
  actionList.push({
    priority: 3,
    action: item.path ? `Optional: ${item.path}` : "Optional nit",
    severity: "low",
    url: item.url,
  });
}

const result = {
  pr: prNumber,
  title: prMeta.title,
  url: prMeta.url,
  base: prMeta.baseRefName,
  head: prMeta.headRefName,
  reviewDecision: prMeta.reviewDecision,
  totals: {
    high: bySeverity.high.length,
    medium: bySeverity.medium.length,
    low: bySeverity.low.length,
  },
  actionList,
  comments: items,
};

if (args.format === "markdown") {
  console.log(`# PR #${prNumber} — ${prMeta.title}\n`);
  console.log(`${prMeta.url}\n`);
  console.log(`| Severity | Count |`);
  console.log(`|----------|-------|`);
  console.log(`| high | ${result.totals.high} |`);
  console.log(`| medium | ${result.totals.medium} |`);
  console.log(`| low | ${result.totals.low} |`);
  console.log("\n## Action list\n");
  for (const a of actionList) {
    console.log(`${a.priority}. **[${a.severity}]** ${a.action} — ${a.url}`);
  }
} else {
  console.log(JSON.stringify(result, null, 2));
}
