#!/usr/bin/env node
/**
 * Append git lifecycle events to logs/telemetry/git-hooks.jsonl for telemetry sync.
 */
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const GIT_HOOKS_LOG = join(ROOT, "logs", "telemetry", "git-hooks.jsonl");

function ensureLogDir() {
  const dir = dirname(GIT_HOOKS_LOG);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * @param {object} params
 * @param {string} params.hook - e.g. pre-commit, post-commit, pre-push
 * @param {Record<string, unknown>} [params.metadata]
 */
export function emitGitHookEvent({ hook, metadata = {} }) {
  ensureLogDir();
  const entry = {
    timestamp: new Date().toISOString(),
    event: `git.hook.${hook}`,
    hook,
    session_id: process.env.AGENT_SESSION_ID ?? process.env.CURSOR_SESSION_ID ?? null,
    parent_session_id: process.env.PARENT_SESSION_ID ?? null,
    agent_platform: process.env.AGENT_OWNER ?? process.env.CURSOR_AGENT ?? "human",
    branch: process.env.GIT_BRANCH ?? null,
    worktree: process.env.WORKTREE_NAME ?? null,
    ...metadata,
  };
  appendFileSync(GIT_HOOKS_LOG, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}

async function main() {
  const args = process.argv.slice(2);
  const hook = args[0] ?? "unknown";
  const metadata = {};

  if (hook === "post-commit") {
    try {
      const { execSync } = await import("node:child_process");
      metadata.commit_hash = execSync("git rev-parse HEAD", {
        cwd: ROOT,
        encoding: "utf8",
      }).trim();
      metadata.branch = execSync("git branch --show-current", {
        cwd: ROOT,
        encoding: "utf8",
      }).trim();
      const stat = execSync("git diff-tree --no-commit-id --name-only -r HEAD", {
        cwd: ROOT,
        encoding: "utf8",
      });
      metadata.files_changed = stat.split(/\r?\n/).filter(Boolean).length;
    } catch {
      /* best-effort metadata */
    }
  }

  emitGitHookEvent({ hook, metadata });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(() => process.exit(0));
}
