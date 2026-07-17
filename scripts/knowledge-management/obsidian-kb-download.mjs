#!/usr/bin/env node
/**
 * Download manifest URLs via local Firecrawl into .firecrawl/awesome-obsidian/pages/
 * Usage: node scripts/knowledge-management/obsidian-kb-download.mjs [--limit N] [--dry-run]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeUrl, checkHealth } from "../lib/firecrawl-local-client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT_DIR = join(ROOT, ".firecrawl/awesome-obsidian");
const MANIFEST = join(OUT_DIR, "manifest.json");
const PAGES = join(OUT_DIR, "pages");

const dryRun = process.argv.includes("--dry-run");
const limitIdx = process.argv.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : Infinity;

if (!existsSync(MANIFEST)) {
  console.error("Missing manifest. Run: yarn obsidian:kb:manifest");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const entries = (manifest.entries || []).slice(0, Number.isFinite(limit) ? limit : undefined);

if (!dryRun) {
  const health = await checkHealth();
  if (!health.ok) {
    console.error(`Firecrawl not healthy at ${health.baseUrl}: ${health.error || health.status}`);
    console.error("Start with: yarn firecrawl:up");
    process.exit(2);
  }
}

mkdirSync(PAGES, { recursive: true });
const results = [];

function slugFromUrl(url) {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

for (const entry of entries) {
  const slug = slugFromUrl(entry.url);
  const outFile = join(PAGES, `${entry.category || "misc"}__${slug}.md`);
  console.log(`${dryRun ? "DRY" : "SCRAPE"} ${entry.url}`);
  if (dryRun) {
    results.push({ ...entry, status: "dry-run", file: outFile });
    continue;
  }
  try {
    const scraped = await scrapeUrl(entry.url, { onlyMainContent: true });
    const md = scraped?.markdown || scraped?.data?.markdown || scraped?.data?.data?.markdown || "";
    const body = `---
source: ${JSON.stringify(entry.url)}
category: ${entry.category || "misc"}
title: ${JSON.stringify(entry.title || "")}
tags:
  - obsidian-kb
  - ${entry.category || "misc"}
scraped_at: ${new Date().toISOString()}
---

# ${entry.title || entry.url}

**URL:** ${entry.url}

${md || "_No markdown returned._"}
`;
    writeFileSync(outFile, body, "utf8");
    results.push({ ...entry, status: "ok", file: outFile });
  } catch (err) {
    console.error(`  FAIL ${err.message}`);
    results.push({ ...entry, status: "error", error: err.message });
  }
}

writeFileSync(join(OUT_DIR, "download-results.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
console.log(`Done. ${results.filter((r) => r.status === "ok").length} ok / ${results.length} total`);
