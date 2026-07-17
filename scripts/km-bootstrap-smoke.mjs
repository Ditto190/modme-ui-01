#!/usr/bin/env node
/**
 * Smoke: km-session-bootstrap.ps1 loads and exits 0 with all heavy steps skipped.
 * No Dolt / Entire / Beads required.
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const script = resolve(ROOT, "scripts/km-session-bootstrap.ps1");

if (!existsSync(script)) {
  console.error("km-bootstrap-smoke: missing scripts/km-session-bootstrap.ps1");
  process.exit(1);
}

const result = spawnSync(
  "powershell",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    script,
    "-SkipDolt",
    "-SkipEntire",
    "-SkipBeads",
    "-SkipStatus",
  ],
  { cwd: ROOT, encoding: "utf8" }
);

const out = `${result.stdout || ""}${result.stderr || ""}`;
if (result.status !== 0) {
  console.error("km-bootstrap-smoke: FAILED");
  console.error(out);
  process.exit(result.status ?? 1);
}

if (!/KM session bootstrap/i.test(out) && !/KM bootstrap OK/i.test(out)) {
  console.error("km-bootstrap-smoke: expected bootstrap marker in stdout");
  console.error(out);
  process.exit(1);
}

console.log("km-bootstrap-smoke: ok");
process.exit(0);
