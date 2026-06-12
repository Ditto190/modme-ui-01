#!/usr/bin/env node
/**
 * Validates CHANGELOG.md structure for agent and CI updates.
 * Usage: node scripts/validate-changelog.mjs [--require-update]
 *
 * --require-update  Fail if monitored paths changed in the working tree/PR
 *                   but CHANGELOG.md was not modified (for local/CI use).
 */

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHANGELOG = resolve(ROOT, "CHANGELOG.md");

const REQUIRED_HEADINGS = [
  "## Agent Update Protocol",
  "## [Unreleased]",
  "### Added",
  "### Changed",
  "### Fixed",
];

const ALLOWED_UNRELEASED_SECTIONS = new Set([
  "Added",
  "Changed",
  "Deprecated",
  "Removed",
  "Fixed",
  "Security",
]);

const MONITORED_PREFIXES = [
  ".agents/",
  ".cursor/",
  "GenerativeUI_monorepo/apps/",
  "GenerativeUI_monorepo/packages/",
  "scripts/",
  "docs/",
];

function fail(message) {
  console.error(`changelog-check: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`changelog-check: ${message}`);
}

if (!existsSync(CHANGELOG)) {
  fail("CHANGELOG.md not found at repository root");
}

const content = readFileSync(CHANGELOG, "utf8");

if (!content.includes("# Changelog")) {
  fail('Missing top-level "# Changelog" heading');
}

for (const heading of REQUIRED_HEADINGS) {
  if (!content.includes(heading)) {
    fail(`Missing required section: ${heading}`);
  }
}

const unreleasedMatch = content.match(/## \[Unreleased\]([\s\S]*?)(?=\n## \[|\n\[Unreleased\]:|$)/);
if (!unreleasedMatch) {
  fail("Could not parse [Unreleased] section");
}

const unreleasedBody = unreleasedMatch[1];
const sectionHeadings = [...unreleasedBody.matchAll(/^### (.+)$/gm)].map((m) => m[1].trim());
for (const section of sectionHeadings) {
  if (!ALLOWED_UNRELEASED_SECTIONS.has(section)) {
    fail(`Invalid [Unreleased] subsection: ### ${section}`);
  }
}

if (/\b(sk_|api[_-]?key|password\s*=|Bearer\s+[A-Za-z0-9._-]{20,})/i.test(content)) {
  fail("CHANGELOG appears to contain secret-like content; remove before committing");
}

const requireUpdate = process.argv.includes("--require-update");
if (requireUpdate) {
  let changedFiles = [];
  try {
    const base = process.env.GITHUB_BASE_SHA;
    const head = process.env.GITHUB_SHA ?? "HEAD";
    const range = base ? `${base}...${head}` : "HEAD";
    const out = execSync(`git diff --name-only ${range}`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    changedFiles = out.split(/\r?\n/).filter(Boolean);
  } catch {
    ok("Skipping require-update (not a git repo or diff unavailable)");
    changedFiles = [];
  }

  const monitoredChanged = changedFiles.some((f) =>
    MONITORED_PREFIXES.some((p) => f.startsWith(p)),
  );
  const changelogChanged = changedFiles.includes("CHANGELOG.md");

  if (monitoredChanged && !changelogChanged) {
    fail(
      "Monitored paths changed but CHANGELOG.md was not updated. " +
        "Append to [Unreleased] or explain why no entry is needed in the PR.",
    );
  }
}

ok("CHANGELOG.md format is valid");
