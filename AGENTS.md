# AGENTS.md — Monorepo_ModMe

Guidance for Cursor agents, cloud agents, and GitHub Copilot. **Read order:** this file → [`docs/ECL.md`](docs/ECL.md) → active harness change → [`docs/STATUS.md`](docs/STATUS.md) → [`docs/agent-index.md`](docs/agent-index.md).

## Repository layout (federated dual-monorepo)

| Path | Role | Package manager |
|------|------|-----------------|
| **`next-forge/`** | **Primary** product (apps, `@repo/*`, Supabase) | Bun |
| **`GenerativeUI_monorepo/`** | **Legacy** agent stack (agent-server satellite) | Yarn 3.3 |
| **Root** | Meta-orchestration, harness, intake, CI glue | Yarn 3.3 |
| **`src/` / `agent/`** | **Legacy/deprecated** GenUI R&D stub — do not extend | — |

**Forbidden:** `workspace:*` or relative imports across `next-forge/` ↔ `GenerativeUI_monorepo/`. Integration: HTTP/WebSocket + `@repo/schemas` golden JSON only.

## Default commands

```bash
# next-forge (primary)
yarn dev:forge:core          # app + web + api (3100–3102)
yarn verify:forge            # CI parity (check + test + build)

# GenerativeUI (legacy satellite)
yarn dev:generative          # agent-server + legacy apps
yarn verify:generative       # CI parity (lint + test + build)

# Meta-orchestration
yarn verify:all              # full forge + generative
yarn lint:harness            # ECL structure validation
yarn worktree:doctor         # worktree pre-flight
yarn pre-commit:check        # staged hook checks
```

From `next-forge/`: `npx bun install && npx bun run dev`

## Multi-agent worktrees

Feature work **must not** happen in the main checkout.

```powershell
.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner cursor
yarn worktree:ports            # before yarn dev:*
```

Docs: [`docs/multi-agent-worktrees.md`](docs/multi-agent-worktrees.md). PRs target **`dev`**.

## Agent behavior

1. **Reads:** lean-ctx `ctx_read(path, mode)` — see [`LEAN-CTX.md`](LEAN-CTX.md)
2. Run verification in the affected stack before marking work complete
3. Do not edit `UniversalWorkbench-staging` or `UniversalWorkbench-dev` unless tasked
4. Session start: `ctx_session(load)` + `yarn lean-ctx:ensure`

## Session end (worktrees only)

```powershell
yarn lint:harness
yarn verify:forge | yarn verify:generative | yarn verify:all
.\scripts\vibe-session-finish.ps1
```

## Deep docs

| Doc | Use when |
|-----|----------|
| [`docs/agent-index.md`](docs/agent-index.md) | Ports, migration status, canonical map |
| [`docs/ECL.md`](docs/ECL.md) | Change classification + verify |
| [`docs/codebase/`](docs/codebase/) | Stack, structure, architecture evidence |
| [`C4-Documentation/`](C4-Documentation/) | Product C4 architecture |
| [`docs/agent-tech-guide.md`](docs/agent-tech-guide.md) | lean-ctx, CI, learned preferences |
| [`.agents/skills/next-forge/SKILL.md`](.agents/skills/next-forge/SKILL.md) | Bun/Supabase setup |
| [`.agents/skills/modme-generative-ui-migrate/SKILL.md`](.agents/skills/modme-generative-ui-migrate/SKILL.md) | Strangler migration |

## Inbox capture

Drop notes in `GenerativeUI_monorepo/docs/inbox/` with frontmatter — see [`docs/inbox-pipeline/README.md`](docs/inbox-pipeline/README.md).
