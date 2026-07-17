/**
 * Worktree shared-deps contract (Node mirror of scripts/lib/worktree-link-deps.ps1).
 * Used by tests, e2e smoke, and preflight — keep in sync with PS1 specs.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Heavy dirs linked via Windows junctions from .worktrees/dev */
export const HEAVY_DEP_SPECS = [
  {
    rel: "node_modules",
    locks: ["yarn.lock"],
  },
  {
    rel: "GenerativeUI_monorepo/node_modules",
    locks: ["GenerativeUI_monorepo/yarn.lock"],
  },
  {
    rel: "next-forge/node_modules",
    locks: ["next-forge/bun.lock"],
  },
  {
    rel: "GenerativeUI_monorepo/apps/agent-server/.venv",
    locks: ["GenerativeUI_monorepo/apps/agent-server/poetry.lock"],
  },
];

/** Paths copied by worktree-copy-env.ps1 for junction lockfile matching */
export const BOOTSTRAP_LOCK_PATHS = [
  "yarn.lock",
  ".yarnrc.yml",
  "next-forge/bun.lock",
  "GenerativeUI_monorepo/apps/agent-server/poetry.lock",
];

/** @param {string} filePath */
export function getLockfileFingerprint(filePath) {
  if (!existsSync(filePath)) return null;
  const data = readFileSync(filePath);
  return createHash("sha256").update(data).digest("hex");
}

/**
 * @param {string} sourceRoot
 * @param {string} targetRoot
 * @param {string[]} relativeLockPaths
 */
export function lockfilesMatch(sourceRoot, targetRoot, relativeLockPaths) {
  for (const rel of relativeLockPaths) {
    const src = join(sourceRoot, rel);
    const tgt = join(targetRoot, rel);
    const srcFp = getLockfileFingerprint(src);
    const tgtFp = getLockfileFingerprint(tgt);
    if (srcFp === null || tgtFp === null) return false;
    if (srcFp !== tgtFp) return false;
  }
  return true;
}
