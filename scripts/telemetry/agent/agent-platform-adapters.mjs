#!/usr/bin/env node
/**
 * Agent platform adapters — normalize session IDs across Cursor, Copilot, Claude Code, Antigravity.
 * Used by telemetry-cli to correlate events from multiple agent platforms.
 */

const PLATFORM_ENV_VARS = [
  { platform: 'cursor-agent', envKey: 'AGENT_SESSION_ID' },
  { platform: 'cursor-editor', envKey: 'CURSOR_SESSION_ID' },
  { platform: 'github-copilot', envKey: 'GITHUB_COPILOT_SESSION' },
  { platform: 'claude-code', envKey: 'CLAUDE_SESSION_ID' },
  { platform: 'antigravity', envKey: 'ANTIGRAVITY_SESSION' },
];

/**
 * Resolve the active agent session ID from environment variables.
 * Returns first defined value across known platform env vars.
 */
export function resolveAgentPlatformSessionId() {
  for (const { envKey } of PLATFORM_ENV_VARS) {
    const val = process.env[envKey];
    if (val) return val;
  }
  return null;
}

/**
 * Detect which agent platform is active from environment variables.
 */
export function detectAgentPlatform() {
  for (const { platform, envKey } of PLATFORM_ENV_VARS) {
    if (process.env[envKey]) return platform;
  }
  return 'unknown';
}

/**
 * Build shared metadata injected on every telemetry event.
 */
export function buildSharedEventMetadata() {
  return {
    session_id: resolveAgentPlatformSessionId(),
    agent_platform: detectAgentPlatform(),
    worktree: process.env.WORKTREE_NAME ?? null,
    branch: process.env.GIT_BRANCH ?? null,
    tenant_id: process.env.DEV_TENANT_ID ?? null,
  };
}
