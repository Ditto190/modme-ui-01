#!/usr/bin/env node
/**
 * Session → docs bridge: inbox stub + CHANGELOG/PRD preview from session markers.
 * Offline only — no LLM tokens. Invoked from session-capture.ps1 (dry-run) or manually.
 *
 * Usage:
 *   node scripts/session-to-docs.mjs [--dry-run] [--apply]
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MARKERS = join(ROOT, ".cursor/hooks/state/lean-ctx-session-markers.jsonl");
const PROMPTS_LOG = join(ROOT, "logs/copilot/prompts.log");
const INBOX = join(ROOT, "GenerativeUI_monorepo/docs/inbox");
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const PREVIEW_DIR = join(ROOT, "reports/session-docs");
const PREVIEW_MD = join(PREVIEW_DIR, "session-docs-preview.md");

const DRY_RUN = process.argv.includes("--dry-run") || !process.argv.includes("--apply");
const APPLY = process.argv.includes("--apply");

function readJsonLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function gitDiffStat() {
  try {
    return execSync("git diff --stat HEAD", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function gitBranch() {
  try {
    return execSync("git branch --show-current", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function buildInboxStub(marker, diffStat, recentPrompts) {
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const branch = marker.branch ?? gitBranch();
  const slug = slugify(`session-${branch}-${marker.phase ?? "stop"}`);
  const filename = `${iso}_decision_cursor_${slug}.md`;
  const body = [
    "---",
    `timestamp: ${now.toISOString()}`,
    "agent: cursor",
    "agent_role: architect",
    "type: decision",
    "severity: medium",
    `tags: [lean-ctx, session-capture, hooks]`,
    `branch: ${branch}`,
    "---",
    "",
    "## Session capture",
    "",
    `- Session id: ${marker.id ?? "unknown"}`,
    `- Phase: ${marker.phase ?? "stop"}`,
    `- CWD: ${marker.cwd ?? ROOT}`,
    "",
    "## Agent follow-up (MCP)",
    "",
    marker.hint ??
      "Run ctx_session save + ctx_knowledge consolidate via lean-ctx MCP.",
    "",
  ];

  if (diffStat) {
    body.push("## Git diff stat", "", "```", diffStat.slice(0, 2000), "```", "");
  }

  if (recentPrompts.length) {
    body.push("## Recent prompts", "");
    for (const p of recentPrompts.slice(-3)) {
      body.push(`- ${String(p).slice(0, 200)}`);
    }
    body.push("");
  }

  body.push(
    "## Documentation writer",
    "",
    "Run `yarn docs:writer:check` and update `docs/PRD.yaml` if feature status changed.",
    ""
  );

  return { filename, content: body.join("\n") };
}

function buildChangelogBullet(marker, branch) {
  const date = new Date().toISOString().slice(0, 10);
  return `- [Unreleased] Session work on \`${branch}\` (${marker.phase ?? "stop"} ${date}) — review inbox stub and PRD parity`;
}

function main() {
  const markers = readJsonLines(MARKERS);
  const latest = markers[markers.length - 1];
  if (!latest) {
    process.stdout.write(
      JSON.stringify({ ok: true, skipped: true, reason: "no session markers" }) + "\n"
    );
    return;
  }

  const diffStat = gitDiffStat();
  const hasChanges = diffStat.length > 0 && !/^$/.test(diffStat);
  const prompts = readJsonLines(PROMPTS_LOG)
    .filter((p) => !latest.id || p.sessionId === latest.id)
    .map((p) => p.message)
    .filter(Boolean);

  const inbox = buildInboxStub(latest, diffStat, prompts);
  const changelogBullet = buildChangelogBullet(latest, latest.branch ?? gitBranch());

  const preview = [
    "# Session docs preview",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${DRY_RUN ? "dry-run" : "apply"}`,
    "",
    "## Inbox stub",
    "",
    `Path: \`GenerativeUI_monorepo/docs/inbox/${inbox.filename}\``,
    "",
    inbox.content,
    "",
    "## CHANGELOG suggestion",
    "",
    changelogBullet,
    "",
    "## Next steps",
    "",
    "1. `yarn docs:writer:check`",
    "2. `yarn eval:collect`",
    "3. MCP: `ctx_session save`, `ctx_knowledge consolidate`",
    "",
  ].join("\n");

  mkdirSync(PREVIEW_DIR, { recursive: true });
  writeFileSync(PREVIEW_MD, preview, "utf8");

  let inboxWritten = null;
  if (APPLY && hasChanges) {
    mkdirSync(INBOX, { recursive: true });
    const inboxPath = join(INBOX, inbox.filename);
    writeFileSync(inboxPath, inbox.content, "utf8");
    inboxWritten = inboxPath;

    if (existsSync(CHANGELOG)) {
      const cl = readFileSync(CHANGELOG, "utf8");
      if (cl.includes("[Unreleased]")) {
        appendFileSync(
          CHANGELOG,
          `\n${changelogBullet}\n`,
          "utf8"
        );
      }
    }
  }

  process.stdout.write(
    JSON.stringify({
      ok: true,
      dryRun: DRY_RUN,
      preview: PREVIEW_MD,
      inbox: inboxWritten,
      hasGitChanges: hasChanges,
    }) + "\n"
  );
}

main();
