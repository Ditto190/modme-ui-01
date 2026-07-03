#!/usr/bin/env node
/**
 * Beads BFS dispatch — traverse ready queue in dependency layers.
 * Usage: node scripts/beads-bfs-dispatch.mjs [--dry-run]
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDuplicateTask } from "./lib/agent-task-registry.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

const ROLE_KEYWORDS = [
  { role: "review", keywords: ["review", "audit", "security"] },
  { role: "test", keywords: ["test", "verify", "spec"] },
  { role: "plan", keywords: ["plan", "design", "adr", "architecture"] },
  { role: "orchestrator", keywords: ["orchestr", "dispatch", "beads"] },
];

const COLLECTION_BY_ROLE = {
  dev: "modme-core",
  review: "modme-core",
  test: "modme-core",
  plan: "modme-lean-ctx-advanced",
  orchestrator: "modme-lean-ctx-advanced",
};

function runBdReadyJson() {
  try {
    const out = execSync("npx --yes @beads/bd ready --json", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const parsed = JSON.parse(out.trim() || "[]");
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.issues) return parsed.issues;
    if (parsed?.ready) return parsed.ready;
    return [];
  } catch (err) {
    console.warn("beads-bfs: bd ready --json failed (advisory):", err.message ?? err);
    return [];
  }
}

function normalizeIssue(raw) {
  const id = raw.id ?? raw.issue_id ?? raw.key ?? null;
  const title = raw.title ?? raw.summary ?? raw.description ?? String(id ?? "untitled");
  const deps = raw.dependencies ?? raw.blocked_by ?? raw.deps ?? [];
  const depIds = (Array.isArray(deps) ? deps : []).map((d) =>
    typeof d === "string" ? d : (d.id ?? d.issue_id)
  );
  return { id, title, dependencies: depIds.filter(Boolean), raw };
}

function suggestRole(title) {
  const lower = title.toLowerCase();
  for (const rule of ROLE_KEYWORDS) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.role;
  }
  return "dev";
}

function suggestClaimPaths(title) {
  const lower = title.toLowerCase();
  if (lower.includes("inbox") || lower.includes("intake")) {
    return ["GenerativeUI_monorepo/docs/inbox/", "docs/inbox-pipeline/"];
  }
  if (lower.includes("forge") || lower.includes("next-forge")) {
    return ["next-forge/"];
  }
  if (lower.includes("observability") || lower.includes("telemetry")) {
    return ["scripts/telemetry/", "docs/observability/"];
  }
  if (lower.includes("lean-ctx") || lower.includes("orchestr")) {
    return ["scripts/", "docs/lean-ctx/"];
  }
  return [];
}

function buildBfsLayers(issues) {
  const byId = new Map(issues.map((i) => [i.id, i]));
  const remaining = new Set(issues.map((i) => i.id));
  const layers = [];
  let layer = 0;

  while (remaining.size > 0) {
    const ready = [];
    for (const id of remaining) {
      const issue = byId.get(id);
      const blocked = (issue.dependencies ?? []).some((dep) => remaining.has(dep) && byId.has(dep));
      if (!blocked) ready.push(issue);
    }

    if (ready.length === 0) {
      for (const id of remaining) {
        ready.push(byId.get(id));
      }
    }

    layers.push({
      layer,
      issues: ready.map((issue) => {
        const dup = findDuplicateTask(issue.title);
        return {
          issue_id: issue.id,
          title: issue.title,
          suggested_role: suggestRole(issue.title),
          suggested_collection: COLLECTION_BY_ROLE[suggestRole(issue.title)] ?? "modme-core",
          claim_paths: suggestClaimPaths(issue.title),
          duplicate: dup
            ? { session_id: dup.id, similarity: dup.similarity, description: dup.description }
            : null,
        };
      }),
    });

    for (const issue of ready) remaining.delete(issue.id);
    layer += 1;
    if (layer > issues.length) break;
  }

  return layers;
}

function main() {
  const rawIssues = runBdReadyJson()
    .map(normalizeIssue)
    .filter((i) => i.id);
  const plan = {
    dry_run: DRY_RUN,
    generated_at: new Date().toISOString(),
    issue_count: rawIssues.length,
    layers: buildBfsLayers(rawIssues),
  };

  console.log(JSON.stringify(plan, null, 2));

  if (DRY_RUN) {
    console.error("\nbeads-bfs: dry-run — inspect layers before dispatch");
  }
}

main();
