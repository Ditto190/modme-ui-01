# VoltOps / Agent Platform Adapter Mapping

Reference for agent platform integrations with the ModMe observability stack.

## Supported platforms

| Platform | Session ID source | Trace ref table | Notes |
|---------|-------------------|----------------|-------|
| Cursor (Agents Window) | `CURSOR_SESSION_ID` env | `trace_refs` | Auto-set in worktree env |
| Cursor (Editor chat) | `AGENT_SESSION_ID` (generated) | `trace_refs` | Set by `agent-session-start.ps1` |
| GitHub Copilot | `GITHUB_COPILOT_SESSION` | `trace_refs` | Via session-logger hook |
| Claude Code | `CLAUDE_SESSION_ID` | `trace_refs` | Via `--session-id` flag |
| Antigravity | `ANTIGRAVITY_SESSION` | `trace_refs` | Via antigravity MCP |

## Correlation field mapping

```
AGENT_SESSION_ID
  → pipeline_runs.metadata.agent_session_id
  → telemetry_events.session_id
  → eval_sessions.external_session_id
  → lean-ctx-session-markers.jsonl[session_id]
  → agent_spans.session_id (Greptime, optional)
```

## agent-platform-adapters.mjs

`scripts/telemetry/agent/agent-platform-adapters.mjs` normalizes session IDs across platforms:

```js
// Usage in telemetry-cli sync:
import { resolveAgentPlatformSessionId } from './agent/agent-platform-adapters.mjs';
const sessionId = resolveAgentPlatformSessionId();
// Returns first defined of: AGENT_SESSION_ID | CURSOR_SESSION_ID | GITHUB_COPILOT_SESSION | ...
```

## session-logger handoff events

`session-logger.ps1` emits these events captured by the lean-ctx-marker collector:

| Event | Trigger | Data |
|-------|---------|------|
| `agent-session-start` | `agent-session-start.ps1` | `session_id`, `branch`, `worktree` |
| `agent-session-finish` | `agent-session-finish.ps1` | `session_id`, `reason` |
| `platform-handoff` | Cross-agent transition | `from_session`, `to_session`, `platform` |

## OpsSignalCard badge

The `agent_platform` badge in `SessionOpsPanel` (`src/components/session-ops-panel.tsx`) reads:

```ts
event.metadata?.agent_platform ?? 'unknown'
```

Set via `agent-platform-adapters.mjs` resolver on session start.
