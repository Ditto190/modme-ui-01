#!/usr/bin/env node
/**
 * Promote .firecrawl/awesome-obsidian/pages → docs/obsidian/kb/{category}/
 * and refresh docs/obsidian/kb/_index.md
 *
 * Usage: node scripts/knowledge-management/obsidian-kb-promote.mjs [--from-inbox]
 *   --from-inbox also copies curated clips for help/syntax into kb/help/
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const PAGES = join(ROOT, ".firecrawl/awesome-obsidian/pages");
const KB = join(ROOT, "docs/obsidian/kb");
const INBOX_WC = join(ROOT, "GenerativeUI_monorepo/docs/inbox/web-clipper");
const fromInbox = process.argv.includes("--from-inbox");

mkdirSync(KB, { recursive: true });

const promoted = [];

function ensureCat(cat) {
  const d = join(KB, cat);
  mkdirSync(d, { recursive: true });
  return d;
}

function promoteFile(src, category, destName) {
  const dir = ensureCat(category);
  const dest = join(dir, destName);
  const raw = readFileSync(src, "utf8");
  writeFileSync(dest, raw, "utf8");
  promoted.push({ category, file: dest.replace(ROOT + "\\", "").replace(ROOT + "/", ""), source: src });
}

if (existsSync(PAGES)) {
  for (const name of readdirSync(PAGES)) {
    if (!name.endsWith(".md")) continue;
    const cat = name.split("__")[0] || "misc";
    promoteFile(join(PAGES, name), cat, name.replace(/^[^_]+__/, ""));
  }
}

if (fromInbox && existsSync(INBOX_WC)) {
  const patterns = [
    { re: /Basic formatting syntax/i, cat: "help", name: "basic-formatting-syntax.md" },
    { re: /Advanced formatting syntax/i, cat: "help", name: "advanced-formatting-syntax.md" },
    { re: /Import Zettelkasten/i, cat: "help", name: "import-zettelkasten.md" },
    { re: /Core plugins/i, cat: "help", name: "core-plugins.md" },
    { re: /format-converter|Format converter/i, cat: "help", name: "format-converter.md" },
  ];
  const stack = [INBOX_WC];
  while (stack.length) {
    const dir = stack.pop();
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.name.endsWith(".md")) {
        for (const p of patterns) {
          if (p.re.test(ent.name)) {
            promoteFile(full, p.cat, p.name);
          }
        }
      }
    }
  }
}

const byCat = {};
for (const p of promoted) {
  byCat[p.category] = byCat[p.category] || [];
  byCat[p.category].push(p);
}

const indexPath = join(KB, "_index.md");
const startHere = `- [[agent-syntax-brief]] — agent-facing syntax + core plugins
- [[MOC Obsidian]] — vault hub + Bases tray
- [[Zettelkasten Workflow]]
`;

const index = `---
tags:
  - obsidian-kb
  - index
type: moc
updated: ${new Date().toISOString().slice(0, 10)}
---

# Obsidian knowledge base (phase 1)

Curated promote from Firecrawl + inbox clips. Focus: help pages (syntax, format-converter, Zettelkasten, core plugins) and awesome-obsidian **Plugins**.

## Start here

${startHere}
## Categories

${Object.keys(byCat)
  .sort()
  .map((c) => `### ${c}\n\n${byCat[c].map((x) => `- [[${basename(x.file, ".md")}]]`).join("\n")}`)
  .join("\n\n")}

## Commands

\`\`\`powershell
yarn obsidian:kb:manifest
yarn firecrawl:up
yarn obsidian:kb:download --limit 20
yarn obsidian:kb:promote --from-inbox
\`\`\`

## Related

- [[MOC Obsidian]]
- [[Vault Plugin Policy]]
- [[Zettelkasten Workflow]]
- [[clipper-source-matching]]
- ![[MOC Obsidian KB.base]]
`;

writeFileSync(indexPath, index, "utf8");

const base = `filters:
  and:
    - file.inFolder("docs/obsidian/kb")
    - file.ext == "md"
properties:
  category:
    displayName: Category
  file.mtime:
    displayName: Modified
views:
  - type: table
    name: KB pages
    order:
      - file.name
      - file.folder
      - file.mtime
    limit: 100
`;
writeFileSync(join(ROOT, "docs/adam/MOC Obsidian KB.base"), base, "utf8");

console.log(`Promoted ${promoted.length} file(s) → ${KB}`);
console.log(`Wrote docs/obsidian/kb/_index.md + docs/adam/MOC Obsidian KB.base`);
