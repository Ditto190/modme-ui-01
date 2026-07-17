#!/usr/bin/env node
/**
 * List inbox web-clipper notes that lack a wikilink to an ADAM MOC (fleeting → permanent queue).
 * Usage: node scripts/knowledge-management/zettel-promote.mjs [--dry-run]
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const INBOX_WC = resolve(ROOT, "GenerativeUI_monorepo/docs/inbox/web-clipper");
const MOC_HINTS = ["MOC Obsidian", "MOC Clipper", "MOC Zettelkasten", "ADAM Index"];

const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--apply");

function walkMd(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) walkMd(full, acc);
    else if (name.name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

function hasMocLink(body) {
  return MOC_HINTS.some((m) => body.includes(`[[${m}`));
}

const files = walkMd(INBOX_WC);
const missing = [];
for (const f of files) {
  const body = readFileSync(f, "utf8");
  if (!hasMocLink(body)) missing.push(relative(ROOT, f).replace(/\\/g, "/"));
}

console.log(`Inbox web-clipper notes without MOC wikilink: ${missing.length}/${files.length}`);
for (const m of missing.slice(0, 50)) console.log(`  - ${m}`);
if (missing.length > 50) console.log(`  … +${missing.length - 50} more`);
console.log(dryRun ? "Dry-run only (no file moves). Add [[MOC Obsidian]] when promoting to permanent." : "Apply not implemented — promote manually via Unique note creator.");
