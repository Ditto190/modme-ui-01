/**
 * Unified beads (bd) CLI adapter — work SoR for ModMe orchestration.
 * Aligns with gastownhall/beads (--json, --description, claim, close).
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { recordKmMetric } from "./km-metrics.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const BEADS_ROOT = resolve(__dirname, "../..");

/**
 * @param {string} stdout
 * @returns {object | null}
 */
export function parseBdJson(stdout) {
  if (!stdout || typeof stdout !== "string") return null;
  const trimmed = stdout.trim();
  if (!trimmed) return null;

  const tryParse = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(trimmed);
  if (!parsed) {
    const line = trimmed.split("\n").find((l) => l.startsWith("{") || l.startsWith("["));
    if (line) parsed = tryParse(line);
  }
  if (!parsed) return null;
  if (Array.isArray(parsed)) return parsed[0] ?? null;
  return parsed;
}

/**
 * @param {object | null} payload
 * @returns {string | null}
 */
export function extractIssueId(payload) {
  if (!payload || typeof payload !== "object") return null;
  const id = payload.id ?? payload.issue_id ?? payload.issueId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 */
export function runBd(args, { cwd = BEADS_ROOT } = {}) {
  if (process.env.BEADS_DISABLED === "1") {
    return { ok: true, skipped: true, stdout: "", stderr: "", json: null, id: null };
  }

  const result = spawnSync("npx", ["--yes", "@beads/bd", ...args], {
    cwd,
    env: process.env,
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  const ok = result.status === 0;
  const json = parseBdJson(stdout);
  const id = extractIssueId(json);

  if (!ok) {
    console.warn(`[beads] bd ${args.join(" ")} → ${stderr || stdout || result.status}`);
  }

  return { ok, skipped: false, stdout, stderr, json, id };
}

/**
 * @param {string} title
 * @param {object} [options]
 */
export async function beadsCreate(title, options = {}) {
  const {
    description = title,
    priority,
    type = "task",
    prefix = "modme",
    json = true,
  } = options;

  const args = ["create", title, "--prefix", prefix, "--description", description, "-t", type];
  if (priority !== undefined) args.push("-p", String(priority));
  if (json) args.push("--json");

  const result = runBd(args);
  if (result.ok && result.id) {
    recordKmMetric("beads_create", { id: result.id, title });
  }
  return result;
}

/**
 * @param {string} issueId
 * @param {string} [note]
 */
export async function beadsClaim(issueId, note) {
  const args = ["update", issueId, "--claim", "--json"];
  const result = runBd(args);
  if (result.ok) {
    recordKmMetric("beads_claim", { id: issueId });
    if (note) await beadsComment(issueId, note);
  }
  return result;
}

/**
 * @param {string} issueId
 * @param {string} [reason]
 */
export async function beadsClose(issueId, reason) {
  const args = ["close", issueId, "--json"];
  if (reason) args.push("--reason", reason);
  const result = runBd(args);
  if (result.ok) {
    recordKmMetric("beads_close", { id: issueId, reason: reason ?? null });
  }
  return result;
}

/**
 * @param {string} issueId
 * @param {string} reason
 */
export async function beadsMarkBlocked(issueId, reason) {
  const args = ["update", issueId, "--status", "blocked", "--json"];
  if (reason) args.push("--comment", reason.slice(0, 500));
  const result = runBd(args);
  if (result.ok) {
    recordKmMetric("beads_blocked", { id: issueId, reason: reason.slice(0, 200) });
  }
  return result;
}

/**
 * @param {string} issueId
 * @param {string} note
 */
export async function beadsComment(issueId, note) {
  return runBd(["update", issueId, "--comment", note.slice(0, 2000)]);
}

export async function beadsReady() {
  return runBd(["ready", "--json"]);
}

/**
 * @param {string} path
 */
export async function beadsCreateSchemaDrift(path) {
  return beadsCreate(`schema-drift:${path}`, {
    priority: 1,
    description: `Schema or contract drift detected during code index at ${path}`,
    type: "bug",
  });
}

/**
 * @param {string} slug
 */
export async function beadsCreateScrapeIssue(slug) {
  return beadsCreate(`scrape:${slug}`, {
    priority: 2,
    description: `Scrape pipeline run for manifest ${slug}`,
    type: "task",
  });
}

/**
 * @param {string} issueId
 * @param {string} url
 */
export async function beadsLinkExternal(issueId, url) {
  return beadsComment(issueId, `external_issue: ${url}`);
}

/**
 * @param {string} title
 * @param {string} beadsId
 * @param {string} [githubIssueUrl]
 */
export async function beadsPromoteToIssue(title, beadsId, githubIssueUrl) {
  const parts = [`promoted_to_github: ${title}`];
  if (githubIssueUrl) parts.push(`github_sor: ${githubIssueUrl}`);
  return beadsComment(beadsId, parts.join(" | "));
}

/**
 * Best-effort beads call — never throws.
 * @param {() => Promise<{ ok?: boolean }> | { ok?: boolean }} fn
 */
export async function tryBeads(fn) {
  try {
    const res = await fn();
    if (!res?.ok && !res?.skipped) {
      console.warn("[beads] command failed (advisory)");
    }
    return res ?? { ok: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[beads] skipped:", message);
    return { ok: false, stderr: message };
  }
}

/** @deprecated use beadsComment + beadsClose */
export async function beadsUpdate(issueId, status, note) {
  if (status === "done" || status === "closed") {
    return beadsClose(issueId, note ?? status);
  }
  const args = ["update", issueId, "--status", status, "--json"];
  if (note) args.push("--comment", note);
  return runBd(args);
}

/**
 * Start intake/scrape beads lifecycle for a pipeline run.
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {number} [params.priority]
 * @param {string} [params.pipelineRunId]
 */
export async function beadsStartPipelineRun({ title, description, priority = 2, pipelineRunId }) {
  const created = await beadsCreate(title, { description, priority });
  if (!created.ok || !created.id) return { issueId: null, created };

  await beadsClaim(created.id, description);
  if (pipelineRunId) {
    await beadsComment(created.id, `pipeline_run_id: ${pipelineRunId}`);
    recordKmMetric("intake_run_link", {
      beads_id: created.id,
      pipeline_run_id: pipelineRunId,
      mode: title,
    });
  }
  return { issueId: created.id, created };
}

/**
 * @param {string | null} issueId
 * @param {boolean} success
 * @param {string} [detail]
 */
export async function beadsFinishPipelineRun(issueId, success, detail) {
  if (!issueId) return { ok: true, skipped: true };
  if (success) {
    return beadsClose(issueId, detail ?? "pipeline complete");
  }
  return beadsMarkBlocked(issueId, detail ?? "pipeline failed");
}
