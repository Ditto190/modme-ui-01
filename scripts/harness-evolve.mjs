#!/usr/bin/env node
/**
 * Archive harness changes older than threshold; queue evolution notes.
 */
import { existsSync, readFileSync, readdirSync, statSync, appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ACTIVE = join(ROOT, "harness/changes/active");
const EVOLUTION = join(ROOT, "harness/evolution/pending.md");
const ARCHIVE_DAYS = 30;

if (!existsSync(ACTIVE)) {
  console.log("harness-evolve: no active changes");
  process.exit(0);
}

mkdirSync(join(ROOT, "harness/evolution"), { recursive: true });
const now = Date.now();
const threshold = ARCHIVE_DAYS * 24 * 60 * 60 * 1000;
const stale = [];

for (const entry of readdirSync(ACTIVE, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(ACTIVE, entry.name);
  const mtime = statSync(dir).mtimeMs;
  if (now - mtime > threshold) stale.push(entry.name);
}

if (stale.length === 0) {
  console.log("harness-evolve: no stale active changes");
  process.exit(0);
}

const note = `\n## ${new Date().toISOString().slice(0, 10)} — stale active changes\n\nCandidates for archive (> ${ARCHIVE_DAYS}d): ${stale.join(", ")}\n\nRun: \`node scripts/harness-change.mjs archive <slug>\`\n`;
appendFileSync(EVOLUTION, note, "utf8");
console.log(`harness-evolve: appended ${stale.length} candidate(s) to harness/evolution/pending.md`);
