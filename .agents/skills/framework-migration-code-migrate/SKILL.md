---
name: framework-migration-code-migrate
description: Framework migration assistant for Monorepo_ModMe. Routes GenerativeUI → next-forge work to the authoritative modme-generative-ui-migrate playbook.
---

# Framework Migration — Monorepo_ModMe

This skill is a **router** for cross-stack migration in this repository. The authoritative playbook is:

**[`.agents/skills/modme-generative-ui-migrate/SKILL.md`](../modme-generative-ui-migrate/SKILL.md)**

Read that skill before porting code. Do not cross-import monorepos.

## Migration phases (summary)

| Phase | Status | Deliverable |
|-------|--------|-------------|
| 1 Workshop | In progress | `next-forge/apps/storybook/stories/modme-workshop.stories.tsx` |
| 2 Schemas | Done | `next-forge/packages/schemas` (`@repo/schemas`) |
| 3 Client island | Done | `next-forge/apps/app/app/(authenticated)/generative-ui/` |
| 4 Cutover | Pending | Feature flags, deprecate web-dashboard |

## What migrates vs stays

| Migrate | Stay in GenerativeUI |
|---------|---------------------|
| GenerativeCanvas, useAgentState | agent-server (Python satellite) |
| shared-schemas → `@repo/schemas` | vibe-web-app, example-*, agent-generator |
| web-dashboard routes → apps/app | UniversalWorkbench copies |

## Boundaries

- No `workspace:*` imports between `next-forge/` and `GenerativeUI_monorepo/`.
- Integration via HTTP/WebSocket only (`NEXT_PUBLIC_AGENT_SERVER_WS_URL`).
- Rollback: `yarn dev:generative` + disable feature flags in next-forge.

## Verification

```powershell
yarn dev:forge:core      # next-forge app on 3100
yarn dev:generative      # legacy stack; agent-server on 8000
yarn verify:forge        # before next-forge PR
```

## References

- [`docs/agent-index.md`](../../docs/agent-index.md)
- [`docs/codebase/ARCHITECTURE.md`](../../docs/codebase/ARCHITECTURE.md)
- [`docs/codebase/STRUCTURE.md`](../../docs/codebase/STRUCTURE.md)
