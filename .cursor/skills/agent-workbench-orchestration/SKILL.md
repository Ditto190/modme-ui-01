---
name: agent-workbench-orchestration
description: >-
  Multi-agent orchestration for GenerativeUI workbench (web-dashboard + agent-server).
  Routes awesome-cursor-skills meta harness, llm-app-patterns coordinator, backend/frontend
  build lanes, and code-reviewer gate. Use for agent UI features, WebSocket streaming, or
  useAgentState work in GenerativeUI_monorepo.
---

# Agent Workbench Orchestration

Production orchestration for `GenerativeUI_monorepo/apps/web-dashboard` + `apps/agent-server`.

## Stack map

| Layer | Skill | Repo touchpoints |
|-------|-------|------------------|
| Meta | `awesome-cursor-skills` | dev URL, browser QA, grind loop, PR |
| Coordinator | `llm-app-patterns` | tracing, caching, agent architecture |
| Backend | `cc-skill-backend-patterns` | `agent-server/src/routes/websocket.py`, `models/schemas.py` |
| Frontend logic | `react-patterns` | `web-dashboard/src/hooks/useAgentState.ts` |
| Frontend design | `frontend-design` | `AgentPanelSkeleton`, `StreamingText`, `globals.css` |
| Gate | `code-reviewer` | diff review before merge |

## Before you start

1. Copy `goal-contract.template.yaml` → `goal-contract.yaml` and fill acceptance criteria.
2. Baseline: note WebSocket latency, token budget, visual-qa pass rate.

## Phase workflow

```
Phase 0  Intake     → goal-contract.yaml (coordinator)
Phase 1  Parallel   → BE lane ∥ FE lane (shared event contract only)
Phase 2  Integrate  → schema + hook + WS alignment (sequential)
Phase 3  Verify     → finding-dev-server-url → verifying-in-browser → visual-qa-testing → grinding-until-pass
Phase 4  Review     → code-reviewer (no P0/P1)
```

### Phase 1 contract (WebSocket events)

Both sides must implement:

- `token` — `{ delta, seq, runId? }`
- `tool_start` — `{ name, callId, runId? }`
- `tool_result` — `{ callId, output, runId? }`
- `done` — `{ runId, usage? }`
- `state_update` / `error` — existing payloads (backward compatible)

Schemas: `packages/shared-schemas/src/index.ts` ↔ `agent-server/src/models/schemas.py`

### Phase 3 verify commands

From `GenerativeUI_monorepo/`:

```bash
yarn workspace @generative-ui/shared-schemas build
yarn workspace @generative-ui/web-dashboard type-check
cd apps/agent-server && poetry run pytest  # if tests exist
```

Dev servers:

```bash
yarn workspace @monorepo-template/web-dashboard dev   # :3000
cd apps/agent-server && poetry run uvicorn src.main:app --reload  # :8000
```

## Cost controls

- Max 2 parallel build subagents + 1 review pass per turn.
- Re-read with diff/delta only after first full pass (lean-ctx).
- Skip code-reviewer if integration or visual-qa fails (save tokens).

## Handoff format

Subagents return JSON:

```json
{
  "agent": "cc-skill-backend-patterns",
  "status": "complete",
  "artifacts": ["apps/agent-server/src/routes/websocket.py"],
  "contract_delta": {},
  "verification": ["poetry run python -m compileall src"],
  "blockers": []
}
```

## Rollback

- Feature-flag WS streaming if needed.
- Revert BE+FE together if schemas diverge.
- Max 2 grind cycles before human checkpoint.

## Related docs

- `GenerativeUI_monorepo/AGENTS.md` — architecture
- `docs/agent-tech-guide.md` — lean-ctx, skills, changelog
- `.cursor/skills/awesome-cursor-skills/SKILL.md` — install & QA skills
