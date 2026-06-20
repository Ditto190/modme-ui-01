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

- (docs) [`docs/agent-index.md`](docs/agent-index.md) — dual-monorepo agent onboarding index (ports, skills, migration status, drift register)
- (cursor) Expanded `/init` command — beads fallback, next-forge debug targets, worktree/migration/CI doc map, Phase 4 starter issues
- (debug) next-forge launch.json configs (app, web, api, docs, storybook) + compound `Full Stack: Forge Core + Agent Server`
- (next-forge) `@repo/schemas` package — Zod types ported from GenerativeUI shared-schemas
- (next-forge) Generative UI client island at `apps/app/(authenticated)/generative-ui/` with WebSocket hook
- (ci) `yarn verify:generative` and `scripts/verify-generative-ci.ps1` for GenerativeUI CI parity
- (ci) agent-server pytest job in `ci.yml` (path-filtered)
- (docs) [`docs/beads-workflow.md`](docs/beads-workflow.md) — beads starter issues and `modme` prefix init guide
- (cursor) Cursor marketplace plugin skills under `.cursor/skills/` — thermos, fix-ci, orchestrate, principle-*, voltagent, and related agent workflows
- (copilot) Expanded root `.github/copilot-instructions.md` for dual-monorepo commands and verification workflow
- (cursor) Additional Claude plugin enables in `.cursor/settings.json`

### Changed

- (agents) `AGENTS.md` — link agent-index, dedupe worktrees, clarify next-forge as primary stack, add verify:generative
- (agents) `.cursor/rules/monorepo-modme.mdc` — legacy stack wording; pointer to next-forge for new features
- (ci) Remove duplicate changelog job from `ci.yml`; secret-guard runs on all pushes/PRs (no doc-only skip)
- (ci) `pre-commit-checks.mjs --ci` policy-only; stack builds stay in `ci.yml`
- (ci) agenttrace-ci triggers on `dev` branch in addition to `main`
- (ci) next-forge CI job in `.github/workflows/ci.yml` — path-filtered check, test, build on Bun
- (ci) Root scripts `yarn check:forge`, `fix:forge`, `verify:forge`, `pre-commit:check`, `hooks:install`
- (agents) ModMe overlay `smart-git-automation` skill and `vibe-session-finish.ps1` for worktree session end
- (next-forge) Auth.js credentials + Supabase local Postgres (replaces Clerk/Neon for local dev)
- (gitignore) Ignore local hook state, IDE-local dirs, and install manifests

### Fixed

- (dev) Worktree scripts — `$LASTEXITCODE` for git branch detection; `DIRENV_DISABLE` during setup
- (vscode) `git.path` in settings for Cursor Agent Review on Windows
- (agent-server) WebSocket cancel uses asyncio.create_task + lock

### Removed

- (cursor) Problematic hooks removed — `audit-log.sh`, `block-models-by-repo-origin.sh`, `sensitive-prompt-guard.sh`
- (cursor) Hook patching logic from `install-cursor-cookbook.ps1`

### Deprecated

- (GenerativeUI) `web-dashboard` — migrate to `next-forge/apps/app/(authenticated)/generative-ui/` per migration skill Phase 4

### Security

- (none)

<!-- Version compare links added on first tagged release -->
