#!/usr/bin/env node
/**
 * Path filters mirroring .github/workflows/ci.yml (dorny/paths-filter).
 */
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

/** @type {Record<string, string[]>} */
export const PATH_FILTERS = {
  forge: ["next-forge/"],
  generative: ["GenerativeUI_monorepo/"],
  orchestration: [
    "scripts/",
    "docs/",
    ".cursor/",
    ".agents/",
    ".github/",
    "package.json",
    "CHANGELOG.md",
  ],
};

/**
 * @param {string} file
 * @param {string[]} prefixes
 */
export function matchesPrefix(file, prefixes) {
  return prefixes.some((p) => file.startsWith(p));
}

/**
 * @param {string[]} files
 * @param {keyof typeof PATH_FILTERS | string} filterName
 */
export function filterMatches(files, filterName) {
  const prefixes = PATH_FILTERS[filterName];
  if (!prefixes) return false;
  return files.some((f) => matchesPrefix(f, prefixes));
}

/**
 * @param {string[]} files
 */
export function classifyChangedStacks(files) {
  return {
    forge: filterMatches(files, "forge"),
    generative: filterMatches(files, "generative"),
    orchestration: filterMatches(files, "orchestration"),
  };
}

/**
 * @param {{ base?: string, head?: string, staged?: boolean }} [options]
 * @returns {string[]}
 */
export function gitChangedFiles(options = {}) {
  const { base, head, staged = false } = options;
  try {
    if (staged) {
      return execSync("git diff --cached --name-only", { cwd: ROOT, encoding: "utf8" })
        .split(/\r?\n/)
        .filter(Boolean);
    }
    if (base && head) {
      return execSync(`git diff --name-only ${base} ${head}`, { cwd: ROOT, encoding: "utf8" })
        .split(/\r?\n/)
        .filter(Boolean);
    }
    const unstaged = execSync("git diff --name-only", { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
    const stagedFiles = execSync("git diff --cached --name-only", { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
    return [...new Set([...unstaged, ...stagedFiles])];
  } catch {
    return [];
  }
}

/**
 * @param {string[]} files
 * @returns {"verify:forge" | "verify:generative" | "verify:both" | null}
 */
export function suggestVerifyScript(files) {
  const stacks = classifyChangedStacks(files);
  if (stacks.forge && stacks.generative) return "verify:both";
  if (stacks.forge) return "verify:forge";
  if (stacks.generative) return "verify:generative";
  return null;
}
