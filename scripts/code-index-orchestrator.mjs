#!/usr/bin/env node
/**
 * @feature INBOX.CODE.INDEX
 * Code AST indexer orchestrator — GreptimeDB code patterns + optional inbox promote.
 *
 * Usage:
 *   node scripts/code-index-orchestrator.mjs [--dry-run] [--root <path>] [--promote]
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const rootIdx = args.indexOf('--root');
const INDEX_ROOT =
  rootIdx >= 0
    ? resolve(args[rootIdx + 1])
    : resolve(ROOT, 'GenerativeUI_monorepo/apps/agent-generator/src/mcp-registry');

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

async function loadCodeIndexRunner() {
  const distPath = resolve(ROOT, 'experiments/micro-agents/dist/workers/code-index-runner.js');
  if (!existsSync(distPath)) {
    if (DRY_RUN) {
      console.log('[code-index] DRY RUN — micro-agents dist missing, skipping AST index');
      return null;
    }
    console.log('Building micro-agents...');
    const build = spawnSync('npm', ['run', 'build'], {
      cwd: resolve(ROOT, 'experiments/micro-agents'),
      stdio: 'inherit',
      shell: true,
    });
    if (build.status !== 0) {
      throw new Error('micro-agents build failed');
    }
  }
  if (!existsSync(distPath)) return null;
  return import(pathToFileURL(distPath).href);
}

async function main() {
  console.log(`Indexing AST patterns under: ${INDEX_ROOT}`);
  if (DRY_RUN && !existsSync(resolve(ROOT, 'experiments/micro-agents/dist/workers/code-index-runner.js'))) {
    console.log('[code-index] dry-run complete (no runner built)');
    return;
  }

  const runner = await loadCodeIndexRunner();
  if (!runner) return;

  const { runCodeIndex } = runner;
  const result = await runCodeIndex({ rootDir: INDEX_ROOT, dryRun: DRY_RUN });
  console.log(
    `Indexed ${result.indexed} chunks, skipped ${result.skipped}, total ${result.chunks?.length ?? 0}`
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
