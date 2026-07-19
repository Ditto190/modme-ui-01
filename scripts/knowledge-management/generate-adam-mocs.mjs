#!/usr/bin/env node
/**
 * Regenerate docs/adam MOC hub notes + .base stubs from adam-mocs-catalog.json.
 * Usage: node scripts/knowledge-management/generate-adam-mocs.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const CATALOG = join(__dirname, "adam-mocs-catalog.json");
const ADAM = join(ROOT, "docs/adam");

const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
mkdirSync(ADAM, { recursive: true });

for (const moc of catalog.mocs) {
  const folderFilters = (moc.folders || []).map((f) => `file.inFolder("${f}")`);
  const tagFilters = (moc.tagAny || []).map((t) => `file.hasTag("${t}")`);
  const orFilters = [...folderFilters, ...tagFilters];

  const baseYaml = `filters:
  or:
${orFilters.map((f) => `    - ${f}`).join("\n")}
properties:
  type:
    displayName: Type
  severity:
    displayName: Severity
  uid:
    displayName: UID
  file.mtime:
    displayName: Modified
views:
  - type: table
    name: Recent 14d
    filters:
      and:
        - file.ext == "md"
        - file.mtime > now() - "14 days"
    order:
      - file.mtime
      - file.name
      - type
    limit: 40
  - type: table
    name: All matching
    filters:
      and:
        - file.ext == "md"
    order:
      - file.name
      - file.mtime
    limit: 80
`;

  const links = (moc.hubLinks || []).map((t) => `- [[${t}]]`).join("\n");
  const md = `---
tags:
${(moc.tags || []).map((t) => `  - ${t}`).join("\n")}
type: moc
updated: ${new Date().toISOString().slice(0, 10)}
---

# ${moc.title}

Curated Map of Content. Prefer Bases tables below over Dataview lists.

## Hub links

${links || "- [[ADAM Index]]"}

## Bases dashboard

![[${moc.title}.base]]

## Unsorted inbox pattern

Link new permanent notes to this MOC. Bases **Recent 14d** acts as the unsorted tray (core-first alternative to Dataview \`list from [[]] and !outgoing([[]])\`).

## Related

- [[ADAM Index]]
- [[Zettelkasten Workflow]]
- [[Query Tool Guide]]
`;

  const basePath = join(ADAM, `${moc.title}.base`);
  const mdPath = join(ADAM, `${moc.title}.md`);
  writeFileSync(basePath, baseYaml, "utf8");
  writeFileSync(mdPath, md, "utf8");
  console.log(`Wrote ${relativeSafe(basePath)} + ${relativeSafe(mdPath)}`);
}

function relativeSafe(p) {
  return p.replace(ROOT + "\\", "").replace(ROOT + "/", "");
}

console.log(`Generated ${catalog.mocs.length} MOC(s).`);
