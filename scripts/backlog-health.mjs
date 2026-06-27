#!/usr/bin/env node
/**
 * Backlog health report — beads + GitHub open issues.
 * Optional GitLab when GITLAB_PROJECT_ID is set (manual review).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REPORT = resolve(ROOT, "docs/inbox-pipeline/reports/backlog-health-latest.md");

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  return {
    ok: result.status === 0,
    out: (result.stdout ?? "").trim(),
    err: (result.stderr ?? "").trim(),
  };
}

function beadsSection() {
  const ready = run("npx", ["--yes", "@beads/bd", "ready"]);
  const list = run("npx", ["--yes", "@beads/bd", "list", "--all"]);
  const lines = ["## Beads (modme-*)", ""];
  if (!ready.ok && process.env.BEADS_DISABLED === "1") {
    lines.push("Beads disabled (`BEADS_DISABLED=1`).", "");
    return lines;
  }
  lines.push("### Ready queue", "", "```", ready.out || ready.err || "(empty)", "```", "");
  lines.push("### Open issues", "", "```", list.out || list.err || "(none)", "```", "");
  const unlinked = (list.out || "").split(/\r?\n/).filter((l) => l && !/github\.com/i.test(l));
  if (unlinked.length > 0) {
    lines.push(`- **Signal:** ${unlinked.length} open beads line(s) — verify GitHub beads-handoff for multi-session work`, "");
  }
  return lines;
}

function githubSection() {
  const lines = ["## GitHub (SoR)", ""];
  const gh = run("gh", [
    "issue",
    "list",
    "--repo",
    "Ditto190/modme-ui-01",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,labels,updatedAt,assignees",
  ]);
  if (!gh.ok) {
    lines.push("`gh` unavailable — install GitHub CLI or set `GH_TOKEN`.", "", "```", gh.err || gh.out, "```", "");
    return lines;
  }
  let issues;
  try {
    issues = JSON.parse(gh.out);
  } catch {
    lines.push("Failed to parse `gh issue list` JSON.", "");
    return lines;
  }
  const now = Date.now();
  const staleDays = 14;
  /** @type {typeof issues} */
  const stale = [];
  /** @type {typeof issues} */
  const needsTriage = [];
  /** @type {typeof issues} */
  const devopsAutofix = [];
  /** @type {typeof issues} */
  const missingStack = [];

  const stackLabels = new Set(["stack:forge", "stack:generative", "stack:root", "stack:orchestration"]);

  for (const issue of issues) {
    const labelNames = (issue.labels ?? []).map((l) => l.name);
    if (labelNames.includes("needs-triage")) needsTriage.push(issue);
    if (labelNames.includes("devops-autofix")) devopsAutofix.push(issue);
    const hasStack = labelNames.some((n) => stackLabels.has(n));
    if (!hasStack) missingStack.push(issue);
    const updated = new Date(issue.updatedAt).getTime();
    if (now - updated > staleDays * 86400000) stale.push(issue);
  }

  lines.push(`- **Open issues:** ${issues.length}`);
  lines.push(`- **needs-triage:** ${needsTriage.length}`);
  lines.push(`- **devops-autofix:** ${devopsAutofix.length}`);
  lines.push(`- **Missing stack label:** ${missingStack.length}`);
  lines.push(`- **Stale (>${staleDays}d):** ${stale.length}`, "");

  if (stale.length > 0) {
    lines.push("### Oldest stale (sample)", "");
    for (const i of stale.slice(0, 10)) {
      lines.push(`- #${i.number} ${i.title} (updated ${i.updatedAt})`);
    }
    lines.push("");
  }

  return lines;
}

function recommendations() {
  return [
    "## Recommendations",
    "",
    "- Run triage: [`.cursor/bugbot/TRIAGE.md`](../../.cursor/bugbot/TRIAGE.md)",
    "- Bulk label/milestone cleanup: GitLab **Planner Agent** (human-approved)",
    "- Trends: GitLab **Data Analyst Agent**",
    "- Route CI autofix: `node scripts/lib/polis-router.mjs --labels ci-cd,devops-autofix --self-heal`",
    "",
  ];
}

function main() {
  const sections = [
    "# Backlog health (latest)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    ...beadsSection(),
    ...githubSection(),
    ...recommendations(),
  ];

  if (process.env.GITLAB_PROJECT_ID) {
    sections.push("## GitLab adjunct", "", `Project ID: ${process.env.GITLAB_PROJECT_ID}`, "Use GitLab MCP `search` for open issues with `needs-triage` or `devops-autofix`.", "");
  }

  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, sections.join("\n"), "utf8");
  console.log(`wrote ${REPORT}`);
}

main();
