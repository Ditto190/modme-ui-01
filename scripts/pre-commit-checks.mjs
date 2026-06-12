#!/usr/bin/env node
/**
 * Fast repo checks for local pre-commit hooks and CI.
 * Usage:
 *   node scripts/pre-commit-checks.mjs           # staged-aware (hook)
 *   node scripts/pre-commit-checks.mjs --ci      # full suite (CI / Buildkite)
 */

import { execSync, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const isCi = process.argv.includes("--ci");

function fail(message) {
  console.error(`pre-commit: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`pre-commit: ${message}`);
}

function runNode(script, args = []) {
  const result = spawnSync(process.execPath, [resolve(ROOT, script), ...args], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function gitLines(command) {
  try {
    return execSync(command, { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function secretGuard() {
  const tracked = gitLines("git ls-files");
  const bad = tracked.filter((f) =>
    /(^|\/)\.env$|\.env\.local$|\.env\.production$/.test(f),
  );
  if (bad.length > 0) {
    fail(`tracked secret env files: ${bad.join(", ")}`);
  }
  ok("no tracked .env files");
}

function stagedFiles() {
  if (isCi) {
    return gitLines("git diff --name-only HEAD~1 HEAD");
  }
  return gitLines("git diff --cached --name-only");
}

function matchesAny(file, prefixes) {
  return prefixes.some((p) => file.startsWith(p));
}

function main() {
  secretGuard();

  if (isCi) {
    runNode("scripts/validate-changelog.mjs");
    runNode("scripts/validate-changelog.mjs", ["--require-update"]);
    runNode("scripts/validate-launch-json.mjs");
    runNode("scripts/validate-launch-json.mjs", ["--require-manifest-sync"]);
    runNode("scripts/validate-cursor-skills.mjs", ["--project-only"]);
    ok("all CI pre-commit checks passed");
    return;
  }

  runNode("scripts/validate-changelog.mjs");

  const files = stagedFiles();
  const monitoredPrefixes = [
    ".agents/",
    ".cursor/",
    "scripts/",
    "docs/",
    "GenerativeUI_monorepo/apps/",
    "GenerativeUI_monorepo/packages/",
  ];
  const monitoredChanged = files.some((f) => matchesAny(f, monitoredPrefixes));
  const changelogStaged = files.includes("CHANGELOG.md");

  if (monitoredChanged && !changelogStaged) {
    runNode("scripts/validate-changelog.mjs", ["--require-update"]);
  }

  const launchPaths = [".vscode/launch.json", ".vscode/tasks.json", "scripts/launch-manifest.json"];
  if (files.some((f) => launchPaths.includes(f))) {
    runNode("scripts/validate-launch-json.mjs");
    runNode("scripts/validate-launch-json.mjs", ["--require-manifest-sync"]);
  }

  const skillsPaths = [".cursor/skills/", ".vendor/", "scripts/cursor-ai/"];
  if (files.some((f) => matchesAny(f, skillsPaths))) {
    runNode("scripts/validate-cursor-skills.mjs", ["--project-only"]);
  }

  ok("staged changes passed pre-commit checks");
}

main();
