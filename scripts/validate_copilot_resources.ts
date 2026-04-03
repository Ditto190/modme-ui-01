#!/usr/bin/env node
/**
 * validate_copilot_resources.ts
 *
 * Validates LLM/agent-related resource files before they are merged.
 *
 * Usage:
 *   npx ts-node scripts/validate_copilot_resources.ts <path-to-file-list>
 *
 * The argument must be a path to a plain-text file containing one file path
 * per line (relative to the repository root).  The script:
 *
 *  1. Reads each listed file.
 *  2. Verifies the first non-empty line starts with `#` (Markdown heading).
 *  3. Warns (non-fatal) if the content does not reference AGENTS.md or
 *     awesome-copilot.
 *
 * Exit codes:
 *   0  All files passed the heading rule (warnings may have been emitted).
 *   1  At least one file failed the heading rule or could not be read.
 */

import * as fs from "fs";
import * as path from "path";

const REQUIRED_HEADING_RE = /^#\s/;
const REFERENCE_PATTERNS = ["AGENTS.md", "awesome-copilot"];

function validateFile(filePath: string): boolean {
  const absolutePath = path.resolve(filePath);

  let content: string;
  try {
    content = fs.readFileSync(absolutePath, "utf-8");
  } catch (err) {
    console.error(`ERROR: Cannot read file: ${filePath}`);
    console.error(`       ${(err as Error).message}`);
    return false;
  }

  const lines = content.split(/\r?\n/);
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) ?? "";

  if (!REQUIRED_HEADING_RE.test(firstNonEmpty)) {
    console.error(
      `FAIL: ${filePath} — first non-empty line does not start with a Markdown heading (#).`
    );
    console.error(`      Got: ${JSON.stringify(firstNonEmpty.slice(0, 80))}`);
    return false;
  }

  const hasReference = REFERENCE_PATTERNS.some((pattern) =>
    content.includes(pattern)
  );
  if (!hasReference) {
    console.warn(
      `WARN: ${filePath} — does not reference AGENTS.md or awesome-copilot. ` +
        `Consider adding a cross-reference for agent discoverability.`
    );
  }

  console.log(`OK:   ${filePath}`);
  return true;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error(
      "Usage: npx ts-node scripts/validate_copilot_resources.ts <file-list>"
    );
    process.exit(1);
  }

  const listFile = args[0];
  let listContent: string;
  try {
    listContent = fs.readFileSync(listFile, "utf-8");
  } catch (err) {
    console.error(`ERROR: Cannot read file list: ${listFile}`);
    console.error(`       ${(err as Error).message}`);
    process.exit(1);
  }

  const files = listContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (files.length === 0) {
    console.log("No files to validate.");
    process.exit(0);
  }

  console.log(`Validating ${files.length} file(s)...\n`);
  let allPassed = true;
  for (const file of files) {
    const passed = validateFile(file);
    if (!passed) {
      allPassed = false;
    }
  }

  console.log("");
  if (allPassed) {
    console.log("✅ All files passed validation.");
    process.exit(0);
  } else {
    console.error("❌ One or more files failed validation.");
    process.exit(1);
  }
}

main();
