# Changelog

All notable changes to **Monorepo_ModMe** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Agent Update Protocol

External agents (CI, cloud agents, GitHub Copilot coding agent, scheduled automation) **MUST** follow this protocol when appending entries. Cursor session agents should follow the same rules.

### When to update

Update `CHANGELOG.md` when a change is **user-visible**, **agent-relevant**, or **operationally significant**:

- New or removed apps, packages, skills, MCP servers, or workflows
- Breaking changes to setup, env vars (names only â€” never values), or agent paths
- Security fixes, dependency upgrades with behavior impact
- Documentation that changes how agents should work in this repo

Skip changelog updates for typo-only edits, vendored mirror refreshes with no local behavior change, or pure refactors with no external effect.

### How to append (Unreleased)

1. Edit only the **`[Unreleased]`** section at the top (below this protocol block).
2. Add one bullet per logical change under the correct heading: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
3. Use imperative, past-tense friendly phrasing: `Add skills-sh MCP to Cursor config`.
4. Include scope in parentheses when helpful: `(docs)`, `(ci)`, `(GenerativeUI_monorepo/web)`.
5. Reference issues/PRs inline: `(#123)` or `(PR #456)`.
6. **Never** paste secrets, API keys, or `.env` contents.
7. On release, move `[Unreleased]` bullets into a new `## [X.Y.Z] - YYYY-MM-DD` section and clear `[Unreleased]`.

### Machine-friendly entry template

```markdown
### Added
- (scope) Short description (#PR)

### Changed
- (scope) Short description

### Fixed
- (scope) Short description (#issue)
```

### Validation

CI runs `node scripts/validate-changelog.mjs` on pull requests. See `docs/agent-tech-guide.md` for the full documentation and changelog workflow.

### Related skills

- `changelog-automation` â€” Keep a Changelog + Conventional Commits patterns
- `changelog-generator` â€” Turn git history into user-facing notes
- `documentation-writer` â€” Technical docs for humans and agents

---

## [Unreleased]

### Added

- (repo) Thermo-nuclear review workflow — skill, runbook, `modme-migration-review` collection, bounded-parallel synthesis report
- (repo) Molecule index orchestrator (`yarn molecule-index`, `yarn molecule-index:verify`), manifest contract tests, optional CI `molecule-contract` job
- (repo) PORTING_GUIDE ECL structured changes (component registry, schema crawler, toolset, knowledge, genai-toolbox slices)
- (next-forge) ADR-0012 bounded parallel agent lifecycle (Gas City pattern); `@repo/schemas` molecule-index branded types
- (repo) Dual-monorepo audit merge — ECL harness, C4 docs, stack-paths.json, schema contract tests, migration phase-4 docs
- (GenerativeUI) Hexagonal ports/adapters refactor for agent-server WebSocket and DI wiring
- (next-forge) Vitest reconnect delay helpers and WebSocket resilience tests for generative UI hook
- (repo) `yarn verify:generative` CI parity script and GenerativeUI pre-commit/CI suite
- (repo) Pre-push hook (repo alignment + `--full` verify gate)
- (repo) Agent terminal orchestration layer — mprocs TUI (`yarn agent:tui`), session envelopes (`agent-session-start/finish`), task registry, extended git hooks, `yarn e2e:worktree-smoke`
- (repo) Cursor commands `/beads` and `/architecture-decision-records`; session handover at `docs/handover/latest.md`
- (next-forge) ADR-0011 terminal orchestration without Nx; ADR-0010 dual-store knowledge intake
- (repo) Unified intake/scrape pipeline — `packages/intake-contracts`, scrape-pipeline, GreptimeDB code index workers, Supabase staging migrations 007–008
- (repo) Inbox pipeline v1 — contracts (`docs/inbox-pipeline/contracts/`), audit/fix scripts, Supabase migrations, and `@repo/schemas` inbox types
- (repo) GitHub Agentic Workflows assets (`.github/aw/`, agent definitions, workflow-health and inbox-pipeline-check CI)
- (repo) GenerativeUI devops-voltagent app, intake-pipeline Python orchestrator, and Playwright test scaffolding
- (repo) Evaluation pipeline docs (`docs/evaluation/`), agent eval collect/report scripts, and catalog e2e tests in next-forge
- (repo) Root inbox tooling — `yarn inbox:audit`, `inbox:fix`, `inbox:test`, `intake:orchestrate`, and beads starter scripts
- (cursor) Cursor marketplace plugin skills under `.cursor/skills/` — thermos, fix-ci, orchestrate, principle-*, voltagent, and related agent workflows
- (copilot) Expanded root `.github/copilot-instructions.md` for dual-monorepo (next-forge + GenerativeUI) commands and verification workflow
- (cursor) Additional Claude plugin enables in `.cursor/settings.json` (commit-commands, supabase, typescript-lsp, rust-analyzer-lsp, agent-sdk-dev)
- (repo) Dual monorepo audit — ECL harness (`harness/`, `yarn lint:harness`), `stack-paths.json`, C4 product docs, refreshed `docs/codebase/*`, schema contract tests, migration phase4 notes
- (repo) Thermo-nuclear workflow — `thermo-nuclear-monorepo-review` skill, `modme-migration-review` collection, molecule-index orchestrator, ADR-0012 bounded-parallel lifecycle
- (repo) `yarn molecule-index:verify` + `molecule-contract` CI job; PORTING_GUIDE ECL slices in `docs/migration/porting-guide-slices.md`

### Changed

- (repo) Resolved `AGENTS.md` and `package.json` merge conflicts; dual-monorepo `workspace.code-workspace` layout
- (ci) GitLab CI aligned with GitHub generative-ui job; pre-commit workflow installs Bun
- (GenerativeUI) Agent-server WebSocket timestamps aligned to Unix milliseconds to match `@repo/schemas` golden contract
- (docs) `ARCHITECTURE.md` documents hexagonal ports/adapters layout for agent-server
- (repo) Pre-push generative lint is advisory on push (full `yarn verify:generative` before PR merge)
- (docs) `yarn agent:mprocs:generate` canonical name (replaces stale `mprocs:generate` references in orchestration docs)
- (docs) Slim root `AGENTS.md` (80–120 line map); canonical agent index at `docs/agent-index.md`
- (repo) **Reconcile `main` with Monorepo_ModMe** — GenUI Workbench (`modme-ui-01` legacy layout) superseded by dual-monorepo stack (`next-forge/` + `GenerativeUI_monorepo/`); unrelated GenUI history retired on default branch
- (gitignore) Ignore Playwright artifacts, beads embedded Dolt state, local hook state (`.cursor/hooks/state/`), IDE-local dirs (`.claude/`, `.copilot/`), and install manifests; remove erroneous `.cursor/hooks.json` ignore

- (ci) next-forge CI job in `.github/workflows/ci.yml` — path-filtered `check`, `test`, `build` on Bun; `dev` branch added to workflow triggers
- (ci) Root scripts `yarn check:forge`, `fix:forge`, `verify:forge`, `pre-commit:check`, `hooks:install`; `scripts/verify-forge-ci.ps1`
- (ci) Pre-commit runs `ultracite check` when staged paths include `next-forge/`; changelog monitoring extended to next-forge apps/packages
- (agents) ModMe overlay `.agents/skills/smart-git-automation/SKILL.md` and `scripts/vibe-session-finish.ps1` for worktree session end (commit/PR to `dev`)
- (cursor) Cursor hook configuration simplified to prevent failClosed blocking issues
- (next-forge) Root scripts `yarn dev:forge:core`, `dev:forge:workshop`, `dev:forge:supabase`
- (cursor-cookbook) `dag-task-runner` skill at `.cursor/skills/dag-task-runner/` with Cursor SDK runner scripts
- (cursor-cookbook) SDK examples vendored at `.vendor/cursor-cookbook/sdk/` (quickstart, app-builder, agent-kanban, coding-agent-cli, dag-task-runner)
- (cursor-cookbook) `scripts/install-cursor-cookbook.ps1` to refresh hooks, skill, and SDK from upstream

### Removed

- (cursor) Problematic hooks removed from project — `audit-log.sh`, `block-models-by-repo-origin.sh`, `sensitive-prompt-guard.sh` were causing `ERROR_HOOKS_BLOCKED` in Cursor due to `failClosed: true` configuration and missing dependencies
- (cursor) Hook patching logic from `install-cursor-cookbook.ps1` — hooks no longer available upstream
- (cursor-ai) `agent-workbench-orchestration` skill — multi-agent workflow for agent panel work (schemas → hook → UI → WebSocket → verify) with goal contract template
- (contextarch) [contextarch-cli](https://github.com/ksoventures/contextarch-cli) — install/bootstrap scripts, `yarn contextarch` / `yarn contextarch:bootstrap`; generated `next-forge` AI context files (AGENTS.md, CLAUDE.md, `.cursorrules`, `.github/copilot-instructions.md`)
- (shared-schemas) WebSocket stream event payloads: `token`, `tool_start`, `tool_result`, `done`, plus `OptimisticMessage` schema
- (web-dashboard) `AgentPanelSkeleton`, `StreamingText`, optimistic send/cancel/retry in `useAgentState`, glass agent panel in `GenerativeCanvas`
- (agent-server) Token/tool streaming over `/ws/agent` with cancel support

- (ci) Pre-commit checks — `scripts/pre-commit-checks.mjs`, `.githooks/pre-commit`, `scripts/install-git-hooks.ps1`; wired into GitHub Actions (`pre-commit-check.yml`) and Buildkite
- (ci) `scripts/validate-cursor-skills.mjs` for awesome-cursor-skills install integrity (`--project-only` for hooks, full check for setup audits)
- (ci) Buildkite pipeline for `GenerativeUI_monorepo` — `.buildkite/`, `docs/buildkite-guide.md`, `scripts/buildkite-demo.ps1`
- (web-dashboard) Interactive Buildkite explainer at `/dev/buildkite`
- Agent documentation stack: `docs/agent-tech-guide.md`, root `CHANGELOG.md`, and `changelog-check` CI workflow
- Globally installed Cursor skills: `changelog-automation`, `documentation-writer`, `doc-coauthoring`, `agents-md`, `changelog-generator`
- (cursor-ai) Remote Buildkite MCP server in `.cursor/mcp.json` with OAuth setup documented in `docs/agent-tech-guide.md`
- (mcp) Mantine MCP server (`@mantine/mcp-server`) in `.cursor/mcp.json`, `.vscode/mcp.json`, `.github/mcp.json`, `GenerativeUI_monorepo/mcp.json`, and `.gitlab/duo/mcp.json`
- (cursor-ai) Expanded [awesome-cursor-skills](https://github.com/spencerpauly/awesome-cursor-skills) global install set and project pointer at `.cursor/skills/awesome-cursor-skills/`
- (dev) `scripts/install-direnv-hook.ps1`, root `.envrc`, and PowerShell 7 direnv hook for auto-loading `.env`
- (agents) Multi-agent Git worktrees — `.cursor/worktrees.json`, `scripts/init-worktrees.ps1`, `scripts/new-agent-worktree.ps1`, per-worktree port allocation, `docs/multi-agent-worktrees.md`
- (dev) `scripts/install-pwsh-terminal-hooks.ps1` — safe Cursor/VS Code shell integration + direnv hook; fixes pwsh startup errors

### Fixed

- (GenerativeUI) CI parity: Turbo 2 `tasks`, `yarn build:product`, postcss isolation from root Tailwind 4, CopilotKit App Router endpoint, devops-voltagent and shared-schemas lint fixes

- (ci) `ci.yml` Bun version file path (`next-forge/package.json` instead of missing `pkg.json`)
- (api) Catalogue route query param validation; public reads restricted to `published` status
- (dev) `init-worktrees.ps1` — use `$LASTEXITCODE` for git branch detection; disable direnv during setup (no spurious `direnv: error` / `branch already exists`)
- (dev) `new-agent-worktree.ps1` — usage help when `-Name` omitted; `DIRENV_DISABLE` during creation; default `-Owner cursor`
- (vscode) Set `git.path` in `.vscode/settings.json` so Cursor Agent Review finds Git on Windows when it is not on PATH
- Add `install-direnv.ps1` helper script to install direnv on Windows to resolve "direnv: command not found" terminal errors.
- (agent-server) WebSocket message handling uses `asyncio.create_task` + lock so cancel does not block the receive loop

### Changed

- (ci) Worktree bootstrap (`setup-worktree-windows.ps1`, `setup-worktree-unix.sh`, `new-agent-worktree.ps1`) auto-installs git pre-commit hooks
- (next-forge) Replace Clerk with Auth.js credentials in `@repo/auth`; replace Neon adapter with Supabase local Postgres + Prisma
- (docs/ci) Post-restart agent tooling validation: lean-ctx 3.7.5, skills-sh MCP, global skills, changelog-check CI â€” all verified; installed `internal-comms` globally

### Deprecated

- (none)

### Removed

- (cursor) Removed focus-stealing stop hooks (`update-skills-on-stop`, ralph `stop-hook`, continual-learning stop, `capture-response`); disabled `continual-learning` and `ralph-loop` plugins

### Security

- (none)

<!-- Version compare links added on first tagged release, e.g. [1.0.0]: https://github.com/org/repo/compare/v0.9.0...v1.0.0 -->
