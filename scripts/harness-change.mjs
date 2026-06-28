#!/usr/bin/env node
/**
 * ECL harness change manager — create, list, archive structured changes.
 * Usage:
 *   node scripts/harness-change.mjs list
 *   node scripts/harness-change.mjs create <slug> [--template structured]
 *   node scripts/harness-change.mjs archive <slug>
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const HARNESS = resolve(ROOT, "harness/changes");
const TEMPLATE = resolve(HARNESS, "templates/structured-change.md");

const [,, command, slug, ...rest] = process.argv;
const useTemplate = rest.includes("--template") ? rest[rest.indexOf("--template") + 1] : "structured";

function fail(msg) {
  console.error(`harness-change: ${msg}`);
  process.exit(1);
}

function listChanges() {
  for (const bucket of ["active", "parking", "archive"]) {
    const dir = join(HARNESS, bucket);
    if (!existsSync(dir)) continue;
    const entries = existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : [];
    console.log(`${bucket}: ${entries.length ? entries.join(", ") : "(none)"}`);
  }
}

function createChange(name) {
  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    fail("slug required (lowercase, hyphens)");
  }
  const target = join(HARNESS, "active", name);
  if (existsSync(target)) fail(`change already exists: ${name}`);

  mkdirSync(target, { recursive: true });
  const template = existsSync(TEMPLATE)
    ? readFileSync(TEMPLATE, "utf8")
    : `# ${name}\n\n## Goal\n\n## Scope\n\n## Verify\n\n`;
  writeFileSync(join(target, "CHANGE.md"), template.replace("{{slug}}", name), "utf8");
  writeFileSync(join(target, "STATUS.md"), "status: active\n", "utf8");
  console.log(`created harness/changes/active/${name}`);
}

function archiveChange(name) {
  const src = join(HARNESS, "active", name);
  const dst = join(HARNESS, "archive", name);
  if (!existsSync(src)) fail(`active change not found: ${name}`);
  mkdirSync(join(HARNESS, "archive"), { recursive: true });
  renameSync(src, dst);
  console.log(`archived harness/changes/active/${name} → archive/`);
}

switch (command) {
  case "list":
    listChanges();
    break;
  case "create":
    createChange(slug);
    break;
  case "archive":
    archiveChange(slug);
    break;
  default:
    fail("usage: list | create <slug> | archive <slug>");
}
