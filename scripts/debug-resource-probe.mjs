#!/usr/bin/env node
/**
 * Safe resource probe — measures memory phases without loading transformers by default.
 * Use --with-transformers only if you accept high RAM usage (debug H1).
 *
 * Usage:
 *   node scripts/debug-resource-probe.mjs
 *   node scripts/debug-resource-probe.mjs --with-transformers
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { debugLog, memorySnapshot } from './lib/debug-ndjson.mjs';
import { assertResourceBudget, acquireProcessLock, releaseProcessLock } from './lib/agent-resource-guard.mjs';

const WITH_TRANSFORMERS = process.argv.includes('--with-transformers');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_ROOT = resolve(ROOT, 'GenerativeUI_monorepo/UniversalWorkbench/.flow');

function chunkTextBytes(chunks) {
  return chunks.reduce((n, c) => n + (c.text?.length ?? 0), 0);
}

async function main() {
  process.env.AGENT_RESOURCE_GUARD = process.env.AGENT_RESOURCE_GUARD || '1';
  acquireProcessLock('debug-resource-probe');
  try {
    // #region agent log
    debugLog({
      location: 'debug-resource-probe.mjs',
      message: 'probe start',
      data: { withTransformers: WITH_TRANSFORMERS, memory: memorySnapshot('start') },
      hypothesisId: 'H1-H3',
    });
    // #endregion

    assertResourceBudget('probe-start');

    const distPath = resolve(ROOT, 'experiments/micro-agents/dist/workers/code-index-runner.js');
    const { runCodeIndex } = await import(pathToFileURL(distPath).href);

    const dryResult = await runCodeIndex({ rootDir: INDEX_ROOT, dryRun: true });
    assertResourceBudget('after-dry-index');
    // #region agent log
    debugLog({
      location: 'debug-resource-probe.mjs',
      message: 'dry index complete',
      data: {
        chunkCount: dryResult.chunks.length,
        textBytes: chunkTextBytes(dryResult.chunks),
        memory: memorySnapshot('after-dry-index'),
      },
      hypothesisId: 'H3',
    });
    // #endregion

    const retained = dryResult.chunks.map((c) => ({ ...c, text: c.text }));
    assertResourceBudget('after-chunk-retain');

    if (WITH_TRANSFORMERS) {
      console.warn('Loading @xenova/transformers — expect RAM spike');
      await runCodeIndex({ rootDir: INDEX_ROOT, dryRun: false });
      assertResourceBudget('after-live-index');
      // #region agent log
      debugLog({
        location: 'debug-resource-probe.mjs',
        message: 'live index complete',
        data: { memory: memorySnapshot('after-live-index') },
        hypothesisId: 'H1',
      });
      // #endregion
    }

    void retained;
    console.log('Resource probe complete — see debug-2c3709.log');
  } finally {
    releaseProcessLock();
  }
}

main().catch((err) => {
  // #region agent log
  debugLog({
    location: 'debug-resource-probe.mjs',
    message: 'probe error',
    data: { error: err instanceof Error ? err.message : String(err), memory: memorySnapshot('error') },
    hypothesisId: 'H1-H3',
  });
  // #endregion
  console.error(err);
  process.exit(1);
});
