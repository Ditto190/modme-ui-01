#!/usr/bin/env node
/**
 * Unified verify entry: path-filtered forge + generative (full CI parity).
 * Usage: node scripts/lib/run-verify-all.mjs [--pre-push]
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const prePush = process.argv.includes("--pre-push");

const verifyScript = prePush
  ? resolve(__dirname, "run-verify-stack.mjs")
  : null;

if (prePush) {
  const result = spawnSync(process.execPath, [verifyScript, "--pre-push"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}

console.log("verify:all — running full forge + generative CI parity");

for (const script of ["verify:forge", "verify:generative"]) {
  console.log(`\n=== yarn ${script} ===\n`);
  const result = spawnSync("yarn", [script], { cwd: ROOT, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`verify:all failed at yarn ${script}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nverify:all passed");
