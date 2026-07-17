#!/usr/bin/env node
/**
 * Fetch open PR review queue (personal-repo mode for Ditto190/modme-ui-01).
 * Usage: node scripts/pr-triage/fetch-review-queue.mjs [--repo OWNER/REPO] [--base dev] [--author login] [--label name]
 */

import { execSync } from "node:child_process";
import { parseArgs, ghJson, DEFAULT_REPO } from "./lib/gh.mjs";

const args = parseArgs(process.argv.slice(2));

function listOpenPrs() {
  const fields = [
    "number",
    "title",
    "url",
    "headRefName",
    "baseRefName",
    "author",
    "reviewDecision",
    "createdAt",
    "updatedAt",
    "isDraft",
  ].join(",");
  return ghJson(["pr", "list", "--state", "open", "--json", fields], { repo: args.repo });
}

function fetchReviewRequestedNotifications() {
  try {
    const out = execSync("gh api notifications --paginate", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const lines = out.trim().split("\n").filter(Boolean);
    const items = [];
    for (const line of lines) {
      try {
        items.push(JSON.parse(line));
      } catch {
        // paginate may return array in one blob
      }
    }
    if (items.length === 0 && out.startsWith("[")) {
      return JSON.parse(out);
    }
    return items.filter(
      (n) => n.reason === "review_requested" && n.unread !== false,
    );
  } catch {
    return [];
  }
}

function prFromNotificationUrl(url) {
  const m = String(url).match(/pull\/(\d+)/);
  return m ? Number(m[1]) : null;
}

const openPrs = listOpenPrs();
const notifications = fetchReviewRequestedNotifications();
const notifiedPrNumbers = new Set(
  notifications
    .map((n) => prFromNotificationUrl(n.subject?.url))
    .filter(Boolean),
);

const filtered = openPrs.filter((pr) => {
  if (args.base && pr.baseRefName !== args.base) return false;
  if (args.author && pr.author?.login !== args.author) return false;
  if (pr.isDraft) return false;
  return true;
});

const prs = filtered.map((pr) => {
  const reasons = [];
  if (pr.reviewDecision === "REVIEW_REQUIRED") {
    reasons.push("review required");
  }
  if (notifiedPrNumbers.has(pr.number)) {
    reasons.push("unread review_requested notification");
  }
  if (reasons.length === 0 && pr.reviewDecision === "") {
    reasons.push("open PR on base " + pr.baseRefName);
  }
  return {
    notification_id: null,
    title: pr.title,
    url: pr.url,
    repo: args.repo,
    pr_number: pr.number,
    author: pr.author?.login ?? "",
    headRefName: pr.headRefName,
    baseRefName: pr.baseRefName,
    reviewDecision: pr.reviewDecision,
    reasons,
  };
});

const result = { total: prs.length, repo: args.repo, base: args.base, prs };

if (args.format === "markdown") {
  console.log(`# Review queue (${result.total}) — ${args.repo} base:${args.base}\n`);
  console.log("| # | Title | URL | Reasons |");
  console.log("|---|-------|-----|---------|");
  prs.forEach((p, i) => {
    console.log(`| ${i + 1} | ${p.title.replace(/\|/g, "\\|")} | ${p.url} | ${p.reasons.join("; ")} |`);
  });
} else {
  console.log(JSON.stringify(result, null, 2));
}
