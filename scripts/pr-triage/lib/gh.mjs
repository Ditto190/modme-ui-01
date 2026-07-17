#!/usr/bin/env node
/**
 * Shared GitHub CLI helpers for PR triage scripts.
 */

import { execSync } from "node:child_process";

const DEFAULT_REPO = "Ditto190/modme-ui-01";

export function ghJson(args, { repo = DEFAULT_REPO } = {}) {
  const fullArgs = [...args];
  if (!fullArgs.some((a, i) => a === "--repo" && fullArgs[i + 1])) {
    fullArgs.push("--repo", repo);
  }
  const out = execSync(["gh", ...fullArgs].map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" "), {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
    shell: true,
  });
  return JSON.parse(out);
}

export function ghApi(path, jq) {
  const parts = ["gh", "api", path];
  if (jq) parts.push("--jq", jq);
  const out = execSync(parts.join(" "), {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
    shell: true,
  });
  const trimmed = out.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export function parseArgs(argv) {
  const args = { repo: DEFAULT_REPO, base: "dev", author: "", label: "", pr: 0, format: "json" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo" && argv[i + 1]) args.repo = argv[++i];
    else if (a === "--base" && argv[i + 1]) args.base = argv[++i];
    else if (a === "--author" && argv[i + 1]) args.author = argv[++i];
    else if (a === "--label" && argv[i + 1]) args.label = argv[++i];
    else if (a === "--pr" && argv[i + 1]) args.pr = Number(argv[++i]);
    else if (a === "--markdown") args.format = "markdown";
    else if (a === "--json") args.format = "json";
    else if (a === "--all-bases") args.base = "";
  }
  return args;
}

export { DEFAULT_REPO };
