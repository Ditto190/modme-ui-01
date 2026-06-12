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

- (ci) Pre-commit checks — `scripts/pre-commit-checks.mjs`, `.githooks/pre-commit`, `scripts/install-git-hooks.ps1`; wired into GitHub Actions (`pre-commit-check.yml`) and Buildkite
- (ci) `scripts/validate-cursor-skills.mjs` for awesome-cursor-skills install integrity (`--project-only` for hooks, full check for setup audits)
- (ci) Buildkite pipeline for `GenerativeUI_monorepo` — `.buildkite/`, `docs/buildkite-guide.md`, `scripts/buildkite-demo.ps1`
- (web-dashboard) Interactive Buildkite explainer at `/dev/buildkite`
- Agent documentation stack: `docs/agent-tech-guide.md`, root `CHANGELOG.md`, and `changelog-check` CI workflow
- Globally installed Cursor skills: `changelog-automation`, `documentation-writer`, `doc-coauthoring`, `agents-md`, `changelog-generator`
- (cursor-ai) Remote Buildkite MCP server in `.cursor/mcp.json` with OAuth setup documented in `docs/agent-tech-guide.md`
- (cursor-ai) Expanded [awesome-cursor-skills](https://github.com/spencerpauly/awesome-cursor-skills) global install set and project pointer at `.cursor/skills/awesome-cursor-skills/`
- (dev) `scripts/install-direnv-hook.ps1`, root `.envrc`, and PowerShell 7 direnv hook for auto-loading `.env`

### Changed

- (docs/ci) Post-restart agent tooling validation: lean-ctx 3.7.5, skills-sh MCP, global skills, changelog-check CI â€” all verified; installed `internal-comms` globally

### Deprecated

- (none)

### Removed

- (none)

### Fixed

- (vscode) Set `git.path` in `.vscode/settings.json` so Cursor Agent Review finds Git on Windows when it is not on PATH
- Add `install-direnv.ps1` helper script to install direnv on Windows to resolve "direnv: command not found" terminal errors.

### Security

- (none)

<!-- Version compare links added on first tagged release, e.g. [1.0.0]: https://github.com/org/repo/compare/v0.9.0...v1.0.0 -->
