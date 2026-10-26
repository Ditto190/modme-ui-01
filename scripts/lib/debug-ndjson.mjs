/**
 * Debug session NDJSON logger (session 2c3709).
 * Writes to workspace debug-2c3709.log and POSTs to local ingest (best-effort).
 */
import { appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DEBUG_LOG_PATH = resolve(ROOT, 'debug-2c3709.log');
const SESSION_ID = '2c3709';
const INGEST_URL =
  'http://127.0.0.1:7678/ingest/685ffb04-c3d3-483c-8562-fd2972cf766f';

/** @param {{ location: string, message: string, data?: Record<string, unknown>, hypothesisId?: string, runId?: string }} entry */
export function debugLog(entry) {
  const payload = {
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    pid: process.pid,
    ...entry,
  };
  try {
    appendFileSync(DEBUG_LOG_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    /* ignore */
  }
  fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION_ID,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/** @param {string} label */
export function memorySnapshot(label) {
  const m = process.memoryUsage();
  return {
    label,
    rssMB: Math.round(m.rss / 1_048_576),
    heapUsedMB: Math.round(m.heapUsed / 1_048_576),
    heapTotalMB: Math.round(m.heapTotal / 1_048_576),
    externalMB: Math.round(m.external / 1_048_576),
    arrayBuffersMB: Math.round((m.arrayBuffers ?? 0) / 1_048_576),
  };
}
