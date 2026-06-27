#!/usr/bin/env node
/**
 * Path → label mapping for PRs and issues.
 * Stack labels mirror scripts/lib/path-filter.mjs; extra labels from .cursor/bugbot/AUTOTAGS.yml.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyChangedStacks } from "./path-filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

/** Stack label names from classifyChangedStacks */
const STACK_LABEL_MAP = {
  forge: "stack:forge",
  generative: "stack:generative",
  orchestration: "stack:orchestration",
};

/**
 * @param {string[]} files
 * @returns {string[]}
 */
export function stackLabelsForPaths(files) {
  const stacks = classifyChangedStacks(files);
  /** @type {string[]} */
  const labels = [];
  if (stacks.forge) labels.push(STACK_LABEL_MAP.forge);
  if (stacks.generative) labels.push(STACK_LABEL_MAP.generative);
  if (stacks.orchestration) labels.push(STACK_LABEL_MAP.orchestration);
  if (labels.length === 0 && files.length > 0) {
    labels.push("stack:root");
  }
  return labels;
}

/**
 * Parse simple AUTOTAGS.yml (label: \n  - 'glob' lines).
 * @returns {Record<string, string[]>}
 */
export function loadAutotagGlobs() {
  const path = resolve(ROOT, ".cursor/bugbot/AUTOTAGS.yml");
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  /** @type {Record<string, string[]>} */
  const map = {};
  let current = null;
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("#") || line.trim() === "") continue;
    const labelMatch = line.match(/^([a-z0-9:_-]+):\s*$/i);
    if (labelMatch) {
      current = labelMatch[1];
      map[current] = [];
      continue;
    }
    const globMatch = line.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/);
    if (globMatch && current) {
      map[current].push(globMatch[1]);
    }
  }
  return map;
}

/**
 * Minimal glob match: ** → .*, * → [^/]*
 * @param {string} glob
 * @param {string} file
 */
export function globMatches(glob, file) {
  const normalized = file.replace(/\\/g, "/");
  let pattern = glob.replace(/\\/g, "/");
  pattern = pattern.replace(/\./g, "\\.");
  pattern = pattern.replace(/\*\*/g, "{{GLOBSTAR}}");
  pattern = pattern.replace(/\*/g, "[^/]*");
  pattern = pattern.replace(/\{\{GLOBSTAR\}\}/g, ".*");
  if (!pattern.endsWith("$") && !pattern.includes("/")) {
    pattern = `(^|/)${pattern}`;
  }
  return new RegExp(`^${pattern}$`).test(normalized);
}

/**
 * @param {string[]} files
 * @param {Record<string, string[]>} [autotagMap]
 * @returns {string[]}
 */
export function autotagLabelsForPaths(files, autotagMap = loadAutotagGlobs()) {
  /** @type {Set<string>} */
  const labels = new Set(stackLabelsForPaths(files));
  for (const [label, globs] of Object.entries(autotagMap)) {
    if (label.startsWith("stack:")) continue;
    for (const file of files) {
      if (globs.some((g) => globMatches(g, file))) {
        labels.add(label);
        break;
      }
    }
  }
  return [...labels];
}

/**
 * @param {string[]} files
 * @returns {string[]}
 */
export function labelsForPaths(files) {
  return autotagLabelsForPaths(files);
}

/**
 * @param {string} body
 * @returns {string[]}
 */
export function labelsForIssueBody(body) {
  /** @type {string[]} */
  const labels = [];
  if (/modme-[a-z0-9]+/i.test(body)) {
    labels.push("beads-linked");
  }
  if (/self[_\s-]?heal:\s*yes/i.test(body) || /trigger self-healing.*yes/i.test(body)) {
    labels.push("devops-autofix");
  }
  return labels;
}
