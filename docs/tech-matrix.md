# Tech Matrix

Component-level cross-reference: stack, ownership, decision record, and diagram per component. Seeded from `docs/codebase/STACK.md`; keep both in sync when ports or managers change.

| Component | Stack | Pkg manager | Port | SoR | ADR | C4 | Beads id |
|---|---|---|---|---|---|---|---|
| Intake orchestrator | Node ESM (`scripts/intake-orchestrator.mjs`) | Yarn 3.3 (root) | — | Supabase `inbox_entries` | [next-forge 0013](../next-forge/docs/adr/0013-obsidian-intake-trigger-and-session-gates.md), [0009](../next-forge/docs/adr/0009-inbox-data-contract-and-quality-gates.md), [0010](../next-forge/docs/adr/0010-dual-store-knowledge-intake.md) | [c4-component-intake-pipeline](../C4-Documentation/c4-component-intake-pipeline.md) | modme-7lo |
| Obsidian intake trigger | PowerShell watcher (`scripts/obsidian-intake-trigger.ps1`) | — | — | funnel dir (`GenerativeUI_monorepo/docs/inbox/`) | [next-forge 0013](../next-forge/docs/adr/0013-obsidian-intake-trigger-and-session-gates.md) | [c4-component-intake-pipeline](../C4-Documentation/c4-component-intake-pipeline.md) | modme-7lo |
| Inbox contract schemas | TypeScript + Zod (`next-forge/packages/schemas`) | Bun | — | `docs/inbox-pipeline/contracts/inbox-contract.v1.json` | [next-forge 0009](../next-forge/docs/adr/0009-inbox-data-contract-and-quality-gates.md) | [c4-component-intake-pipeline](../C4-Documentation/c4-component-intake-pipeline.md) | modme-7lo |
| ModMe-Vault sidecar | Obsidian + junction | — | — | vault at `C:\Users\dylan\ModMe-Vault` | root [0018 (TODO)](./adr/) | [c4-component-inbox-pipeline](../C4-Documentation/components/c4-component-inbox-pipeline.md) | — |
| Supabase knowledge store | Postgres + pgvector (`modme-next-forge`, ref `aevemmmmouxqlfyxthzf`) | — | — | hosted Supabase | [next-forge 0002](../next-forge/docs/adr/0002-cloud-first-supabase-with-prisma.md) | [c4-component-intake-pipeline](../C4-Documentation/c4-component-intake-pipeline.md) | — |
| next-forge app | Next.js 15+, React 19 | Bun | 3100 | — | [next-forge 0002](../next-forge/docs/adr/0002-cloud-first-supabase-with-prisma.md) | — | — |
| next-forge web / api / docs / storybook | Next.js / Mintlify / Storybook | Bun | 3101 / 3102 / 3104 / 6106 | — | — | — | — |
| GenerativeUI vibe-web-app / web-dashboard / example-next | Next.js 14, CopilotKit | Yarn 3.3 | 3000 / 3001 / 3002 | — | — | — | — |
| GenerativeUI agent-server | FastAPI + Poetry | Poetry | 8000 | — | — | — | — |
| Agent terminal orchestration | Node scripts (`yarn agent:*`) | Yarn 3.3 (root) | — | `logs/agent-orchestrator/sessions/` | [next-forge 0011](../next-forge/docs/adr/0011-terminal-orchestration-without-nx.md), [0012](../next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md) | — | — |
