/**
 * Agent / pipeline resource guards — memory budget, single-job lock, heavy-mode warnings.
 *
 * Env:
 *   AGENT_RESOURCE_GUARD=1     enforce lock + RSS/heap budget (default off for CI)
 *   AGENT_MAX_RSS_MB=2048      max resident set (MB)
 *   AGENT_MAX_HEAP_MB=1536     max V8 heap used (MB)
 *   AGENT_ALLOW_HEAVY=1        allow live index (transformers + Greptime)
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { debugLog, memorySnapshot } from './debug-ndjson.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LOCK_PATH = resolve(ROOT, '.agent-resource.lock');

const MAX_RSS_MB = Number(process.env.AGENT_MAX_RSS_MB || 2048);
const MAX_HEAP_MB = Number(process.env.AGENT_MAX_HEAP_MB || 1536);

function guardEnabled() {
  return process.env.AGENT_RESOURCE_GUARD === '1';
}

/**
 * @param {string} phase
 * @param {{ maxRssMB?: number, maxHeapMB?: number }} [opts]
 */
export function assertResourceBudget(phase, opts = {}) {
  const maxRss = opts.maxRssMB ?? MAX_RSS_MB;
  const maxHeap = opts.maxHeapMB ?? MAX_HEAP_MB;
  const snap = memorySnapshot(phase);
  // #region agent log
  debugLog({
    location: 'agent-resource-guard.mjs:assertResourceBudget',
    message: 'resource check',
    data: { ...snap, maxRssMB: maxRss, maxHeapMB: maxHeap, guardEnabled: guardEnabled() },
    hypothesisId: 'H1-H3',
  });
  // #endregion
  if (!guardEnabled()) return snap;
  if (snap.rssMB > maxRss) {
    throw new Error(`RSS ${snap.rssMB}MB exceeds budget ${maxRss}MB at ${phase}`);
  }
  if (snap.heapUsedMB > maxHeap) {
    throw new Error(`Heap ${snap.heapUsedMB}MB exceeds budget ${maxHeap}MB at ${phase}`);
  }
  return snap;
}

function isPidAlive(pid) {
  if (!pid || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} jobName */
export function acquireProcessLock(jobName) {
  if (!guardEnabled()) return;
  if (existsSync(LOCK_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(LOCK_PATH, 'utf8'));
      if (!isPidAlive(existing.pid)) {
        unlinkSync(LOCK_PATH);
      } else {
        // #region agent log
        debugLog({
          location: 'agent-resource-guard.mjs:acquireProcessLock',
          message: 'lock conflict',
          data: { jobName, existing },
          hypothesisId: 'H2',
        });
        // #endregion
        throw new Error(
          `Agent job already running: ${existing.name} (pid ${existing.pid}, since ${existing.since})`
        );
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        unlinkSync(LOCK_PATH);
      } else if (err instanceof Error && err.message.startsWith('Agent job')) {
        throw err;
      }
    }
  }
  writeFileSync(
    LOCK_PATH,
    JSON.stringify({ name: jobName, pid: process.pid, since: new Date().toISOString() })
  );
}

export function releaseProcessLock() {
  if (!guardEnabled()) return;
  try {
    if (existsSync(LOCK_PATH)) {
      const raw = readFileSync(LOCK_PATH, 'utf8');
      const lock = JSON.parse(raw);
      if (lock.pid === process.pid) unlinkSync(LOCK_PATH);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Block live embedding index unless explicitly allowed.
 * @param {{ dryRun?: boolean, astOnly?: boolean }} flags
 */
export function assertSafeIndexMode(flags) {
  const willLoadTransformers = !flags.dryRun && !flags.astOnly;
  // #region agent log
  debugLog({
    location: 'agent-resource-guard.mjs:assertSafeIndexMode',
    message: 'index mode',
    data: {
      dryRun: !!flags.dryRun,
      astOnly: !!flags.astOnly,
      willLoadTransformers,
      allowHeavy: process.env.AGENT_ALLOW_HEAVY === '1',
    },
    hypothesisId: 'H1',
  });
  // #endregion
  if (willLoadTransformers && process.env.AGENT_ALLOW_HEAVY !== '1') {
    throw new Error(
      'Live code index loads @xenova/transformers (~400MB+ RAM). Use --dry-run or --ast-only, or set AGENT_ALLOW_HEAVY=1'
    );
  }
}
