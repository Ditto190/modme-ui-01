#!/usr/bin/env node
/**
 * Validate Obsidian Web Clipper template JSON files under templates/obsidian-clipper/.
 * Usage: node scripts/knowledge-management/export-obsidian-clipper.mjs [--list]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIPPER_DIR = resolve(__dirname, "../../templates/obsidian-clipper");

const REQUIRED = ["schemaVersion", "name", "triggers", "noteNameFormat", "noteContentFormat"];

function validateTemplate(file, data) {
  const errors = [];
  for (const key of REQUIRED) {
    if (!(key in data)) errors.push(`missing ${key}`);
  }
  if (!Array.isArray(data.triggers) || data.triggers.length === 0) {
    errors.push("triggers must be a non-empty array");
  }
  return errors;
}

const list = process.argv.includes("--list");
const files = readdirSync(CLIPPER_DIR).filter((f) => f.endsWith(".json"));
let failed = false;

for (const file of files) {
  const path = join(CLIPPER_DIR, file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  const errors = validateTemplate(file, data);
  if (errors.length) {
    console.error(`${file}: ${errors.join(", ")}`);
    failed = true;
    continue;
  }
  if (list) {
    console.log(`${file}\t${data.name}\t${data.triggers.length} trigger(s)`);
  } else {
    console.log(`OK ${file}`);
  }
}

if (failed) process.exit(1);
console.log(`Validated ${files.length} Obsidian clipper template(s).`);
