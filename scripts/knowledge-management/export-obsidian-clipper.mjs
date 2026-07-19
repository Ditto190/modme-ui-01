#!/usr/bin/env node
/**
 * Validate Obsidian Web Clipper template JSON files under templates/obsidian-clipper/.
 * Usage: node scripts/knowledge-management/export-obsidian-clipper.mjs [--list]
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIPPER_DIR = resolve(__dirname, "../../templates/obsidian-clipper");

const REQUIRED = ["schemaVersion", "name", "triggers", "noteNameFormat", "noteContentFormat", "path"];

/** ModMe templates must nest under inbox/web-clipper (probes + topic packs included). */
const MODME_WEB_CLIPPER_PREFIX = "inbox/web-clipper";

/** Flat path allowed for kepano upstream pack until migrated. */
const KEPANO_FLAT_OK = new Set(["inbox"]);

function collectJsonFiles(dir, base = "") {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${name.name}` : name.name;
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      out.push(...collectJsonFiles(full, rel));
      continue;
    }
    if (name.name.endsWith(".json")) out.push({ rel, full });
  }
  return out;
}

function validateTemplate(rel, data) {
  const errors = [];
  for (const key of REQUIRED) {
    if (!(key in data)) errors.push(`missing ${key}`);
  }
  if (!Array.isArray(data.triggers)) {
    errors.push("triggers must be an array");
  } else if (data.triggers.length === 0 && !rel.includes("generic-link") && !rel.includes("defuddle") && !rel.includes("interpreter")) {
    // empty triggers OK for manual/fallback templates
  }

  const pathVal = typeof data.path === "string" ? data.path : "";
  const isKepano = rel.startsWith("kepano/");
  const isModMe =
    rel.startsWith("modme-") ||
    rel === "chatgpt-clipper.json" ||
    ["agent-gateway-research.json", "expo-cng-research.json", "dolt-cms-catalog-research.json", "copilot-workspace-config.json", "multi-agent-orchestration-adr.json"].includes(
      rel,
    );

  if (isModMe) {
    if (!pathVal.startsWith(MODME_WEB_CLIPPER_PREFIX)) {
      errors.push(`path must start with "${MODME_WEB_CLIPPER_PREFIX}" (got "${pathVal}")`);
    }
  } else if (isKepano) {
    if (!KEPANO_FLAT_OK.has(pathVal) && !pathVal.startsWith(MODME_WEB_CLIPPER_PREFIX)) {
      errors.push(`kepano path should be "inbox" or web-clipper nested (got "${pathVal}")`);
    }
  }

  return errors;
}

const list = process.argv.includes("--list");
if (!existsSync(CLIPPER_DIR)) {
  console.error(`Missing clipper dir: ${CLIPPER_DIR}`);
  process.exit(1);
}

const files = collectJsonFiles(CLIPPER_DIR);
let failed = false;
let okCount = 0;

for (const { rel, full } of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(full, "utf8"));
  } catch (err) {
    console.error(`${rel}: invalid JSON (${err.message})`);
    failed = true;
    continue;
  }
  const errors = validateTemplate(rel, data);
  if (errors.length) {
    console.error(`${rel}: ${errors.join(", ")}`);
    failed = true;
    continue;
  }
  okCount += 1;
  if (list) {
    const triggers = Array.isArray(data.triggers) ? data.triggers.length : 0;
    console.log(`${rel}\t${data.name}\t${triggers} trigger(s)\t${data.path}`);
  } else {
    console.log(`OK ${rel}`);
  }
}

if (failed) process.exit(1);
console.log(`Validated ${okCount} Obsidian clipper template(s).`);
