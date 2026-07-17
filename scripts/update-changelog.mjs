#!/usr/bin/env node
/**
 * Append conventional commit summaries to CHANGELOG.md [Unreleased].
 * Usage: node scripts/update-changelog.mjs [--since origin/dev] [--dry-run]
 *
 * Replaces missing scripts/update-changelog.js referenced by toolset-update.yml.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHANGELOG = resolve(ROOT, "CHANGELOG.md");

const TYPE_TO_SECTION = {
  feat: "Added",
  fix: "Fixed",
  docs: "Changed",
  chore: "Changed",
  refactor: "Changed",
  perf: "Changed",
  test: "Changed",
  ci: "Changed",
  build: "Changed",
  revert: "Fixed",
  security: "Security",
};

const dryRun = process.argv.includes("--dry-run");
const sinceIdx = process.argv.indexOf("--since");
const since = sinceIdx >= 0 ? process.argv[sinceIdx + 1] : "origin/dev";

function parseCommit(line) {
  const m = line.match(/^([a-f0-9]+)\s+(.+)$/);
  if (!m) return null;
  const subject = m[2];
  const conv = subject.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/);
  if (!conv) return null;
  const [, type, scope, desc] = conv;
  const section = TYPE_TO_SECTION[type] ?? "Changed";
  const bullet = scope ? `- (${scope}) ${desc}` : `- ${desc}`;
  return { section, bullet, subject };
}

function getCommits() {
  try {
    execSync("git fetch origin dev --quiet", { cwd: ROOT, stdio: "pipe" });
  } catch {
    /* local only */
  }
  let out = "";
  try {
    out = execSync(`git log ${since}..HEAD --oneline --no-merges`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return [];
  }
  const entries = [];
  const seen = new Set();
  for (const line of out.split(/\r?\n/).filter(Boolean)) {
    const p = parseCommit(line);
    if (!p || seen.has(p.bullet)) continue;
    seen.add(p.bullet);
    entries.push(p);
  }
  return entries;
}

if (!existsSync(CHANGELOG)) {
  console.error("update-changelog: CHANGELOG.md not found");
  process.exit(1);
}

const commits = getCommits();
if (commits.length === 0) {
  console.log("update-changelog: no new conventional commits to append");
  process.exit(0);
}

let content = readFileSync(CHANGELOG, "utf8");
const unreleasedRe = /(## \[Unreleased\]\s*\n)/;
if (!unreleasedRe.test(content)) {
  console.error("update-changelog: missing ## [Unreleased] section");
  process.exit(1);
}

const bySection = {};
for (const e of commits) {
  bySection[e.section] = bySection[e.section] ?? [];
  if (!content.includes(e.bullet)) {
    bySection[e.section].push(e.bullet);
  }
}

const sectionsToAdd = Object.entries(bySection).filter(([, bullets]) => bullets.length > 0);
if (sectionsToAdd.length === 0) {
  console.log("update-changelog: all commit bullets already present");
  process.exit(0);
}

let insertBlock = "";
for (const [section, bullets] of sectionsToAdd) {
  const heading = `### ${section}`;
  if (content.includes(heading)) {
    insertBlock += bullets.map((b) => `${b}\n`).join("");
  } else {
    insertBlock += `\n${heading}\n\n${bullets.map((b) => `${b}\n`).join("")}`;
  }
}

// Insert after first ### subsection under [Unreleased] or after [Unreleased] header
const match = content.match(/## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[|\n\[Unreleased\]:|$)/);
if (!match) {
  console.error("update-changelog: could not parse [Unreleased]");
  process.exit(1);
}

// Append new bullets to ### Added if exists, else after [Unreleased]
for (const [section, bullets] of sectionsToAdd) {
  const heading = `### ${section}`;
  const block = bullets.join("\n") + "\n";
  if (content.includes(heading)) {
    content = content.replace(heading, `${heading}\n\n${block.trimEnd()}\n`);
  } else {
    content = content.replace(
      "## [Unreleased]\n",
      `## [Unreleased]\n\n${heading}\n\n${block.trimEnd()}\n`,
    );
  }
}

if (dryRun) {
  console.log("update-changelog: dry-run — would append:");
  for (const [section, bullets] of sectionsToAdd) {
    console.log(`  ### ${section}: ${bullets.length} bullet(s)`);
  }
  process.exit(0);
}

writeFileSync(CHANGELOG, content);
console.log(`update-changelog: appended ${commits.length} commit(s) to [Unreleased]`);
