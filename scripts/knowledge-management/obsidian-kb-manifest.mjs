#!/usr/bin/env node
/**
 * Build phase-1 Obsidian KB URL manifest from:
 * - Seeded help.obsidian.md pages
 * - Plugin links in awesome-obsidian inbox clip (cap 80)
 *
 * Usage: node scripts/knowledge-management/obsidian-kb-manifest.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT_DIR = join(ROOT, ".firecrawl/awesome-obsidian");
const MANIFEST = join(OUT_DIR, "manifest.json");
const INBOX_WC = join(ROOT, "GenerativeUI_monorepo/docs/inbox/web-clipper");

const HELP_SEEDS = [
  { url: "https://help.obsidian.md/syntax", category: "help", title: "Basic formatting syntax" },
  { url: "https://help.obsidian.md/advanced-syntax", category: "help", title: "Advanced formatting syntax" },
  { url: "https://help.obsidian.md/plugins/format-converter", category: "help", title: "Format converter" },
  { url: "https://help.obsidian.md/import/zettelkasten", category: "help", title: "Import Zettelkasten notes" },
  { url: "https://help.obsidian.md/plugins", category: "help", title: "Core plugins" },
  { url: "https://obsidian.md/help/syntax", category: "help", title: "Basic formatting syntax (alias)" },
  { url: "https://obsidian.md/help/advanced-syntax", category: "help", title: "Advanced formatting syntax (alias)" },
  { url: "https://obsidian.md/help/plugins/format-converter", category: "help", title: "Format converter (alias)" },
  { url: "https://obsidian.md/help/import/zettelkasten", category: "help", title: "Import Zettelkasten (alias)" },
  { url: "https://obsidian.md/help/plugins", category: "help", title: "Core plugins (alias)" },
  { url: "https://help.obsidian.md/plugins/unique-note", category: "help", title: "Unique note creator" },
  { url: "https://help.obsidian.md/bases", category: "help", title: "Bases" },
  { url: "https://help.obsidian.md/plugins/canvas", category: "help", title: "Canvas" },
  { url: "https://help.obsidian.md/web-clipper/templates", category: "help", title: "Web Clipper templates" },
];

const PLUGIN_CAP = 80;

function findAwesomeClip() {
  if (!existsSync(INBOX_WC)) return null;
  const candidates = [];
  const stack = [INBOX_WC];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) stack.push(full);
      else if (/awesome-obsidian/i.test(name.name) && name.name.endsWith(".md")) {
        candidates.push(full);
      }
    }
  }
  // Prefer kmaasrud curated list over other awesome-* forks
  const preferred = candidates.find((p) => /kmaasrud/i.test(p));
  return preferred || candidates[0] || null;
}

function extractGithubLinks(md, sectionHeading) {
  const lines = md.split("\n");
  let inSection = false;
  const urls = [];
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      const heading = line.replace(/^##\s+/, "").trim().toLowerCase();
      inSection = heading === sectionHeading.toLowerCase() || heading.startsWith(sectionHeading.toLowerCase());
      continue;
    }
    if (!inSection) continue;
    const re = /\[([^\]]+)\]\((https:\/\/github\.com\/[^)\s#]+)\)/g;
    let m;
    while ((m = re.exec(line))) {
      const url = m[2].replace(/\/$/, "");
      // Require owner/repo (skip profile-only links)
      if (!/^https:\/\/github\.com\/[^/]+\/[^/]+/.test(url)) continue;
      urls.push({ title: m[1], url });
    }
  }
  return urls;
}

/** Fallback: all owner/repo links in file when Plugins section is thin (truncated clip). */
function extractAllRepoLinks(md) {
  const urls = [];
  const re = /\[([^\]]+)\]\((https:\/\/github\.com\/[^/]+\/[^/)\s#]+)\)/g;
  let m;
  while ((m = re.exec(md))) {
    urls.push({ title: m[1], url: m[2].replace(/\/$/, "") });
  }
  return urls;
}

const entries = [];
const seen = new Set();

function add(entry) {
  const key = entry.url.replace(/\/$/, "");
  if (seen.has(key)) return;
  seen.add(key);
  entries.push({ ...entry, url: key });
}

for (const seed of HELP_SEEDS) add(seed);

const awesomePath = findAwesomeClip();
if (awesomePath) {
  const md = readFileSync(awesomePath, "utf8");
  let plugins = extractGithubLinks(md, "Plugins");
  if (plugins.length < 10) {
    // Truncated clip: take repo links from whole note, cap PLUGIN_CAP
    plugins = extractAllRepoLinks(md);
  }
  plugins = plugins.slice(0, PLUGIN_CAP);
  for (const p of plugins) {
    add({ url: p.url, category: "plugins", title: p.title, sourceClip: awesomePath });
  }
  console.log(`Awesome clip: ${awesomePath} → ${plugins.length} plugin URL(s)`);
} else {
  console.warn("No awesome-obsidian clip found under inbox/web-clipper; help seeds only.");
}

// Always include upstream README for fuller plugin table when Firecrawl is up
add({
  url: "https://raw.githubusercontent.com/kmaasrud/awesome-obsidian/master/README.md",
  category: "plugins",
  title: "awesome-obsidian README (raw)",
});

mkdirSync(OUT_DIR, { recursive: true });
const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  phase: 1,
  count: entries.length,
  entries,
};
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), "utf8");
console.log(`Wrote ${MANIFEST} (${entries.length} URLs)`);
