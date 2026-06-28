#!/usr/bin/env node
/**
 * Fast repo checks for local pre-commit hooks and CI.
 * Usage:
 *   node scripts/pre-commit-checks.mjs           # staged-aware (hook)
 *   node scripts/pre-commit-checks.mjs --full   # pre-push audit (path-scoped CI suites)
 *   node scripts/pre-commit-checks.mjs --ci      # full suite (CI / Buildkite)
 */

import { execSync, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const isCi = process.argv.includes("--ci");
const isFull = process.argv.includes("--full");
const isWindows = process.platform === "win32";

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

function runPowerShell(script, args = []) {
  if (!isWindows) {
    ok(`skipped ${script} (non-Windows; CI uses Bun directly)`);
    return;
  }

  const psArgs = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    resolve(ROOT, script),
    ...args,
  ];
  const result = spawnSync(
    "powershell.exe",
    psArgs,
    { cwd: ROOT, stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runForgeBun(args) {
  if (isWindows) {
    runPowerShell("scripts/run-forge-bun.ps1", args);
    return;
  }

  const forgeRoot = resolve(ROOT, "next-forge");
  const result = spawnSync("bun", args, { cwd: forgeRoot, stdio: "inherit" });
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
    const base = process.env.GITHUB_BASE_SHA;
    const head = process.env.GITHUB_SHA ?? "HEAD";
    if (base && head) {
      return gitLines(`git diff --name-only ${base} ${head}`);
    }
    return gitLines("git diff --name-only HEAD~1 HEAD");
  }
  return gitLines("git diff --cached --name-only");
}

function matchesAny(file, prefixes) {
  return prefixes.some((p) => file.startsWith(p));
}

const MONITORED_PREFIXES = [
  ".agents/",
  ".cursor/",
  "scripts/",
  "docs/",
  "GenerativeUI_monorepo/apps/",
  "GenerativeUI_monorepo/packages/",
  "next-forge/apps/",
  "next-forge/packages/",
];

const FORGE_PREFIX = "next-forge/";
const GENERATIVE_PREFIX = "GenerativeUI_monorepo/";
const FORGE_ROOT = resolve(ROOT, "next-forge");

function spawnForgeBun(args, cwd = FORGE_ROOT) {
  const result = spawnSync("bun", args, {
    cwd,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function stagedForgePaths(files) {
  return files
    .filter((f) => f.startsWith(FORGE_PREFIX))
    .map((f) => f.slice(FORGE_PREFIX.length))
    .filter((f) => /\.(?:tsx?|jsx?|jsonc?|json|css|md)$/.test(f));
}

function runUltraciteOnForgePath(mode, relPath) {
  if (relPath.includes("[")) {
    const segments = relPath.split("/");
    const fileName = segments.pop();
    const subDir = resolve(FORGE_ROOT, ...segments);
    spawnForgeBun(["x", "ultracite", mode, fileName], subDir);
    return;
  }

  if (isWindows) {
    runForgeBun(["x", "ultracite", mode, relPath]);
    return;
  }

  spawnForgeBun(["x", "ultracite", mode, relPath]);
}

function runForgeCheckIfNeeded(files) {
  const forgePaths = stagedForgePaths(files);
  if (forgePaths.length === 0) {
    return;
  }

  ok(`running next-forge ultracite fix+check (${forgePaths.length} staged paths)`);
  for (const relPath of forgePaths) {
    runUltraciteOnForgePath("fix", relPath);
    runUltraciteOnForgePath("check", relPath);
  }
  ok("next-forge check passed");
}

function runForgeCiSuite(files) {
  if (!files.some((f) => f.startsWith(FORGE_PREFIX))) {
    return;
  }

  ok("running next-forge CI suite (check, test, build)");
  runForgeBun(["run", "check"]);
  runForgeBun(["run", "test"]);
  runForgeBun(["run", "build"]);
  ok("next-forge CI suite passed");
}

function runGenerativeCiSuite(files) {
  if (!files.some((f) => f.startsWith(GENERATIVE_PREFIX))) {
    return;
  }

  ok("running GenerativeUI CI suite (lint, test, build)");
  if (isWindows) {
    runPowerShell("scripts/verify-generative-ci.ps1");
    return;
  }

  const generativeRoot = resolve(ROOT, "GenerativeUI_monorepo");
  for (const step of ["lint", "test", "build"]) {
    const result = spawnSync("yarn", [step], {
      cwd: generativeRoot,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
  ok("GenerativeUI CI suite passed");
}

function main() {
  secretGuard();

  if (isCi) {
    runNode("scripts/validate-changelog.mjs");
    runNode("scripts/validate-changelog.mjs", ["--require-update"]);
    runNode("scripts/validate-launch-json.mjs");
    runNode("scripts/validate-launch-json.mjs", ["--require-manifest-sync"]);
    runNode("scripts/validate-cursor-skills.mjs", ["--project-only"]);
    runNode("scripts/lint-ecl.mjs");
    runNode("scripts/lint-encoding.mjs");
    runNode("scripts/lib/validate-stack-paths-ci-sync.mjs");

    const ciFiles = stagedFiles();
    runForgeCiSuite(ciFiles);
    runGenerativeCiSuite(ciFiles);

    if (ciFiles.some((f) => matchesAny(f, ["GenerativeUI_monorepo/docs/inbox/"]))) {
      runNode("scripts/inbox-audit.mjs", ["--lens", "funnel", "--strict"]);
    }

    ok("all CI pre-commit checks passed");
    return;
  }

  runNode("scripts/validate-changelog.mjs");

  const files = stagedFiles();
  const monitoredChanged = files.some((f) => matchesAny(f, MONITORED_PREFIXES));
  const changelogStaged = files.includes("CHANGELOG.md");

  if (monitoredChanged && !changelogStaged) {
    runNode("scripts/validate-changelog.mjs", ["--require-update"]);
  }

  const launchPaths = [
    ".vscode/launch.json",
    ".vscode/tasks.json",
    "scripts/launch-manifest.json",
  ];
  if (files.some((f) => launchPaths.includes(f))) {
    runNode("scripts/validate-launch-json.mjs");
    runNode("scripts/validate-launch-json.mjs", ["--require-manifest-sync"]);
  }

  const skillsPaths = [".cursor/skills/", ".vendor/", "scripts/cursor-ai/"];
  if (files.some((f) => matchesAny(f, skillsPaths))) {
    runNode("scripts/validate-cursor-skills.mjs", ["--project-only"]);
  }

  const harnessPaths = ["harness/", "docs/ECL.md", "docs/STATUS.md", "docs/ARCHITECTURE.md", "C4-Documentation/"];
  if (files.some((f) => matchesAny(f, harnessPaths))) {
    runNode("scripts/lint-ecl.mjs");
    runNode("scripts/lint-encoding.mjs");
  }

  const stackManifestPaths = ["scripts/lib/stack-paths.json", ".github/workflows/ci.yml"];
  if (files.some((f) => stackManifestPaths.includes(f))) {
    runNode("scripts/lib/validate-stack-paths-ci-sync.mjs");
  }

  runForgeCheckIfNeeded(files);

  if (isFull) {
    runForgeCiSuite(files.length > 0 ? files : gitLines("git diff --name-only HEAD~1 HEAD"));
    runGenerativeCiSuite(files.length > 0 ? files : gitLines("git diff --name-only HEAD~1 HEAD"));
  }

  const inboxPaths = ["GenerativeUI_monorepo/docs/inbox/"];
  if (files.some((f) => matchesAny(f, inboxPaths))) {
    runNode("scripts/inbox-audit.mjs", ["--lens", "funnel"]);
  }

  ok("staged changes passed pre-commit checks");
}

main();
