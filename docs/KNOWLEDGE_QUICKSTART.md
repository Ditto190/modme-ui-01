# Knowledge Management Quickstart

**Single entrypoint** for ModMe knowledge and the agent data plane.

Canonical architecture: [ADR-0013](architecture/decisions/0013-dolt-beads-entire-agent-data-plane.md) · Catalog index: [knowledge/CATALOG.md](knowledge/CATALOG.md)

## Planes (dual-store)

| Plane                        | SoR                           | Commands                                    |
| ---------------------------- | ----------------------------- | ------------------------------------------- |
| Product + inbox/knowledge UI | Supabase Postgres             | `yarn intake*`, `yarn inbox:*`              |
| Agent tasks                  | Beads (Dolt)                  | `yarn beads:ready`, `yarn beads:push`       |
| Agent/catalog CMS            | Dolt `config/dolt/catalog/`   | `yarn dolt:up`, `yarn dolt:catalog:init`    |
| Agent sessions               | Entire CLI (local git branch) | `yarn entire:install`, `yarn entire:status` |

**Do not** put product Prisma / pgvector on Dolt.

## One-command health

```powershell
yarn km:status
```

Aggregates Entire, Dolt sql-server, Beads ready, and inbox funnel audit.

## First-time local setup

```powershell
# 1. Entire (session capture) — Scoop or Go
yarn entire:install

# 2. Dolt
winget install DoltHub.Dolt   # once
yarn dolt:up
yarn dolt:catalog:init

# 3. Beads (already initialized in repo)
yarn beads:ready

# 4. Optional: prepare beads ↔ sql-server env
yarn dolt:beads:migrate-server
```

## Daily agent workflow

```powershell
.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner cursor
# Worktree setup already runs km-session-bootstrap + agent-session-start
yarn agent:session:start --% -TaskTitle "<task>"   # also runs yarn km:bootstrap
yarn km:status
# F5: "Full Stack: Forge Core + Agent Data Plane" (strict KM) or "next-forge: dev core" (soft KM)
# ... work ...
.\scripts\agent-session-finish.ps1 -VerifyStack
```

Manual KM only: `yarn km:bootstrap` (soft) or `yarn km:bootstrap:strict`.

Beads: [beads-workflow.md](beads-workflow.md) · Entire checkpoints live on `entire/checkpoints/v1` (not your feature branch).
Debug launches: [debug-launch-guide.md](debug-launch-guide.md) §2 Agent data plane.

## Inbox → Knowledge (canonical product KM)

Drop notes in `GenerativeUI_monorepo/docs/inbox/` then:

```powershell
yarn inbox:audit
yarn intake:orchestrate
```

Full guide: [inbox-pipeline/README.md](inbox-pipeline/README.md).

## Legacy toolset sync (deprecated path)

`agent/toolsets.json` ↔ `docs/toolsets/` is **legacy** (root `agent/` is deprecated). Prefer inbox + catalog.

```powershell
yarn km:legacy:validate
yarn km:legacy:sync
yarn km:legacy:diagram
```

Details: [KNOWLEDGE_MANAGEMENT.md](KNOWLEDGE_MANAGEMENT.md) (historical), [scripts/knowledge-management/README.md](../scripts/knowledge-management/README.md) (issue context mapper).

## Obsidian

Intended: `yarn docs:clipper:export` + `templates/obsidian-clipper/`. **Currently missing** on disk — see CATALOG.md status `missing`. Capture via inbox until restored.

## Skills that help

| Skill                      | When                           |
| -------------------------- | ------------------------------ |
| `detecting-port-conflicts` | Port 3307 / forge ports busy   |
| `suggesting-cursor-rules`  | Encode Entire/Dolt conventions |
| `awesome-cursor-skills`    | Discover browser/CI helpers    |
| `/beads`                   | Multi-session task memory      |

## Related

- [agent-index.md](agent-index.md)
- [agent-terminal-orchestration.md](agent-terminal-orchestration.md)
- [codebase/STACK.md](codebase/STACK.md) — ports including Dolt 3307
