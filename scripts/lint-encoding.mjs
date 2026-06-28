#!/usr/bin/env node
/**
 * Validate UTF-8 encoding on harness and ECL docs (no BOM, no invalid sequences).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SCAN_ROOTS = ["harness/", "docs/ECL.md", "docs/STATUS.md", "C4-Documentation/"];

let errors = 0;

function walk(rel) {
  const abs = join(ROOT, rel);
  try {
    const st = statSync(abs);
    if (st.isFile()) {
      checkFile(rel, abs);
      return;
    }
    if (st.isDirectory()) {
      for (const entry of readdirSync(abs)) {
        walk(join(rel, entry));
      }
    }
  } catch {
    // skip missing
  }
}

function checkFile(rel, abs) {
  const buf = readFileSync(abs);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    console.error(`lint-encoding: BOM in ${rel}`);
    errors += 1;
  }
  try {
    buf.toString("utf8");
  } catch {
    console.error(`lint-encoding: invalid UTF-8 in ${rel}`);
    errors += 1;
  }
}

for (const root of SCAN_ROOTS) walk(root);

if (errors > 0) process.exit(1);
console.log("lint-encoding: passed");
