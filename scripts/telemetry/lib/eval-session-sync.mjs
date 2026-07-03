#!/usr/bin/env node
/**
 * Upsert eval_sessions on agent-session start/finish.
 * Usage: node eval-session-sync.mjs start|finish --session-id=<uuid> [--worktree=] [--branch=]
 */
import { loadRootEnv } from '../../lib/load-root-env.mjs';
import { upsertEvalSession } from './telemetry-bridge.mjs';

const args = process.argv.slice(2);
const action = args[0];
const sessionId =
  args.find((a) => a.startsWith('--session-id='))?.split('=')[1] ??
  process.env.AGENT_SESSION_ID;
const worktree =
  args.find((a) => a.startsWith('--worktree='))?.split('=')[1] ?? null;
const branch = args.find((a) => a.startsWith('--branch='))?.split('=')[1] ?? null;
const dryRun = args.includes('--dry-run');

function emit(result) {
  process.stdout.write(`${JSON.stringify({ result })}\n`);
}

function fail(message) {
  process.stderr.write(
    `${JSON.stringify({ error: true, code: 'USAGE', message })}\n`
  );
  process.exit(2);
}

async function main() {
  loadRootEnv({ fileWins: true });

  if (!sessionId || !action) {
    fail('Usage: eval-session-sync.mjs start|finish --session-id=<uuid>');
  }

  if (action === 'start') {
    const res = await upsertEvalSession({
      externalSessionId: sessionId,
      worktreePath: worktree,
      branch: branch || null,
      agent: process.env.AGENT_NAME ?? 'cursor',
      startedAt: new Date().toISOString(),
      dryRun,
    });
    emit({ action: 'start', sessionId, ...res });
    return;
  }

  if (action === 'finish') {
    const res = await upsertEvalSession({
      externalSessionId: sessionId,
      endedAt: new Date().toISOString(),
      dryRun,
    });
    emit({ action: 'finish', sessionId, ...res });
    return;
  }

  fail(`Unknown action: ${action}`);
}

main().catch((err) => {
  process.stderr.write(
    `${JSON.stringify({
      error: true,
      code: 'RUNTIME',
      message: err instanceof Error ? err.message : String(err),
    })}\n`
  );
  process.exit(1);
});
