/**
 * Structured logging for agent terminal orchestration.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const LOG_DIR = resolve(ROOT, "logs/agent-orchestrator");
const ERROR_LOG = resolve(LOG_DIR, "errors.jsonl");

function ensureDir() {
  mkdirSync(LOG_DIR, { recursive: true });
}

export function logOrchestrator(level, event, details = {}) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    level,
    event,
    ...details,
  });
  if (level === "error") {
    ensureDir();
    appendFileSync(ERROR_LOG, `${line}\n`, "utf8");
  }
  const prefix = `[agent-orchestrator] level=${level} event=${event}`;
  if (level === "error") {
    console.error(prefix, details.message ?? "");
  } else {
    console.log(prefix);
  }
}

export function sessionDir() {
  ensureDir();
  return resolve(LOG_DIR, "sessions");
}

export function logOrchestratorException(source, err, extra = {}) {
  logOrchestrator("error", source, {
    message: err?.message ?? String(err),
    ...extra,
  });
}
