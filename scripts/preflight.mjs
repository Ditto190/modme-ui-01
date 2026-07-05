#!/usr/bin/env node
/**
 * Run preflight profiles from scripts/preflight.manifest.json
 * Usage: node scripts/preflight.mjs --profile worktree-shared-deps
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function quoteForCmd(arg) {
  const s = String(arg);
  if (/[\s"&|<>^]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function shouldUseShellString(cmd) {
  return (
    process.platform === "win32" &&
    !/[\\/]/.test(cmd) &&
    !/\.(exe|bat)$/i.test(cmd)
  );
}

function parseArgs(argv) {
  let profile = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--profile" && argv[i + 1]) {
      profile = argv[++i];
    }
  }
  if (!profile) {
    console.error("Usage: node scripts/preflight.mjs --profile <name>");
    process.exit(1);
  }
  return { profile };
}

const { profile } = parseArgs(process.argv.slice(2));
const manifestPath = resolve(__dirname, "preflight.manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const cfg = manifest.profiles?.[profile];

if (!cfg) {
  console.error(`Unknown profile: ${profile}`);
  process.exit(1);
}

console.log(`preflight: profile=${profile}`);
let failed = false;

for (const step of cfg.steps) {
  console.log(`  step: ${step.id}`);
  const argv = step.args ?? [];
  const result = shouldUseShellString(step.cmd)
    ? spawnSync([step.cmd, ...argv].map(quoteForCmd).join(" "), {
        cwd: ROOT,
        stdio: "inherit",
        shell: true,
      })
    : spawnSync(step.cmd, argv, {
        cwd: ROOT,
        stdio: "inherit",
        shell: false,
      });
  if (result.status !== 0) {
    failed = true;
    break;
  }
}

if (failed) {
  console.error(`preflight: FAIL profile=${profile}`);
  process.exit(1);
}

console.log(`preflight: OK profile=${profile}`);
