import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CLIPPER_ROOT = path.join("templates", "obsidian-clipper");

export const UID_PROP = {
  name: "uid",
  value: '{{time|date:"YYYYMMDDHHmm"}}',
  type: "text",
};

export const DEPRECATED_INBOX_PATH = "GenerativeUI_monorepo/docs/inbox";
/** Vault-relative inbox root (ModMe-Vault junction). Nested Clipper paths stay under this. */
export const VAULT_INBOX_PATH = "inbox";
export const VAULT_WEB_CLIPPER_PATH_PREFIX = "inbox/web-clipper/";

/**
 * True when Clipper template path targets the ModMe-Vault inbox junction
 * (flat `inbox` or nested `inbox/web-clipper/...`).
 * @param {unknown} p
 */
export function isVaultInboxPath(p) {
  if (typeof p !== "string" || !p.trim()) return false;
  if (p === VAULT_INBOX_PATH) return true;
  if (p === DEPRECATED_INBOX_PATH) return false;
  return p === "inbox/web-clipper" || p.startsWith(VAULT_WEB_CLIPPER_PATH_PREFIX);
}

/**
 * @param {Record<string, unknown>} json
 * @returns {{ json: Record<string, unknown>, changed: boolean }}
 */
export function applyClipperUidAndPath(json) {
  const next = structuredClone(json);
  let changed = false;

  if (next.path === DEPRECATED_INBOX_PATH) {
    next.path = VAULT_INBOX_PATH;
    changed = true;
  }

  if (
    Array.isArray(next.properties) &&
    !next.properties.some((p) => p && typeof p === "object" && p.name === "uid")
  ) {
    const properties = [...next.properties];
    const tsIdx = properties.findIndex(
      (p) => p && typeof p === "object" && p.name === "timestamp",
    );
    properties.splice(tsIdx >= 0 ? tsIdx + 1 : 0, 0, { ...UID_PROP });
    next.properties = properties;
    changed = true;
  }

  return { json: next, changed };
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
export function listClipperJsonFiles(dir = CLIPPER_ROOT) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listClipperJsonFiles(full));
      continue;
    }
    if (entry.name.endsWith(".json")) out.push(full);
  }
  return out;
}

/**
 * @param {string} [dir]
 * @returns {{ patched: string[], skipped: string[] }}
 */
export function patchClipperTemplates(dir = CLIPPER_ROOT) {
  /** @type {string[]} */
  const patched = [];
  /** @type {string[]} */
  const skipped = [];

  for (const full of listClipperJsonFiles(dir)) {
    const raw = fs.readFileSync(full, "utf8");
    const parsed = JSON.parse(raw);
    const { json, changed } = applyClipperUidAndPath(parsed);
    if (!changed) {
      skipped.push(full);
      continue;
    }
    fs.writeFileSync(full, `${JSON.stringify(json, null, "\t")}\n`);
    patched.push(full);
  }

  return { patched, skipped };
}

const isCli =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isCli) {
  const { patched, skipped } = patchClipperTemplates();
  for (const file of patched) console.log(`patched ${file}`);
  for (const file of skipped) console.log(`skip ${file}`);
}
