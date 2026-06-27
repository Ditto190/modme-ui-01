# AGENTS.md — Monorepo_ModMe

Guidance for Cursor agents, cloud agents, and GitHub Copilot working in this repository.

## Repository layout

- **`next-forge/`** — **primary** Turborepo for apps, Mintlify docs, and Storybook workshop (Bun, `@repo/*`)
- **`GenerativeUI_monorepo/`** — **legacy** Turborepo (Yarn 3 workspaces, Turbo) — CopilotKit + agent-server
  - `apps/` — web-dashboard, agent-server, vibe-web-app, agent-generator
  - `packages/` — shared-schemas and template packages
  - `UniversalWorkbench/` — workbench monorepo variant (staging/dev copies also exist; read-only unless tasked)
- **`.cursor/rules/`** — Cursor project rules (MDC). Includes lean-ctx, monorepo-boundaries, multi-agent-worktrees.
- **`.agents/skills/`** — Agent skills (Cursor + Copilot compatible SKILL.md format)
- **`.github/copilot-instructions.md`** — always-on Copilot instructions
- **`.github/instructions/`** — file-scoped Copilot instructions from awesome-copilot
- **`.vendor/awesome-copilot-main/`** — vendored github/awesome-copilot (refresh via setup script)

## Default commands

**next-forge** (apps, docs, workshop) — from repo root:

```bash
yarn dev:forge              # all next-forge apps
yarn dev:forge:core         # app + web + api (3100–3102)
yarn dev:forge:workshop     # docs + storybook
yarn dev:forge:supabase     # local Supabase Postgres
yarn dev:forge:docs         # Mintlify on port 3104
yarn dev:forge:storybook    # Storybook on port 6106
yarn verify:forge           # CI parity (check + test + build)
```

From `next-forge/` (use `npx bun` if Bun is not on PATH):

```bash
npx bun install
npx bun run dev
npx bun run build
```

**GenerativeUI** (legacy agent stack) — from repo root or `GenerativeUI_monorepo/`:

```bash
yarn dev:generative         # from repo root
yarn verify:generative      # CI parity (lint + test + build)
```

```bash
cd GenerativeUI_monorepo
yarn install
yarn dev
yarn build
yarn test
yarn lint
```

Per-package scripts vary (Vite/Biome/Vitest vs Next.js). Check the nearest `package.json`.

## Multi-agent worktrees

Feature work **must not** happen in the main checkout. Use isolated Git worktrees so parallel agents avoid file/Git/port conflicts.

| IDE | Start |
|-----|-------|
| Cursor Agents Window | Start agent (auto worktree via `.cursor/worktrees.json`) |
| Cursor Editor | `/worktree <task>` |
| VS Code Copilot | `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner copilot` |
| Claude Code | `-Owner claude` |
| Antigravity | `-Owner antigravity` |

**Once:** `.\scripts\init-worktrees.ps1`  
**Per task:** `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner <owner>`  
**Guard:** `yarn worktree:ensure` (fail on main checkout) or `.\scripts\ensure-worktree.ps1 -WarnOnly`  
**Doctor:** `yarn worktree:doctor` / `yarn worktree:doctor:fix` (yarn.lock, ports, gh, Supabase env)  
**Migrate main:** `.\scripts\migrate-main-to-worktree.ps1 -Name "<task>" -Owner cursor` when main has uncommitted work  
**Ports:** `. .\scripts\load-worktree-ports.ps1` or `yarn worktree:ports` before `yarn dev:*`  
**Docs:** [`docs/multi-agent-worktrees.md`](docs/multi-agent-worktrees.md)

## Agent behavior

1. Read `package.json` in the target package before changing build/test commands.
2. Use workspace protocol dependencies (`workspace:*`) for internal packages.
3. Do not edit `UniversalWorkbench-staging` or `UniversalWorkbench-dev` unless the task explicitly targets them.
4. Run verification in the affected package before marking work complete.
5. For browser/UI work, use Cursor browser MCP skills (`visual-qa-testing`, `verifying-in-browser`).
6. **Multi-Agent Coordination**: Register your presence using `ctx_agent action=register agent_type=<type> role=<role>`.
7. **Agent Memory**: Keep a persistent lab notebook across sessions by writing to your diary via `ctx_agent action=diary category=<category> content="<notes>"`.
8. **Shared Knowledge**: Use `ctx_session` and `ctx_knowledge` to store project-wide findings and share context handoffs with other agents working in the monorepo.
9. Before smart-git session finish: `yarn lean-ctx:ensure` (or `-CheckOnly` via `vibe-session-finish.ps1` default). See ADR-0012.

## Environment & secrets (agents — read ADR-0010)

**Never commit** root `.env` or paste secret values into tracked files. Document **variable names only**.

ModMe agentic workflows use **`engine: copilot`**. GitHub Actions needs repo secret **`COPILOT_GITHUB_TOKEN`** (fine-grained PAT with **Copilot Requests: Read**).

### Setup checklist (repo root)

```powershell
Copy-Item .env.example .env    # if missing; fill from dashboard / PAT settings
yarn setup:env                 # root .env → next-forge dotenv files
yarn setup:gh-aw               # push PAT to GitHub as COPILOT_GITHUB_TOKEN
yarn setup:modme               # full orchestrator (env + gh-aw + forge check)
yarn dev:forge:core            # verify app 3100 / web 3101 / api 3102
```

### Root `.env` token keys (first match wins for gh-aw)

1. `COPILOT_GITHUB_TOKEN` (preferred)
2. `GITHUB_PAT`
3. `GITHUB_PERSONAL_ACCESS_TOKEN`

### Propagation targets (`yarn setup:env`)

| Target | Keys |
|--------|------|
| `next-forge/packages/database/.env` | `DATABASE_URL`, `DIRECT_URL` |
| `next-forge/apps/app/.env.local` | Supabase, DB, `AUTH_SECRET`, ModMe URLs |
| `next-forge/apps/api/.env.local` | Supabase, DB, `AUTH_SECRET` |
| `next-forge/apps/web/.env.local` | Supabase, web URL |

### gh-aw on Windows

Native PowerShell: **`gh aw compile` hangs** — skip locally or use WSL. CI compiles on push. Extension: **v0.79.8+** (avoid 0.68.4–0.71.3).

**Authoritative docs**: [ADR-0010](next-forge/docs/adr/0010-gh-aw-copilot-secrets-and-root-env-sync.md) · [`docs/gh-aw-setup.md`](docs/gh-aw-setup.md) · [`.agents/skills/modme-dev-setup/SKILL.md`](.agents/skills/modme-dev-setup/SKILL.md)

## End of session (vibe-coding / prototypes)

After prototyping in a **worktree** (not the main checkout):

```powershell
yarn worktree:doctor          # pre-flight in worktree (use -Fix via yarn worktree:doctor:fix)
yarn check:forge              # fast Ultracite check while iterating (next-forge)
yarn verify:forge             # CI parity before PR (check + test + build)
yarn verify:generative        # when GenerativeUI paths changed
yarn pre-commit:check         # same as git pre-commit hook
.\scripts\vibe-session-finish.ps1   # group → commit → optional push/PR (prefer in worktrees)
# Agent headless: -Yes -CommitMessage "..." -Push -CreatePr
# Preview: .\scripts\vibe-session-finish.ps1 -DryRun -SkipPull
```

- Branch creation: `new-agent-worktree.ps1` or `/worktree` only — see [`.agents/skills/smart-git-automation/SKILL.md`](.agents/skills/smart-git-automation/SKILL.md)
- PRs target **`dev`**, not `main`
- Git hooks install automatically in worktrees; one-time on main: `yarn hooks:install`

## Updating AI configuration

```powershell
.\scripts\cursor-ai\setup.ps1
yarn contextarch:install   # contextarch CLI (vendor + verify)
```

## ContextArch (AI context file generator)

[contextarch](https://github.com/ksoventures/contextarch-cli) generates consistent `.cursorrules`, `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` from a single wizard.

- **Install/verify**: `yarn contextarch:install` (vendors source to `.vendor/contextarch-cli-main/` and builds the CLI)
- **Run wizard**: `yarn contextarch init` (interactive; backs up existing files on overwrite)
- **Verify outputs**: `yarn contextarch:verify`
- **Sub-project**: `yarn contextarch init -C next-forge`
- **Non-interactive bootstrap**: `yarn contextarch:bootstrap next-forge` (see `scripts/contextarch-targets.json`)

Root `AGENTS.md` and `.cursor/rules/` are hand-maintained — use contextarch for **new packages** or after reviewing `--overwrite` impact.

## Workspace docs (all agents)

- **Onboarding:** run `/init` in Cursor (beads + debug setup + doc map)
- [`docs/agent-index.md`](docs/agent-index.md) — dual-monorepo index (ports, skills, migration status)
- [`docs/agent-tech-guide.md`](docs/agent-tech-guide.md) — lean-ctx, skills, changelog, CI, debug
- [`docs/debug-launch-guide.md`](docs/debug-launch-guide.md) — VS Code `launch.json`, ports, CI validation
- [`docs/multi-agent-worktrees.md`](docs/multi-agent-worktrees.md) — mandatory for feature work
- [`docs/inbox-pipeline/README.md`](docs/inbox-pipeline/README.md) — **Inbox → Knowledge pipeline** (feature taxonomy, mermaid architecture, all scripts + DB + UI + workflows)
- [`CHANGELOG.md`](CHANGELOG.md) — append under `[Unreleased]` per Agent Update Protocol
- [`docs/codebase/STACK.md`](docs/codebase/STACK.md) — dual-monorepo dependency scorecard and ports
- [`.agents/skills/next-forge/SKILL.md`](.agents/skills/next-forge/SKILL.md) — next-forge agent skill
- [`.agents/skills/modme-dev-setup/SKILL.md`](.agents/skills/modme-dev-setup/SKILL.md) — root `.env`, gh-aw secrets, onboarding (ADR-0010)
- [`.agents/skills/modme-generative-ui-migrate/SKILL.md`](.agents/skills/modme-generative-ui-migrate/SKILL.md) — GenerativeUI → next-forge migration playbook
- [`.agents/skills/cicd-automation-workflow-automate/SKILL.md`](.agents/skills/cicd-automation-workflow-automate/SKILL.md) — CI/CD consolidation
- [`next-forge/SETUP.md`](next-forge/SETUP.md) — Bun + Supabase setup walkthrough
- [`docs/beads-workflow.md`](docs/beads-workflow.md) — beads issue tracking (`modme` prefix)
- [`GenerativeUI_monorepo/AGENTS.md`](GenerativeUI_monorepo/AGENTS.md) — legacy Turborepo commands and package layout

## Observability (Agenttrace)

**agenttrace** is used to monitor agent session costs, performance, and anomalies.
**session-logger** is a lighter weight version of agenttrace that is used to monitor agent session costs, performance, and anomalies.

- **Install/Update**: Run `.\scripts\install-agenttrace.ps1`
- **Dashboard**: Run `yarn agenttrace --overview` (or `.\agenttrace` at the root) to view the global overview.
- **Debugging**: If an agent run seems hung or fails repeatedly, agents should run `yarn agenttrace --doctor` or `yarn agenttrace --latest` to check for anomalies like retry loops or slow tools.

## External references

- [awesome-copilot](https://github.com/github/awesome-copilot) — community agents, instructions, skills
- [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)
- [sanjeed5/awesome-cursor-rules-mdc](https://github.com/sanjeed5/awesome-cursor-rules-mdc)

## Antigravity IDE / MCP Troubleshooting

- **Windows `npx` quoting bugs:** When configuring MCP servers using `npx` in `mcp_config.json`, use `"command": "npx.cmd"` instead of `"npx"`.
- **Missing Module Errors:** If `notebooks` or `visualization` MCP servers fail with `Cannot find module`, verify extension version paths in `mcp_config.json`.
- **GitHub Copilot MCP:** The `copilot plugin` command expects exactly 0 extra arguments. Use `"args": ["plugin"]`.
- **Stitch MCP API Key:** Inject API keys securely into `mcp_config.json` from `.env` using a background script to bypass LLM redaction filters.

---

## Inbox Capture Protocol

When making significant design decisions, architectural changes, code reviews, or any research worth keeping, **drop a note in the inbox**:

**Location**: `GenerativeUI_monorepo/docs/inbox/`

**Filename**: `YYYY-MM-DDTHH-MM-SS_{type}_{agent-role}_{summary-slug}.{ext}`

**Minimum frontmatter** (`.md` files):
```yaml
---
timestamp: <ISO 8601>        # e.g. 2026-06-20T13:08:52Z
agent: copilot               # your agent name
agent_role: architect        # frontend|backend|devops|architect|reviewer|researcher
type: architecture           # architecture|design|code-review|solution|research|snippet|link|component
severity: high               # low|medium|high|critical
tags: [supabase, decision]
branch: <current branch>
---
```

For non-`.md` formats (links, PDFs, code snippets, React components), just drop the file — the ingestor handles extraction automatically.

The pipeline runs on every push to `docs/inbox/` and ingests new entries into Supabase.

## Learned User Preferences

- Prefer cloud-first hosted Supabase over local Docker as the default database path; local Supabase is optional offline-only.
- When asked for Supabase credentials, verify from the user's dashboard or `npx supabase status -o env` — do not answer from generic demo defaults alone.
- Use the Cursor Supabase plugin MCP for project creation and management; Rube/supabase-automation requires a separate Composio connection.
- Run `yarn vibe:finish` / session finish only from a worktree under `Monorepo_ModMe-dev/`, not the main checkout.
- Prefer `.\scripts\vibe-session-finish.ps1` directly in worktrees when `yarn` fails due to missing `yarn.lock`.
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not legacy anon-only naming) for next-forge browser/SSR Supabase clients via `@repo/supabase`.
- Do not wire Supabase Auth middleware into `apps/app` by default — ModMe uses Auth.js for sign-in.
- On Windows, prefer `bunx supabase login --token sbp_...` (dashboard access token) over browser login; avoid bare `supabase` on PATH (often v1.x, HTTP 401).
- lean-ctx hybrid integration: global `~/.config/lean-ctx/config.toml` with `tool_profile=power`, `proxy_enabled=true`, `compression_level=max`, `memory_profile=balanced`.
- Run `yarn lean-ctx:ensure` at session start or before smart-git session finish; read-only check: `yarn lean-ctx:ensure:check`; schema reference at `docs/lean-ctx/config-schema.json` (`yarn lean-ctx:schema:sync` to refresh).
- Integrate open feature-branch PRs into `dev` before merging `dev` → `main` (keeps `main` stable until features land).
- Archive/remove stale worktrees after `git log` audit confirms nothing unique vs `dev`; do not merge stale branches by default.

## Learned Workspace Facts

- Hosted Supabase project: `modme-next-forge` (ref `aevemmmmouxqlfyxthzf`, region `us-east-1`); ADR-0002 supersedes ADR-0001 (local Docker).
- Supabase setup: `docs/supabase-setup.md` (local: `yarn supabase:local:setup` then `yarn intake`); cloud checklist: `docs/supabase-cloud-setup.md`
- Root intake scripts need `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; Prisma DB URLs live in `next-forge/packages/database/.env`.
- Worktrees branched from `dev` may lack `yarn.lock`; `worktree-copy-env.ps1` copies `yarn.lock`, `.yarnrc.yml`, and `.yarn/` from main.
- `vibe-session-finish.ps1 -DryRun` skips interactive `Read-Host` and pre-commit; use `yarn vibe:finish:dry-run` or the script with `-DryRun -SkipPull`.
- `yarn intake` from repo root runs `scripts/run-intake.mjs` (ingest only); `yarn intake:orchestrate` runs audit → ingest → embed → MDA with quality gates.
- Inbox data contract v1: `docs/inbox-pipeline/contracts/inbox-contract.v1.json` (ADR-0009). Quality: `yarn inbox:audit`, `yarn inbox:fix`, `yarn inbox:test`. Reports: `docs/inbox-pipeline/reports/latest.md`.
- Schema deploy order: `bun run db:push` (Prisma) before `bunx supabase db push` — SQL migration 001 expects Prisma tables.
- Supabase CLI config lives at `next-forge/supabase/`; use `bunx supabase` from `next-forge/packages/database` with `--workdir ../.. --dns-resolver https` on Windows.
- next-forge default ports: app 3100, web 3101, api 3102, docs 3104, storybook 6106 (avoids GenerativeUI 3000–3004 block).
- lean-ctx active global config: `~/.config/lean-ctx/config.toml` (XDG), not legacy `~/.lean-ctx/config.toml`; repo `.lean-ctx.toml` merges as project overrides; schema snapshot at `docs/lean-ctx/config-schema.json` (reference-only, `yarn lean-ctx:schema:sync`). ADR-0012 documents the ensure workflow.
- gh-aw / secrets (ADR-0010): root `.env` → `yarn setup:env`; `COPILOT_GITHUB_TOKEN` on GitHub via `yarn setup:gh-aw`; token alias order COPILOT_GITHUB_TOKEN → GITHUB_PAT → GITHUB_PERSONAL_ACCESS_TOKEN; `gh aw compile` on native Windows → use WSL or CI.
- Before commit/push during merge or rebase work, run `rg '<<<<<<<'` repo-wide; unresolved conflict markers have appeared in `.vscode/`, `.github/copilot-instructions.md`, and `.github/aw/` files.

<!-- lean-ctx -->
## lean-ctx

Prefer lean-ctx MCP tools over native equivalents for token savings.
Full rules: @LEAN-CTX.md
<!-- /lean-ctx -->
