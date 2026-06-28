#!/usr/bin/env node
/**
 * Pre-push checks — path-filtered stack verify (mirror CI).
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function ok(msg) {
  console.log(`pre-push: ${msg}`);
}

const result = spawnSync(process.execPath, [resolve(__dirname, "lib/run-verify-stack.mjs"), "--pre-push"], {
  cwd: ROOT,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

ok("pre-push checks passed");
