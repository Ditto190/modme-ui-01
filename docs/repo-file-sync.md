# Repo File Sync

`Ditto190/modme-ui-01` is the **source of truth** for shared agent tooling, CI/CD,
and configuration. The [`BetaHuhn/repo-file-sync-action`][action] keeps that
material in sync across downstream repositories by opening a pull request in each
target repo whenever a synced file changes here.

- **Workflow:** [`.github/workflows/repo-file-sync.yml`](../.github/workflows/repo-file-sync.yml)
- **Config:** [`.github/sync.yml`](../.github/sync.yml)

## What gets synced

The config is organised into groups, one per requested surface:

| # | Group | Highlights |
|---|-------|------------|
| 1 | CI/CD + testing starter actions | `ci.yml`, `codeql.yml`, `pre-commit-check.yml`, `preflight-ci.yml`, plus the sync workflow itself |
| 2 | Session start/end hooks + logs | `.github/hooks/` (session-logger), `.cursor/hooks/`, `agent-session-start.ps1`, `agent-session-finish.ps1` |
| 3 | Rulesets | `.cursor/rules/`, `.clinerules/`, `.github/instructions/` |
| 4 | Agent skills | `.agents/skills/`, `.github/skills/`, `.cursor/skills/`, `skills-lock.json` |
| 5 | Agent files, tools, collections, methods, implementations | `collections/`, `.github/collections/`, `.copilot/{collections,prompts,instructions,knowledge}/`, `.github/prompts/` |
| 6 | Config + environment management | `.env.example`, `.markdownlint.json`, `.prettierrc.json`, `.pre-commit-config.yaml`, `.devcontainer/` |
| 7 | tmux + multi-agent orchestration | `agent-workspace-tmux.{sh,ps1}`, `generate-mprocs-config.mjs`, `*-orchestrator.mjs` |
| 8 | Worktree configuration | `.cursor/worktrees.json`, `.worktreeinclude`, `*-worktree*.ps1` |
| 9 | Launch steps + end-session | `launch-manifest.json`, `validate-launch-json.mjs`, `launch-json-check.yml` |
| 10 | lean-ctx (every repo) | `.lean-ctx.toml`, `LEAN-CTX.md`, `.cursor/rules/lean-ctx.mdc`, `.agents/skills/lean-ctx/`, `docs/lean-ctx/` |
| 11 | mcp.json (agents + Copilot cloud agents) | `.mcp.json`, `.github/mcp.json`, `.cursor/mcp.json`, `.github/agents/`, `.github/copilot-instructions.md` |

Directory syncs use `deleteOrphaned: true` where downstream repos should mirror
deletions; a few (`.devcontainer/`, `docs/lean-ctx/`) keep it `false` so
downstreams can retain their own extra files.

## Setup

### 1. Add target repositories

Edit [`.github/sync.yml`](../.github/sync.yml) and replace every
`Ditto190/REPLACE-WITH-TARGET-REPO` line with the real downstream repos, one
`owner/name` per line. Append `@branch` to target a non-default branch:

```yaml
group:
  - repos: |
      my-org/downstream-a
      my-org/downstream-b@dev
    files:
      - source: .lean-ctx.toml
        dest: .lean-ctx.toml
```

### 2. Provide a token

The action needs a token that can read this repo and open PRs in the targets —
`GITHUB_TOKEN` will **not** work.

- **Recommended:** create a [Personal Access Token][pat] with full `repo` scope
  (add `workflow` scope to sync files under `.github/workflows/`) and store it as
  the `GH_PAT` repository secret.
- Optionally set repo/org **variables** `SYNC_GIT_EMAIL` and `SYNC_GIT_USERNAME`
  for the sync commit identity.

The workflow **skips automatically** when `GH_PAT` is not set, so forks and fresh
clones never fail.

### 3. Trigger

- **Automatic:** push to `main` or `dev` touching any synced path.
- **Manual:** run *Repo File Sync* from the Actions tab. Enable **dry_run** to
  preview changes (`DRY_RUN=true`) without opening PRs.

## Notes

- PRs are labelled `repo-file-sync` and `automation` for downstream automation
  (e.g. auto-merge).
- The sync workflow syncs itself (group 1), so once a downstream repo merges the
  first PR it inherits the same capability.
- To stop syncing a file, remove its entry from `.github/sync.yml`. Removing a
  file from a `deleteOrphaned: true` directory also deletes it downstream.

[action]: https://github.com/marketplace/actions/repo-file-sync-action
[pat]: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
