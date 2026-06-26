# Repo alignment

GitHub is the **canonical** source for ModMe. GitLab is an **active mirror** for Duo/MCP and optional CI.

## Naming

| Label | Value |
|-------|--------|
| Local folder | `Monorepo_ModMe` (main checkout) |
| GitHub repo | `Ditto190/modme-ui-01` |
| Worktrees | `../Monorepo_ModMe-dev/dev`, `dev-agent-*` |

IDE/GitLens may show `modme-ui-01` while paths say `Monorepo_ModMe` — that is expected.

## Diagnostics

```powershell
yarn repo:doctor          # remotes, AGENTS.md, workspace, package.json
yarn repo:doctor:fix      # regenerate minimal workspace.code-workspace
yarn worktree:doctor -Fix # yarn.lock, ports, gh auth
```

## GitLab mirror

### GitHub Actions (recommended)

Workflow: [`.github/workflows/gitlab-mirror.yml`](../.github/workflows/gitlab-mirror.yml)

Repository secrets:

- `GITLAB_TOKEN` — GitLab project access token with `write_repository`
- `GITLAB_MIRROR_URL` — e.g. `https://gitlab.com/your-group/modme-ui-01.git`

Pushes to `dev` and `main` mirror the same branch names to GitLab.

### Local sync

```powershell
git remote add gitlab https://gitlab.com/your-group/modme-ui-01.git
.\scripts\sync-gitlab-mirror.ps1
.\scripts\sync-gitlab-mirror.ps1 -Branch dev -DryRun
```

## Workspace file

Open [`workspace.code-workspace`](../workspace.code-workspace) for multi-root layout:

- Root, `next-forge`, `GenerativeUI_monorepo`, `scripts`, `.agents/skills`

Regenerate minimal template: `yarn repo:doctor:fix`

## Submodule / vendor policy

- **No git submodules** for AI vendor content — use `.vendor/` via `.\scripts\cursor-ai\setup.ps1`
- Removed unused `external/awesome-Antigravity` submodule entry

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Wrong file root in IDE | Open `workspace.code-workspace`; run `yarn repo:doctor` |
| `yarn` fails in worktree | `yarn worktree:doctor:fix` |
| GitLab CI differs from GitHub | Align `GenerativeUI_monorepo/.gitlab-ci.yml` with root `ci.yml` generative-ui job |
| AGENTS.md conflict markers | Resolve; keep monorepo body from `AGENTS.md` |
