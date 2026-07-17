# lean-ctx testing strategy (ModMe)

Test pyramid for orchestration scripts, lean-ctx config, and multi-agent workflows.

## Layers

| Layer | Tool | Location | Command |
|-------|------|----------|---------|
| Unit / contract | Vitest | `scripts/__tests__/lean-ctx*.test.mjs` | `yarn vitest run scripts/__tests__/lean-ctx*.test.mjs` |
| Shell integration | Bats | `scripts/bats/*.bats` | `yarn test:shell` |
| E2E smoke | Node | `e2e/worktree-smoke/`, `e2e/multi-agent-a2a/` | `yarn e2e:worktree-smoke`, `yarn e2e:multi-agent-a2a` |
| Python types | basedpyright | `pyrightconfig.json` | `yarn pyright:check` |
| Full orchestration | Composite | `package.json` | `yarn test:orchestration` |

## Vitest contracts

- **agent-catalog** — seed roles, `validate`, `resolve` intent routing
- **beads-bfs-dispatch** — dry-run plan JSON, layer ordering
- **protocol-contract** — proxy vs A2A vs gateway boundaries, doc presence
- **task-profiles** — example TOML sections, no duplicates

Run individually:

```powershell
yarn vitest run scripts/__tests__/lean-ctx-agent-catalog.test.mjs
yarn vitest run scripts/__tests__/beads-bfs-dispatch.test.mjs
yarn vitest run scripts/__tests__/lean-ctx-protocol-contract.test.mjs
yarn vitest run scripts/__tests__/lean-ctx-task-profiles.test.mjs
```

## Bats (shell)

Requires [bats-core](https://github.com/bats-core/bats-core) on PATH (installed in CI via apt).

```powershell
yarn test:shell
```

Tests cover:

- `load-lean-ctx-env.ps1` — env vars and data dirs
- `ensure-lean-ctx-config.ps1` — CheckOnly preflight
- `worktree-doctor.ps1` — JSON checks output
- Task profile example — required sections
- Session markers path
- `modme-session.manifest.json` verify matrix

On Windows without bats, use WSL or rely on CI `shell-orchestration` job.

## Pyright

`pyrightconfig.json` defines `executionEnvironments` for `GenerativeUI_monorepo/agent`, `agent-server`, and `scripts/` Python utilities.

```powershell
yarn pyright:check
```

Advisory locally if basedpyright is not installed; CI can skip with continue-on-error until pyright is added to devDeps.

## Pre-commit / CI feedback loops

`scripts/pre-commit-checks.mjs` runs lean-ctx vitest contracts when staged paths touch:

- `scripts/bats/`, `scripts/__tests__/lean-ctx`
- `data/lean-ctx-task-profiles.toml.example`
- `pyrightconfig.json`, `scripts/*.py`, `GenerativeUI_monorepo/agent/`

`scripts/modme-session.manifest.json` lists `test:orchestration` for session finish.

### GitHub Actions

| Job | Workflow | Purpose |
|-----|----------|---------|
| `shell-orchestration` | `ci.yml` | bats suite |
| `worktree-smoke` | `ci.yml` | catalog + beads + pre-commit |
| `lean-ctx-config-validate` | `observability-pipeline-check.yml` | vitest + `LEAN_CTX_CRP_MODE=tdd` |

## Hooks (advisory)

Cursor hooks stay opt-in (see `docs/lean-ctx-guide.md` §7). Safe pattern:

- `sessionStart` → `ensure-lean-ctx-config.ps1 -CheckOnly`
- `stop` → append session marker for observability

Do not enable `failClosed` hooks that block agents without explicit opt-in.

## Task profile for test work

```powershell
$env:LEAN_CTX_PROFILE = "test-automation"
. .\scripts\load-lean-ctx-env.ps1
```

Focus paths include `scripts/__tests__/`, `scripts/bats/`, `e2e/`, and this document.
