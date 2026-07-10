#!/usr/bin/env node
/**
 * Multi-agent platform adapters — normalize heterogeneous agent environments
 * into OTel-compatible resource attributes + observability-contract v1 shape.
 *
 * Detection order: environment variables > file-system markers > fallback.
 *
 * Platforms: cursor | copilot | claude | voltagent | cloud | lean-ctx | human
 */
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * @typedef {Object} AgentPlatformInfo
 * @property {string} agent_platform - Normalized platform slug
 * @property {string|null} agent_id   - Platform-specific session/run identifier
 * @property {Record<string,string>} otel_resource - OTel resource attribute overrides
 * @property {Record<string,string>} event_fields   - Extra fields for telemetry_events
 */

/**
 * Detect the current agent platform.
 * @param {object} [overrides] - Optional env overrides (for testing)
 * @returns {AgentPlatformInfo}
 */
export function detectAgentPlatform(overrides = {}) {
  const env = { ...process.env, ...overrides };

  if (isCursor(env)) return buildCursorAdapter(env);
  if (isCopilot(env)) return buildCopilotAdapter(env);
  if (isClaude(env)) return buildClaudeAdapter(env);
  if (isVoltAgent(env)) return buildVoltAgentAdapter(env);
  if (isCloudAgent(env)) return buildCloudAgentAdapter(env);
  if (isLeanCtx(env)) return buildLeanCtxAdapter(env);
  return buildHumanAdapter(env);
}

/**
 * Normalize raw event fields emitted by an adapter into a telemetry_events row
 * compatible with observability-contract v1.
 * @param {AgentPlatformInfo} platform
 * @param {object} event - Base event object
 * @returns {object} Merged event with platform fields
 */
export function normalizeAgentEvent(platform, event = {}) {
  return {
    ...event,
    agent_platform: platform.agent_platform,
    agent_id: platform.agent_id ?? null,
    metadata: {
      ...(event.metadata ?? {}),
      ...platform.event_fields,
      ...platform.otel_resource,
    },
  };
}

// ─── Detectors ────────────────────────────────────────────────────────────────

function isCursor(env) {
  return (
    Boolean(env.CURSOR_SESSION_ID) ||
    Boolean(env.CURSOR_TRACE_ID) ||
    existsSync(join(process.cwd(), '.cursor', 'hooks', 'state'))
  );
}

function isCopilot(env) {
  return (
    Boolean(env.GITHUB_COPILOT_TOKEN) ||
    Boolean(env.COPILOT_SESSION_ID) ||
    Boolean(env.GITHUB_COPILOT_CHAT_ENABLED) ||
    existsSync(join(process.cwd(), '.github', 'hooks', 'session-logger'))
  );
}

function isClaude(env) {
  return (
    Boolean(env.CLAUDECODE) ||
    Boolean(env.CLAUDE_CODE_ENTRYPOINT) ||
    Boolean(env.CLAUDE_SESSION_ID) ||
    existsSync(join(homedir(), '.claude'))
  );
}

function isVoltAgent(env) {
  return (
    Boolean(env.VOLTAGENT_SESSION_ID) ||
    Boolean(env.VOLTAGENT_API_KEY) ||
    existsSync(join(process.cwd(), '.voltagent'))
  );
}

function isCloudAgent(env) {
  return Boolean(env.CURSOR_CLOUD) || env.AGENT_OWNER === 'cloud';
}

function isLeanCtx(env) {
  return (
    Boolean(env.LEAN_CTX_DATA_DIR) ||
    Boolean(env.LEAN_CTX_STATE_DIR) ||
    existsSync(join(process.cwd(), '.lean-ctx.toml'))
  );
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildCursorAdapter(env) {
  const agent_id = env.CURSOR_SESSION_ID ?? env.CURSOR_TRACE_ID ?? null;
  return {
    agent_platform: 'cursor',
    agent_id,
    otel_resource: {
      'agent.platform': 'cursor',
      'cursor.session_id': agent_id ?? '',
      'service.name': env.OTEL_SERVICE_NAME ?? 'modme-cursor-agent',
    },
    event_fields: {
      agent_platform: 'cursor',
      worktree: env.WORKTREE_NAME ?? '',
      branch: env.GIT_BRANCH ?? '',
    },
  };
}

function buildCopilotAdapter(env) {
  const agent_id = env.COPILOT_SESSION_ID ?? env.GITHUB_RUN_ID ?? null;
  return {
    agent_platform: 'copilot',
    agent_id,
    otel_resource: {
      'agent.platform': 'copilot',
      'copilot.session_id': agent_id ?? '',
      'service.name': env.OTEL_SERVICE_NAME ?? 'modme-copilot-agent',
    },
    event_fields: {
      agent_platform: 'copilot',
      worktree: env.WORKTREE_NAME ?? '',
      branch: env.GIT_BRANCH ?? env.GITHUB_REF_NAME ?? '',
    },
  };
}

function buildClaudeAdapter(env) {
  const agent_id = env.CLAUDE_SESSION_ID ?? env.AGENT_SESSION_ID ?? null;
  return {
    agent_platform: 'claude',
    agent_id,
    otel_resource: {
      'agent.platform': 'claude',
      'claude.session_id': agent_id ?? '',
      'service.name': env.OTEL_SERVICE_NAME ?? 'modme-claude-agent',
    },
    event_fields: {
      agent_platform: 'claude',
      worktree: env.WORKTREE_NAME ?? '',
      branch: env.GIT_BRANCH ?? '',
    },
  };
}

function buildVoltAgentAdapter(env) {
  const agent_id = env.VOLTAGENT_SESSION_ID ?? null;
  return {
    agent_platform: 'voltagent',
    agent_id,
    otel_resource: {
      'agent.platform': 'voltagent',
      'voltagent.session_id': agent_id ?? '',
      'service.name': env.OTEL_SERVICE_NAME ?? 'modme-voltagent',
      'parent.agent_id': env.VOLTAGENT_PARENT_ID ?? '',
    },
    event_fields: {
      agent_platform: 'voltagent',
      parent_session_id: env.VOLTAGENT_PARENT_ID ?? null,
      worktree: env.WORKTREE_NAME ?? '',
      branch: env.GIT_BRANCH ?? '',
    },
  };
}

function buildCloudAgentAdapter(env) {
  const agent_id = env.AGENT_SESSION_ID ?? null;
  return {
    agent_platform: 'cloud',
    agent_id,
    otel_resource: {
      'agent.platform': 'cloud',
      'cloud.session_id': agent_id ?? '',
      'service.name': env.OTEL_SERVICE_NAME ?? 'modme-cloud-agent',
    },
    event_fields: {
      agent_platform: 'cloud',
      worktree: env.WORKTREE_NAME ?? '',
      branch: env.GIT_BRANCH ?? '',
    },
  };
}

function buildLeanCtxAdapter(env) {
  const agent_id = env.AGENT_SESSION_ID ?? null;
  return {
    agent_platform: 'lean-ctx',
    agent_id,
    otel_resource: {
      'agent.platform': 'lean-ctx',
      'lean_ctx.data_dir': env.LEAN_CTX_DATA_DIR ?? '',
      'lean_ctx.state_dir': env.LEAN_CTX_STATE_DIR ?? '',
      'service.name': env.OTEL_SERVICE_NAME ?? 'modme-lean-ctx',
    },
    event_fields: {
      agent_platform: 'lean-ctx',
      source: 'lean-ctx-mcp',
      worktree: env.WORKTREE_NAME ?? '',
      branch: env.GIT_BRANCH ?? '',
    },
  };
}

function buildHumanAdapter(env) {
  return {
    agent_platform: 'human',
    agent_id: env.AGENT_SESSION_ID ?? null,
    otel_resource: {
      'agent.platform': 'human',
      'service.name': env.OTEL_SERVICE_NAME ?? 'modme-human',
    },
    event_fields: {
      agent_platform: 'human',
      worktree: env.WORKTREE_NAME ?? '',
      branch: env.GIT_BRANCH ?? '',
    },
  };
}

/**
 * Span taxonomy helpers — build OTel-compatible span attribute objects.
 */
export const SpanTaxonomy = {
  agentSession(sessionId, platform, branch) {
    return {
      span_name: 'agent.session',
      attributes: { 'session.id': sessionId, 'agent.platform': platform, 'git.branch': branch ?? '' },
    };
  },
  agentToolCall(toolName, leanCtxMode, durationMs) {
    return {
      span_name: 'agent.tool_call',
      attributes: { 'tool.name': toolName, 'lean_ctx.mode': leanCtxMode ?? '', 'duration.ms': durationMs ?? 0 },
    };
  },
  agentHandoff(parentSessionId, childSessionId) {
    return {
      span_name: 'agent.handoff',
      attributes: { 'parent.session_id': parentSessionId ?? '', 'child.session_id': childSessionId ?? '' },
    };
  },
  telemetrySync(pipelineRunId, eventsCount) {
    return {
      span_name: 'telemetry.sync',
      attributes: { 'pipeline.run_id': pipelineRunId ?? '', 'events.count': eventsCount ?? 0 },
    };
  },
  leanCtxRead(path, mode, tokensSaved) {
    return {
      span_name: 'lean_ctx.read',
      attributes: { 'file.path': path ?? '', 'lean_ctx.mode': mode ?? '', 'tokens.saved': tokensSaved ?? 0 },
    };
  },
};
