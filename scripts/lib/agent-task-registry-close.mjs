#!/usr/bin/env node
import { releaseClaims, updateTaskStatus } from "./agent-task-registry.mjs";

const sessionId = process.argv[process.argv.indexOf("--session-id") + 1];
if (!sessionId) process.exit(0);
updateTaskStatus(sessionId, "closed");
releaseClaims(sessionId);
console.log("ok");
