#!/usr/bin/env node
/**
 * CLI for agent-task-registry.mjs (called from PowerShell).
 */
import {
  findDuplicateTask,
  registerTask,
  updateTaskStatus,
  claimPaths,
  releaseClaims,
} from "./lib/agent-task-registry.mjs";

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case "check-duplicate": {
    const dup = findDuplicateTask(args[0] ?? "");
    console.log(JSON.stringify(dup));
    break;
  }
  case "register": {
    const [sessionId, description, worktreePath, beadsIssue, branch] = args;
    console.log(
      JSON.stringify(
        registerTask({
          sessionId,
          description: description || "agent session",
          worktreePath,
          beadsIssue: beadsIssue || null,
          branch: branch || null,
        }),
      ),
    );
    break;
  }
  case "update": {
    console.log(JSON.stringify(updateTaskStatus(args[0], args[1], args[2])));
    break;
  }
  case "claim": {
    const result = claimPaths(args[0], JSON.parse(args[1] ?? "[]"));
    if (result.conflict) process.exit(1);
    console.log(JSON.stringify(result));
    break;
  }
  case "release": {
    releaseClaims(args[0]);
    console.log("ok");
    break;
  }
  default:
    console.error("usage: agent-task-registry-cli.mjs <check-duplicate|register|update|claim|release> ...");
    process.exit(1);
}
