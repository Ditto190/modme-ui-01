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

- (cursor) Cursor marketplace plugin skills under `.cursor/skills/` — thermos, fix-ci, orchestrate, principle-*, voltagent, and related agent workflows
- (copilot) Expanded root `.github/copilot-instructions.md` for dual-monorepo (next-forge + GenerativeUI) commands and verification workflow
- (cursor) Additional Claude plugin enables in `.cursor/settings.json` (commit-commands, supabase, typescript-lsp, rust-analyzer-lsp, agent-sdk-dev)

### Changed

- (gitignore) Ignore local hook state (`.cursor/hooks/state/`), IDE-local dirs (`.claude/`, `.copilot/`), and install manifests; remove erroneous `.cursor/hooks.json` ignore

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
