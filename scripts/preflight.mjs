#!/usr/bin/env node
/**
 * ModMe pre-flight pipeline — unified lint, test, build, and guard checks.
 *
 * Usage:
 *   node scripts/preflight.mjs --profile fast
 *   node scripts/preflight.mjs --profile full
 *   node scripts/preflight.mjs --profile ci --report
 *   node scripts/preflight.mjs --profile tdd-red --test scripts/__tests__/foo.test.mjs
 *   node scripts/preflight.mjs --list-profiles
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runForge } from "./lib/run-forge.mjs";
import {
  buildPreflightReport,
  writePreflightReport,
  DEFAULT_REPORT_PATH,
} from "./lib/preflight-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(__dirname, "preflight.manifest.json");

/** @type {Record<string, unknown>} */
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

const args = process.argv.slice(2);
const flags = parseFlags(args);

/** @type {{ name: string; ok: boolean; ms: number; skipped?: boolean; error?: string }[]} */
const results = [];

/** @type {{ forge: boolean; generative: boolean; inbox: boolean }} */
let lastAffected = { forge: false, generative: false, inbox: false };

function parseFlags(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {
    profile: "fast",
    json: false,
    report: false,
    continue: false,
    listProfiles: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") out.json = true;
    else if (arg === "--report") out.report = true;
    else if (arg === "--continue") out.continue = true;
    else if (arg === "--list-profiles") out.listProfiles = true;
    else if (arg === "--profile" && argv[i + 1]) out.profile = argv[++i];
    else if (arg === "--test" && argv[i + 1]) out.test = argv[++i];
    else if (arg === "--skip-build") out.skipBuild = true;
    else if (arg === "--skip-test") out.skipTest = true;
    else if (arg === "--skip-lint") out.skipLint = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

function gitBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function secretGuard() {
  const tracked = gitLines("git ls-files");
  const bad = tracked.filter((f) =>
    /(^|\/)\.env$|\.env\.local$|\.env\.production$/.test(f),
  );
  if (bad.length > 0) {
    throw new Error(`tracked secret env files: ${bad.join(", ")}`);
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

function changedFiles() {
  const base = process.env.GITHUB_BASE_SHA;
  const head = process.env.GITHUB_SHA ?? "HEAD";
  if (base && head) {
    return gitLines(`git diff --name-only ${base} ${head}`);
  }
  const mergeBase = gitLines("git merge-base HEAD dev")[0];
  if (mergeBase) {
    return gitLines(`git diff --name-only ${mergeBase} HEAD`);
  }
  return gitLines("git diff --name-only HEAD~1 HEAD");
}

function affectedStacks(files) {
  const { forgePrefix, generativePrefix, inboxPrefix } = manifest.affected;
  return {
    forge: files.some((f) => f.startsWith(forgePrefix)),
    generative: files.some((f) => f.startsWith(generativePrefix)),
    inbox: files.some((f) => f.startsWith(inboxPrefix)),
  };
}

function shouldSkipStep(stepId) {
  if (flags.skipBuild && (stepId === "forge-build" || stepId === "generative-verify")) {
    return true;
  }
  if (flags.skipTest && (stepId === "forge-test" || stepId.startsWith("tdd-"))) {
    return true;
  }
  if (flags.skipLint && (stepId === "forge-check" || stepId === "tdd-green-lint")) {
    return true;
  }
  return false;
}

function requireTestPath() {
  if (!flags.test || typeof flags.test !== "string") {
    throw new Error("--test <path> required for TDD profiles");
  }
  return flags.test;
}

function runScopedTest(expectFailure) {
  const testPath = requireTestPath();
  const absPath = path.isAbsolute(testPath) ? testPath : path.join(ROOT, testPath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`test file not found: ${testPath}`);
  }

  let result;
  if (testPath.replace(/\\/g, "/").startsWith("next-forge/")) {
    const rel = testPath.replace(/^next-forge\//, "");
    result = runForge(ROOT, ["run", "test", "--", rel]);
  } else {
    result = spawnSync("yarn", ["vitest", "run", testPath], {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
    });
  }

  const status = result.status ?? 1;
  if (expectFailure) {
    if (status === 0) {
      throw new Error("tdd-red: expected test failure but tests passed");
    }
    return;
  }
  if (status !== 0) {
    throw new Error(`scoped test exited ${status}`);
  }
}

function runStep(stepId) {
  /** @type {{ title: string; runner: string; optional?: boolean; script?: string; args?: string[]; cwd?: string; handler?: string }} */
  const step = manifest.steps[stepId];
  if (!step) {
    throw new Error(`unknown step: ${stepId}`);
  }
  if (shouldSkipStep(stepId)) {
    return { skipped: true };
  }

  if (step.handler === "secretGuard") {
    secretGuard();
    return {};
  }

  if (step.handler === "tddRedTest") {
    runScopedTest(true);
    return {};
  }

  if (step.handler === "tddGreenTest") {
    runScopedTest(false);
    return {};
  }

  if (step.runner === "node-inline") {
    return {};
  }

  if (step.runner === "node") {
    const scriptPath = path.join(ROOT, step.script);
    const result = spawnSync(process.execPath, [scriptPath, ...(step.args ?? [])], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      throw new Error(`${stepId} exited ${result.status ?? 1}`);
    }
    return {};
  }

  if (step.runner === "powershell") {
    if (process.platform !== "win32") {
      return { skipped: true };
    }
    const scriptPath = path.join(ROOT, step.script);
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...(step.args ?? [])],
      { cwd: ROOT, stdio: "inherit" },
    );
    if (result.status !== 0 && !step.optional) {
      throw new Error(`${stepId} exited ${result.status ?? 1}`);
    }
    return {};
  }

  if (step.runner === "yarn") {
    const result = spawnSync("yarn", step.args ?? [], { cwd: ROOT, stdio: "inherit", shell: true });
    if (result.status !== 0) {
      throw new Error(`${stepId} exited ${result.status ?? 1}`);
    }
    return {};
  }

  if (step.runner === "yarn-cwd") {
    const cwd = path.join(ROOT, step.cwd);
    const result = spawnSync("yarn", step.args ?? [], { cwd, stdio: "inherit", shell: true });
    if (result.status !== 0) {
      throw new Error(`${stepId} exited ${result.status ?? 1}`);
    }
    return {};
  }

  if (step.runner === "forge") {
    const result = runForge(ROOT, step.args ?? []);
    if (result.status !== 0 && !step.optional) {
      throw new Error(`${stepId} exited ${result.status ?? 1}`);
    }
    return {};
  }

  throw new Error(`unsupported runner: ${step.runner}`);
}

async function runSteps(stepIds, stageMeta = {}) {
  const parallel = stageMeta.parallel === true;
  const optional = stageMeta.optional === true;

  const runners = stepIds.map(async (stepId) => {
    const step = manifest.steps[stepId];
    const title = step?.title ?? stepId;
    const start = Date.now();

    if (shouldSkipStep(stepId)) {
      results.push({ name: stepId, ok: true, ms: 0, skipped: true });
      if (!flags.json) {
        console.log(`  skip ${title}`);
      }
      return;
    }

    if (!flags.json) {
      console.log(`  > ${title}`);
    }

    try {
      const outcome = runStep(stepId);
      if (outcome.skipped) {
        results.push({ name: stepId, ok: true, ms: Date.now() - start, skipped: true });
        if (!flags.json) console.log(`  skip ${title} (platform)`);
        return;
      }
      results.push({ name: stepId, ok: true, ms: Date.now() - start });
      if (!flags.json) console.log(`  ok ${title} (${Date.now() - start}ms)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name: stepId, ok: false, ms: Date.now() - start, error: message });
      if (!flags.json) console.error(`  FAIL ${title}: ${message}`);
      if (!flags.continue && !optional && !step?.optional) {
        throw error;
      }
    }
  });

  if (parallel) {
    await Promise.allSettled(runners);
  } else {
    for (const runner of runners) {
      await runner;
    }
  }

  const stageFailed = results.filter((r) => !r.ok && stepIds.includes(r.name));
  if (stageFailed.length > 0 && !flags.continue && !optional) {
    throw new Error(`${stageFailed.length} step(s) failed in stage`);
  }
}

function runAffectedStacks() {
  const files = changedFiles();
  const affected = affectedStacks(files);
  lastAffected = affected;

  if (!flags.json) {
    console.log(`  affected: forge=${affected.forge} generative=${affected.generative} inbox=${affected.inbox}`);
  }

  if (!affected.forge && !affected.generative) {
    if (!flags.json) {
      console.log("  skip stack quality (no forge/generative changes detected)");
    }
    return;
  }

  /** @type {Promise<void>[]} */
  const jobs = [];

  if (affected.forge) {
    jobs.push(
      (async () => {
        await runSteps(["forge-check", "forge-test", "forge-build"], { parallel: false });
        await runSteps(["forge-boundaries"], { optional: true });
      })(),
    );
  }

  if (affected.generative) {
    jobs.push(runSteps(["generative-verify"], { parallel: false }));
  }

  return Promise.all(jobs).then(async () => {
    if (affected.inbox) {
      await runSteps(["inbox-audit"], { optional: true });
    }
  });
}

function printHelp() {
  console.log(`ModMe preflight — lint, test, build, guards

Usage:
  yarn preflight [--profile <name>] [options]

Profiles:`);
  for (const [id, profile] of Object.entries(manifest.profiles)) {
    console.log(`  ${id.padEnd(14)} ${profile.label}`);
  }
  console.log(`
Options:
  --test <path>  Scoped test file (required for tdd-* profiles)
  --report       Write ${DEFAULT_REPORT_PATH}
  --skip-build   Skip turbo build / generative build
  --skip-test    Skip turbo test
  --skip-lint    Skip ultracite check
  --continue     Collect failures instead of fail-fast
  --json         Machine-readable summary (+ report when combined with --report)
  --list-profiles
`);
}

function emitOutputs(profileName, failed, totalMs) {
  const ok = failed.length === 0;
  const report = buildPreflightReport({
    profile: profileName,
    branch: gitBranch(),
    affected: lastAffected,
    ok,
    durationMs: totalMs,
    results,
    stepsMeta: manifest.steps,
  });

  if (flags.report) {
    const written = writePreflightReport(report, ROOT);
    if (!flags.json) {
      console.log(`Report: ${written}`);
    }
  }

  if (flags.json) {
    console.log(JSON.stringify({ ...report, results }, null, 2));
  } else {
    console.log("");
    if (ok) {
      console.log(`OK preflight [${profileName}] passed (${totalMs}ms)`);
    } else {
      console.error(`FAIL preflight [${profileName}] — ${failed.length} step(s) failed (${totalMs}ms)`);
      for (const f of failed) {
        console.error(`  - ${f.name}: ${f.error ?? "failed"}`);
      }
    }
  }

  return ok;
}

async function main() {
  if (flags.help) {
    printHelp();
    return;
  }

  if (flags.listProfiles) {
    console.log(JSON.stringify(manifest.profiles, null, 2));
    return;
  }

  const profile = manifest.profiles[flags.profile];
  if (!profile) {
    console.error(`Unknown profile: ${flags.profile}`);
    printHelp();
    process.exit(1);
  }

  if (flags.profile.startsWith("tdd-") && !flags.test) {
    console.error(`Profile ${flags.profile} requires --test <path>`);
    process.exit(1);
  }

  const started = Date.now();
  if (!flags.json) {
    console.log(`\n== ModMe preflight [${flags.profile}] ${profile.label} ==\n`);
  }

  try {
    for (const stageId of profile.stages) {
      const stage = manifest.stages[stageId];
      if (!stage) {
        throw new Error(`unknown stage: ${stageId}`);
      }

      if (!flags.json) {
        console.log(`-- ${stageId} --`);
      }

      if (stage.dynamic === "affected-stacks") {
        await runAffectedStacks();
        continue;
      }

      await runSteps(stage.steps, stage);
    }
  } catch {
    // fail-fast already recorded in results
  }

  const failed = results.filter((r) => !r.ok);
  const totalMs = Date.now() - started;
  const ok = emitOutputs(flags.profile, failed, totalMs);

  process.exit(ok ? 0 : 1);
}

main();
