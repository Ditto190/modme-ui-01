# Beads issue tracking — Monorepo_ModMe

Git-backed task memory for multi-session agent work. Prefix: **`modme`**.

## Initialize (once)

```powershell
yarn beads:init
# or: powershell -ExecutionPolicy Bypass -File ./scripts/init-beads-starter-issues.ps1
```

Uses `npx @beads/bd` (no global install). Idempotent — skips init/seed if `.beads/` or issues already exist.

Manual alternative:

```powershell
npx @beads/bd init --prefix modme --non-interactive --skip-agents
```

If beads MCP is enabled in Cursor, run `/init` Phase 1 or use the beads MCP `init` tool with prefix `modme`.

## Starter issues (create after init)

| ID | Title | Type |
|----|-------|------|
| modme-1 | chore: Verify compound Full Stack: Forge Core + Agent Server | chore |
| modme-2 | chore: CI Phase A — confirm pre-commit vs ci.yml split | chore |
| modme-3 | task: Migration Phase 4 — feature-flag cutover for generative-ui | task |
| modme-4 | chore: Document yarn verify:forge + yarn verify:generative in onboarding | chore |
| modme-5 | task: Complete Storybook workshop parity with GenerativeCanvas | task |

## When to use beads vs chat todos

- **Beads:** multi-session work, dependencies, survives context compaction
- **Chat todos:** single-session linear tasks

See [`docs/agent-index.md`](agent-index.md) and [`.cursor/commands/init.md`](../.cursor/commands/init.md).

## CI / automation integration

Onboarding and CI work should be tracked in beads when it spans sessions. Use the repo-local skill:

- [`.agents/skills/cicd-automation-workflow-automate/SKILL.md`](../.agents/skills/cicd-automation-workflow-automate/SKILL.md) — Phase E (beads + verify scripts)

After `yarn beads:init`, agents run `npx @beads/bd ready` at session start and close issues when CI/migration tasks complete.
