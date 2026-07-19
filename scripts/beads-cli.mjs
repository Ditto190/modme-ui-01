#!/usr/bin/env node
/**
 * CLI wrapper for beads adapter — used by PowerShell session scripts.
 *
 * Usage:
 *   node scripts/beads-cli.mjs session-start --title "task" [--description "..."] [--issue modme-xxx]
 *   node scripts/beads-cli.mjs session-finish --issue modme-xxx [--reason "completed"]
 *   node scripts/beads-cli.mjs create --title "task" [--description "..."] [--priority 2]
 */
import {
  beadsClaim,
  beadsClose,
  beadsCreate,
  beadsReady,
  extractIssueId,
  parseBdJson,
} from "./lib/beads-hooks.mjs";

const args = process.argv.slice(2);
const command = args[0];

function flag(name) {
  const idx = args.indexOf(name);
  if (idx < 0 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

function emitJson(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function main() {
  if (command === "session-start") {
    const title = flag("--title") ?? "agent session";
    const description = flag("--description") ?? title;
    const existing = flag("--issue");

    await beadsReady();

    if (existing) {
      await beadsClaim(existing, description);
      emitJson({ ok: true, id: existing, claimed: true });
      return;
    }

    const created = await beadsCreate(title, { description, priority: 2 });
    if (!created.ok) {
      emitJson({ ok: false, error: created.stderr || created.stdout });
      process.exit(created.skipped ? 0 : 1);
    }

    const id = created.id ?? extractIssueId(created.json);
    if (id) await beadsClaim(id, description);
    emitJson({ ok: true, id, created: true });
    return;
  }

  if (command === "session-finish") {
    const issueId = flag("--issue");
    const reason = flag("--reason") ?? "completed";
    if (!issueId) {
      emitJson({ ok: true, skipped: true });
      return;
    }
    const closed = await beadsClose(issueId, reason);
    emitJson({ ok: closed.ok, id: issueId, skipped: closed.skipped ?? false });
    if (!closed.ok && !closed.skipped) process.exit(1);
    return;
  }

  if (command === "create") {
    const title = flag("--title");
    if (!title) {
      console.error("beads-cli create requires --title");
      process.exit(1);
    }
    const description = flag("--description") ?? title;
    const priority = flag("--priority") ? Number(flag("--priority")) : 2;
    const created = await beadsCreate(title, { description, priority });
    emitJson({
      ok: created.ok,
      id: created.id ?? extractIssueId(created.json),
      skipped: created.skipped ?? false,
      json: created.json,
    });
    if (!created.ok && !created.skipped) process.exit(1);
    return;
  }

  console.error(`Unknown command: ${command ?? "(none)"}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
