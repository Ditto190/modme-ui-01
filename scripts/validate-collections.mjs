#!/usr/bin/env node
/**
 * Validate scripts/collections/*.collection.json against scripts/schema/collection.schema.json
 */
import Ajv from "ajv";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const COLLECTIONS_DIR = join(REPO_ROOT, "scripts", "collections");
const SCHEMA_PATH = join(REPO_ROOT, "scripts", "schema", "collection.schema.json");
const VENDOR_DIR = join(REPO_ROOT, ".vendor", "awesome-copilot-main");

const ajv = new Ajv({ allErrors: true, strict: false });
const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
const validate = ajv.compile(schema);

function resolveItemPath(itemPath) {
  const repoPath = join(REPO_ROOT, itemPath);
  if (existsSync(repoPath)) return repoPath;
  const vendorPath = join(VENDOR_DIR, itemPath);
  if (existsSync(vendorPath)) return vendorPath;
  return repoPath;
}

function validateCollections() {
  if (!existsSync(COLLECTIONS_DIR)) {
    console.log("No scripts/collections directory — skipped");
    return true;
  }

  const files = readdirSync(COLLECTIONS_DIR).filter((f) => f.endsWith(".collection.json"));
  if (files.length === 0) {
    console.log("No .collection.json manifests — skipped");
    return true;
  }

  let hasErrors = false;
  const usedIds = new Set();

  for (const file of files) {
    const filePath = join(COLLECTIONS_DIR, file);
    const collection = JSON.parse(readFileSync(filePath, "utf8"));
    console.log(`\nValidating ${file}...`);

    if (!validate(collection)) {
      console.error(`❌ Schema errors in ${file}:`);
      for (const err of validate.errors ?? []) {
        console.error(`   - ${err.instancePath || "/"} ${err.message}`);
      }
      hasErrors = true;
      continue;
    }

    if (collection.id) {
      if (usedIds.has(collection.id)) {
        console.error(`❌ Duplicate collection id "${collection.id}" in ${file}`);
        hasErrors = true;
      } else {
        usedIds.add(collection.id);
      }
    }

    for (const [i, item] of collection.items.entries()) {
      const resolved = resolveItemPath(item.path);
      if (!existsSync(resolved)) {
        console.error(`❌ Item ${i + 1} path not found: ${item.path}`);
        hasErrors = true;
      }
    }

    if (!hasErrors) {
      console.log(`✅ ${file} is valid (${collection.items.length} items)`);
    }
  }

  return !hasErrors;
}

const ok = validateCollections();
if (!ok) {
  console.error("\n❌ Collection validation failed");
  process.exit(1);
}
console.log("\n🎉 Collection validation passed");
