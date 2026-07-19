#!/usr/bin/env node
/**
 * Move flat / mis-nested inbox clips into inbox/web-clipper/{parent}/
 * using frontmatter `source:` (or `source` YAML) URL hierarchy.
 *
 * Usage:
 *   node scripts/knowledge-management/organize-web-clipper.mjs [--dry-run] [--migrate-existing]
 */
import { readdirSync, readFileSync, mkdirSync, renameSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const INBOX = resolve(ROOT, "GenerativeUI_monorepo/docs/inbox");
const WEB_CLIPPER = join(INBOX, "web-clipper");

const dryRun = process.argv.includes("--dry-run");
const migrateExisting = process.argv.includes("--migrate-existing");

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return {};
  const block = raw.slice(3, end).trim();
  const out = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function safeParent(name) {
  return String(name || "misc")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 80) || "misc";
}

/**
 * Derive web-clipper parent folder from source URL.
 * @param {string} sourceUrl
 * @returns {string}
 */
export function parentFromSource(sourceUrl) {
  if (!sourceUrl || typeof sourceUrl !== "string") return "misc";
  let u;
  try {
    u = new URL(sourceUrl.trim());
  } catch {
    return "misc";
  }
  const host = u.hostname.replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "github.com" || host === "raw.githubusercontent.com" || host.endsWith("githubusercontent.com")) {
    // github.com/{owner}/{repo}/...
    if (parts.length >= 2) return safeParent(parts[1]);
    if (parts.length >= 1) return safeParent(parts[0]);
  }
  if (host === "gist.github.com" && parts.length >= 1) {
    return safeParent(parts[0]);
  }
  if (
    host === "obsidian.md" ||
    host === "help.obsidian.md" ||
    host === "publish.obsidian.md" ||
    host === "docs.obsidian.md"
  ) {
    return "obsidian";
  }
  return safeParent(host.split(".")[0] || host);
}

function walkMd(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".git") continue;
      walkMd(full, acc);
      continue;
    }
    if (name.name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

function shouldConsider(filePath) {
  const rel = relative(INBOX, filePath).replace(/\\/g, "/");
  if (rel.startsWith("web-clipper/")) {
    if (!migrateExisting) return false;
    // Already nested: only move if wrong parent vs source
    return true;
  }
  // Flat under inbox/ or other subfolders (shopping-list etc.) — only top-level + known clip dumps
  if (!rel.includes("/")) return true;
  // Historical flat dumps sometimes live only at inbox root; skip curated folders
  const top = rel.split("/")[0];
  if (["web-clipper"].includes(top)) return true;
  return false;
}

function targetDirFor(filePath, parent) {
  return join(WEB_CLIPPER, parent);
}

let moved = 0;
let skipped = 0;
let errors = 0;

const files = walkMd(INBOX).filter(shouldConsider);

for (const file of files) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    errors += 1;
    continue;
  }
  const fm = parseFrontmatter(raw);
  const source = fm.source || fm.url || "";
  if (!source) {
    skipped += 1;
    continue;
  }
  const parent = parentFromSource(source);
  const destDir = targetDirFor(file, parent);
  const dest = join(destDir, basename(file));
  if (resolve(file) === resolve(dest)) {
    skipped += 1;
    continue;
  }
  // If already under web-clipper/{correct}/ skip
  const rel = relative(INBOX, file).replace(/\\/g, "/");
  if (rel.startsWith(`web-clipper/${parent}/`)) {
    skipped += 1;
    continue;
  }

  console.log(`${dryRun ? "DRY" : "MOVE"} ${rel} → web-clipper/${parent}/${basename(file)}`);
  if (!dryRun) {
    mkdirSync(destDir, { recursive: true });
    if (existsSync(dest)) {
      console.error(`  SKIP exists: ${dest}`);
      errors += 1;
      continue;
    }
    renameSync(file, dest);
  }
  moved += 1;
}

console.log(`Done. moved=${moved} skipped=${skipped} errors=${errors} dryRun=${dryRun}`);
if (errors) process.exitCode = 1;
