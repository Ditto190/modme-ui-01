#!/usr/bin/env node
/**
 * OTel session-start bridge — thin Node.js shim that wires GreptimeDB
 * OTLP exporters for a new agent session.
 *
 * Called from agent-session-start.ps1 after AGENT_SESSION_ID and
 * OTEL_RESOURCE_ATTRIBUTES have been set in the environment.
 *
 * Usage:
 *   node scripts/telemetry/otel-session-start.mjs [--dry-run] [--session-id=<id>]
 */
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRootEnv } from '../lib/load-root-env.mjs';
import {
  writeGreptimeSpan,
  writeTraceRef,
  redactSecrets,
  resolveTenantId,
} from './lib/telemetry-bridge.mjs';
import { detectAgentPlatform } from './lib/agent-platform-adapters.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SESSION_ID_ARG = args.find((a) => a.startsWith('--session-id='))?.split('=')[1];

loadRootEnv({ fileWins: true });

const SESSION_ID = SESSION_ID_ARG ?? process.env.AGENT_SESSION_ID ?? randomBytes(8).toString('hex');
const TENANT_ID = resolveTenantId(process.env.DEV_TENANT_ID);
const BRANCH = process.env.GIT_BRANCH ?? process.env.BRANCH ?? '';
const WORKTREE = process.env.WORKTREE_NAME ?? process.env.AGENT_WORKTREE ?? '';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'modme-agent-orchestrator';

function parseOtelResourceAttributes(raw) {
  if (!raw) return {};
  return Object.fromEntries(
    raw.split(',').map((pair) => pair.split('=').map((s) => s.trim())).filter(([k]) => k).map(([k, v]) => [k, v ?? ''])
  );
}

function generateTraceId() { return randomBytes(16).toString('hex'); }
function generateSpanId() { return randomBytes(8).toString('hex'); }

async function main() {
  const platform = detectAgentPlatform();
  const resourceAttrs = parseOtelResourceAttributes(process.env.OTEL_RESOURCE_ATTRIBUTES);
  const traceId = generateTraceId();
  const spanId = generateSpanId();
  const startedAt = Date.now();

  const span = {
    span_id: spanId, trace_id: traceId, tenant_id: TENANT_ID, session_id: SESSION_ID,
    span_name: 'agent.session', duration_ms: 0, timestamp: startedAt,
    attributes: redactSecrets(JSON.stringify({
      'service.name': SERVICE_NAME, 'session.id': SESSION_ID,
      'agent.platform': platform.agent_platform, 'git.branch': BRANCH,
      'agent.worktree': WORKTREE, ...resourceAttrs,
    })),
  };

  if (DRY_RUN) {
    process.stdout.write(JSON.stringify({ result: 'dry-run', span, trace_id: traceId, span_id: spanId, session_id: SESSION_ID, agent_platform: platform.agent_platform }) + '\n');
    process.exit(0);
  }

  const greptimeResult = await writeGreptimeSpan(span, { dryRun: false });
  const traceRef = await writeTraceRef({ tenantId: TENANT_ID, sessionId: SESSION_ID, traceId, spanId, agentPlatform: platform.agent_platform, branch: BRANCH, worktree: WORKTREE, serviceName: SERVICE_NAME });

  process.stdout.write(JSON.stringify({ result: 'ok', trace_id: traceId, span_id: spanId, session_id: SESSION_ID, agent_platform: platform.agent_platform, greptime: greptimeResult, trace_ref: traceRef }) + '\n');
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ error: true, message: err instanceof Error ? err.message : String(err), session_id: SESSION_ID }) + '\n');
  process.exit(1);
});
