#!/usr/bin/env node
/**
 * Validate ModMe path profiles for control-cli orchestration bootstrap.
 * Usage: node scripts/validate-path-profiles.mjs [--human] [--strict] [--no-write-cache] [--help]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalizeUnderRoot,
  detectProfile,
  evaluateDecisionTree,
  resolveRepoRoot,
  resolveRequiredPaths,
  writeResolvedCache,
} from "./lib/resolve-path-profile.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(__dirname, "..");
const CONFIG_PATH = resolve(DEFAULT_ROOT, "config/control-cli/path-profiles.json");

const BRIEF =
  "Validate ModMe repo path profiles: detect main vs agent worktree, confine paths, emit remediation findings.";

const args = process.argv.slice(2);

function fail(code, message, suggestion) {
  const payload = { error: true, code, message, suggestion };
  process.stderr.write(`${JSON.stringify(payload)}\n`);
  process.exit(code === "USAGE" ? 2 : 1);
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    fail("CONFIG", `Missing config: ${CONFIG_PATH}`, "Restore config/control-cli/path-profiles.json");
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
}

function countBySeverity(findings) {
  return findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    { error: 0, warn: 0, info: 0 },
  );
}

function shouldFail(findings, strict) {
  const counts = countBySeverity(findings);
  if (counts.error > 0) {
    return true;
  }
  return strict && counts.warn > 0;
}

if (args.includes("--brief")) {
  console.log(BRIEF);
  process.exit(0);
}

if (args.includes("--help")) {
  console.log(
    JSON.stringify(
      {
        brief: BRIEF,
        commands: [
          { name: "default", description: "Validate path profile; JSON to stdout" },
          { name: "--human", description: "Transcript-style output with [OK]/[!] tags" },
          { name: "--strict", description: "Treat warn-severity findings as failures (exit 1)" },
          { name: "--no-write-cache", description: "Skip writing .cache/control-cli/resolved-path-profile.json" },
          { name: "--brief", description: "One-line identity" },
        ],
        examples: [
          "node scripts/validate-path-profiles.mjs",
          "node scripts/validate-path-profiles.mjs --human",
          "node scripts/validate-path-profiles.mjs --strict",
          "yarn harness:paths",
          "node scripts/control-cli-harness.mjs --probe=paths",
        ],
        config: "config/control-cli/path-profiles.json",
        exitCodes: { 0: "no error-severity findings (warns ok unless --strict)", 1: "validation failed", 2: "usage/config error" },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const asHuman = args.includes("--human");
const strict = args.includes("--strict");
const writeCache = !args.includes("--no-write-cache");

const config = loadConfig();
const repoRoot = resolveRepoRoot(process.cwd());
if (!repoRoot) {
  fail(
    "NOT_REPO",
    "Could not resolve ModMe repo root from cwd",
    "cd to repo or worktree root containing scripts/control-cli-harness.mjs",
  );
}

const profile = detectProfile(repoRoot, config.profiles);
const resolvedPaths = resolveRequiredPaths(repoRoot, profile);
const findings = evaluateDecisionTree(repoRoot, profile, config.decisionTree);

const missingRequired = (profile?.requirePaths ?? []).filter((rel) => {
  const canon = canonicalizeUnderRoot(repoRoot, rel);
  return !canon.ok || !existsSync(canon.path);
});

const counts = countBySeverity(findings);
const ok = !shouldFail(findings, strict);

const report = {
  at: new Date().toISOString(),
  repoRoot,
  profileId: profile?.id ?? null,
  configVersion: config.version,
  ok,
  strict,
  counts,
  missingRequired,
  resolvedPaths,
  findings,
};

if (writeCache) {
  const cachePayload = {
    version: config.version,
    resolvedAt: report.at,
    repoRoot,
    profileId: profile?.id ?? null,
    paths: resolvedPaths,
    findings,
    ok,
  };
  const cacheResult = writeResolvedCache(repoRoot, cachePayload, config.cacheRelative);
  report.cache = cacheResult.ok
    ? { written: true, path: cacheResult.cachePath }
    : { written: false, error: cacheResult.error };
}

if (asHuman) {
  console.log(`${ok ? "[OK]" : "[!]"} path-profiles profile=${profile?.id ?? "unknown"}`);
  console.log(`repoRoot: ${repoRoot}`);
  if (missingRequired.length > 0) {
    console.log(`missing required: ${missingRequired.join(", ")}`);
  }
  for (const finding of findings) {
    const tag = finding.severity === "error" ? "[!]" : finding.severity === "warn" ? "[!]" : "[i]";
    console.log(`${tag} ${finding.id}: ${finding.message}`);
    for (const step of finding.remediation) {
      console.log(`    -> ${step}`);
    }
  }
  if (report.cache?.written) {
    console.log(`cache: ${report.cache.path}`);
  }
  process.exit(ok ? 0 : 1);
}

console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 1);
