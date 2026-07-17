/**
 * Shared ModMe env loader for Node/Bun scripts (mirrors scripts/lib/modme-env-bootstrap.ps1).
 */
import fs from "node:fs";
import path from "node:path";

const LINE_BREAK_RE = /\r?\n/;
const ENV_KEY_VALUE_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;
const DOUBLE_QUOTED_VALUE_RE = /^"(.*)"$/;
const SINGLE_QUOTED_VALUE_RE = /^'(.*)'$/;

function parseEnvFile(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) {
    return map;
  }
  for (const line of fs.readFileSync(filePath, "utf8").split(LINE_BREAK_RE)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(ENV_KEY_VALUE_RE);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    const value = rawValue
      .replace(DOUBLE_QUOTED_VALUE_RE, "$1")
      .replace(SINGLE_QUOTED_VALUE_RE, "$1");
    map.set(key, value);
  }
  return map;
}

/**
 * @param {string[]} keys
 */
export function snapshotEnv(keys) {
  /** @type {Record<string, string | undefined>} */
  const snap = {};
  for (const key of keys) {
    if (process.env[key] !== undefined) {
      snap[key] = process.env[key];
    }
  }
  return snap;
}

/**
 * @param {Record<string, string | undefined>} snap
 * @param {string[]} keys
 */
export function restoreEnv(snap, keys) {
  for (const key of keys) {
    if (snap[key] !== undefined) {
      process.env[key] = snap[key];
    } else {
      delete process.env[key];
    }
  }
}

/**
 * @param {string} repoRoot Monorepo_ModMe root
 * @param {{ overwriteKeys?: string[]; forceKeys?: string[]; forceFileIds?: string[] }} [options]
 */
export function loadModMeEnv(repoRoot, options = {}) {
  const overwrite = new Set(options.overwriteKeys ?? [".worktree-ports.env"]);
  const forceKeys = new Set(options.forceKeys ?? []);
  const forceFileIds = new Set(options.forceFileIds ?? []);
  const files = [
    { id: "root", path: path.join(repoRoot, ".env"), overwrite: false },
    {
      id: "ports",
      path: path.join(repoRoot, ".worktree-ports.env"),
      overwrite: true,
    },
    {
      id: "forge-db",
      path: path.join(repoRoot, "next-forge/packages/database/.env"),
      overwrite: false,
    },
    {
      id: "forge-app",
      path: path.join(repoRoot, "next-forge/apps/app/.env.local"),
      overwrite: false,
    },
    {
      id: "forge-api",
      path: path.join(repoRoot, "next-forge/apps/api/.env.local"),
      overwrite: false,
    },
    {
      id: "forge-web",
      path: path.join(repoRoot, "next-forge/apps/web/.env.local"),
      overwrite: false,
    },
  ];

  const loaded = {};
  for (const file of files) {
    const entries = parseEnvFile(file.path);
    if (entries.size === 0) {
      continue;
    }
    let count = 0;
    for (const [key, value] of entries) {
      const shouldOverwrite =
        forceKeys.has(key) ||
        forceFileIds.has(file.id) ||
        file.overwrite ||
        overwrite.has(file.id) ||
        overwrite.has(path.basename(file.path));
      if (shouldOverwrite || !process.env[key]) {
        process.env[key] = value;
        count++;
      }
    }
    if (count > 0) {
      loaded[file.id] = count;
    }
  }

  process.env.MONOREPO_MODME_ROOT = repoRoot;

  if (process.env.FORGE_APP_PORT && !process.env.NEXT_PUBLIC_APP_URL) {
    process.env.NEXT_PUBLIC_APP_URL = `http://localhost:${process.env.FORGE_APP_PORT}`;
  }
  if (process.env.FORGE_WEB_PORT && !process.env.NEXT_PUBLIC_WEB_URL) {
    process.env.NEXT_PUBLIC_WEB_URL = `http://localhost:${process.env.FORGE_WEB_PORT}`;
  }
  if (process.env.FORGE_API_PORT && !process.env.NEXT_PUBLIC_API_URL) {
    process.env.NEXT_PUBLIC_API_URL = `http://localhost:${process.env.FORGE_API_PORT}`;
  }

  return loaded;
}
