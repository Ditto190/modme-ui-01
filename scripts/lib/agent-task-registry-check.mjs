#!/usr/bin/env node
/**
 * E2E smoke: duplicate check + optional register (used by e2e/worktree-smoke README).
 */
import {
  findDuplicateTask,
  registerTask,
  claimPaths,
} from "./agent-task-registry.mjs";

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const title = getArg("--title");
const sessionId =
  getArg("--session-id") ?? "00000000-0000-0000-0000-000000000001";
const pathsRaw = getArg("--paths");
const paths = pathsRaw
  ? pathsRaw.split(",").map((p) => p.trim()).filter(Boolean)
  : [];
const force = args.includes("--force");

if (!title) {
  console.error(
    "usage: agent-task-registry-check.mjs --title <title> [--session-id] [--paths a,b] [--force]",
  );
  process.exit(1);
}

const similar = findDuplicateTask(title);
if (similar && !force) {
  console.log(JSON.stringify({ similar }, null, 2));
  process.exit(2);
}

if (paths.length > 0) {
  const claim = claimPaths(sessionId, paths);
  if (claim.conflict && !force) {
    console.log(JSON.stringify({ pathConflicts: claim }, null, 2));
    process.exit(2);
  }
}

const record = registerTask({
  sessionId,
  description: title,
  worktreePath: process.cwd(),
  beadsIssue: null,
  branch: null,
});
console.log(JSON.stringify({ registered: record }, null, 2));
