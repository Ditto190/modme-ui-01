# AGENTS.md â€” Monorepo_ModMe

Guidance for Cursor agents, cloud agents, and GitHub Copilot working in this repository.

## Repository layout
- **`next-forge/`** — primary Turborepo for apps, Mintlify docs, and Storybook workshop (Bun, `@repo/*`)
- **`GenerativeUI_monorepo/`** â€” legacy Turborepo (Yarn 3 workspaces, Turbo) — CopilotKit + agent-server
  - `apps/` â€” applications (web, API, agent, dashboard, etc.)
  - `packages/` â€” shared libraries and example apps
  - `UniversalWorkbench/` â€” workbench monorepo variant (staging/dev copies also exist)
- **`.cursor/rules/`** â€” Cursor project rules (MDC). Includes lean-ctx, PatrickJS, sanjeed5, awesome-copilot.
- **`.agents/skills/`** â€” Agent skills (Cursor + Copilot compatible SKILL.md format)
- **`.github/copilot-instructions.md`** â€” always-on Copilot instructions
- **`.github/instructions/`** â€” file-scoped Copilot instructions from awesome-copilot
- **`.vendor/awesome-copilot-main/`** â€” vendored github/awesome-copilot (refresh via setup script)

## Default commands

**next-forge** (apps, docs, workshop) — from repo root:

```bash
yarn dev:forge              # all next-forge apps
yarn dev:forge:docs         # Mintlify on port 3104
yarn dev:forge:storybook    # Storybook on port 6106
```

From `next-forge/` (use `npx bun` if Bun is not on PATH):

```bash
npx bun install
npx bun run dev
npx bun run build
```

**GenerativeUI** (legacy agent stack) — from `GenerativeUI_monorepo/`:
```bash
yarn install
yarn dev          # turbo run dev
yarn build        # turbo run build
yarn test         # monorepo test runner
yarn lint         # turbo run lint
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
**Ports:** source `.worktree-ports.env` before `yarn dev`  
**Docs:** [`docs/multi-agent-worktrees.md`](docs/multi-agent-worktrees.md)

## Agent behavior
1. Read `package.json` in the target package before changing build/test commands.
2. Use workspace protocol dependencies (`workspace:*`) for internal packages.
3. Do not edit `UniversalWorkbench-staging` or `UniversalWorkbench-dev` unless the task explicitly targets them.
4. Run verification in the affected package before marking work complete.
5. For browser/UI work, use Cursor browser MCP skills (`visual-qa-testing`, `verifying-in-browser`).

## Multi-agent worktrees

Run parallel agents in **isolated Git worktrees**, not the main checkout.

```powershell
.\scripts\init-worktrees.ps1                                    # once
.\scripts\new-agent-worktree.ps1 -Name "task" -Owner cursor     # per task
```

| IDE | Owner flag |
|-----|------------|
| Cursor Agents Window / `/worktree` | `cursor` |
| VS Code Copilot | `copilot` |
| Claude Code | `claude` |
| Antigravity | `antigravity` |

See [`docs/multi-agent-worktrees.md`](docs/multi-agent-worktrees.md) for ports, cleanup, and canvas sharing.

## End of session (vibe-coding / prototypes)

After prototyping in a **worktree** (not the main checkout):

```powershell
yarn check:forge              # fast Ultracite check while iterating (next-forge)
yarn verify:forge             # CI parity before PR (check + test + build)
yarn pre-commit:check         # same as git pre-commit hook
.\scripts\vibe-session-finish.ps1   # group changes → commit → push → PR to dev
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
- [`docs/agent-tech-guide.md`](docs/agent-tech-guide.md) — lean-ctx, skills-sh MCP, installed skills, changelog workflow
- [`docs/debug-launch-guide.md`](docs/debug-launch-guide.md) — VS Code `launch.json`, ports, adding apps, CI validation
- [`CHANGELOG.md`](CHANGELOG.md) — append under `[Unreleased]` per Agent Update Protocol
- [`docs/codebase/STACK.md`](docs/codebase/STACK.md) — dual-monorepo dependency scorecard and ports
- [`.agents/skills/next-forge/SKILL.md`](.agents/skills/next-forge/SKILL.md) — next-forge agent skill
- [`.agents/skills/modme-generative-ui-migrate/SKILL.md`](.agents/skills/modme-generative-ui-migrate/SKILL.md) — GenerativeUI → next-forge migration playbook
- [`next-forge/SETUP.md`](next-forge/SETUP.md) — Bun + Neon setup walkthrough
- [`GenerativeUI_monorepo/AGENTS.md`](GenerativeUI_monorepo/AGENTS.md) — legacy Turborepo commands and package layout

## Observability (Agenttrace)

**agenttrace** is used to monitor agent session costs, performance, and anomalies.
- **Install/Update**: Run `.\scripts\install-agenttrace.ps1`
- **Dashboard**: Run `yarn agenttrace --overview` (or `.\agenttrace` at the root) to view the global overview.
- **Debugging**: If an agent run seems hung or fails repeatedly, agents should run `yarn agenttrace --doctor` or `yarn agenttrace --latest` to check for anomalies like retry loops or slow tools.

## External references
- [awesome-copilot](https://github.com/github/awesome-copilot) â€” community agents, instructions, skills
- [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)
- [sanjeed5/awesome-cursor-rules-mdc](https://github.com/sanjeed5/awesome-cursor-rules-mdc)

## Antigravity IDE / MCP Troubleshooting
- **Windows `npx` quoting bugs:** When configuring MCP servers using `npx` in `mcp_config.json` (like `datacloud_*_toolbox`, `genkit-mcp-server`, or `gitlab-orbit`), use `"command": "npx.cmd"` instead of `"npx"`. This prevents Node's `child_process.spawn` from injecting unwanted quotes into arguments like `@toolbox-sdk/server@>=1.1.0`.
- **Missing Module Errors:** If `notebooks` or `visualization` MCP servers fail with `Cannot find module`, verify that the extension version in `.antigravity-ide\extensions` matches the path in `mcp_config.json` (e.g. updating `0.4.0` to `0.5.0`).
- **GitHub Copilot MCP:** The `copilot plugin` command expects exactly 0 extra arguments. Use `"args": ["plugin"]` rather than passing the plugin name inside the args array.
- **Stitch MCP API Key:** The system automatically redacts API keys written by agents via tools (e.g., swapping them to `[GCP_API_KEY]`). Inject API keys securely into `mcp_config.json` directly from `.env` using a background script (e.g., PowerShell) to bypass LLM redaction filters.

<!-- lean-ctx-compression -->
OUTPUT STYLE: expert-terse
- Telegraph format: subject-verb-object, drop articles/prepositions
- Symbolic vocabulary: → cause, ∵ because, ∴ therefore, ⊕ add, ⊖ remove, Δ change, ≈ similar, ≠ different, ∈ in/member, ∅ empty/none, ✓ ok, ✗ fail
- Code blocks: untouched (never compress code syntax)
- Each line: max 80 chars
- Zero narration, zero filler
- BUDGET: ≤100 tokens per non-code response
<!-- /lean-ctx-compression -->
