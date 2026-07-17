# Nix dev shell (optional)

Reproducible toolchain pins for ModMe without replacing per-stack package managers.

| Stack                    | Package manager     | Nix shell provides                   |
| ------------------------ | ------------------- | ------------------------------------ |
| Root                     | Yarn 3.3 (Corepack) | `nodejs_22`, Corepack → `yarn@3.3.0` |
| `next-forge/`            | Bun                 | `bun` on PATH                        |
| `GenerativeUI_monorepo/` | Yarn 3              | use `yarn` after `corepack prepare`  |

## Prerequisites

- [Nix](https://nixos.org/download.html) with flakes enabled, or NixOS/WSL2 on Windows
- Optional: [direnv](https://direnv.net/) + `use flake` in `.envrc` (not committed by default)

## Usage

```bash
# From repo root
nix develop

# One-shot commands
nix develop -c yarn worktree:doctor
nix develop -c yarn harness:control-cli
nix develop -c node e2e/worktree-smoke/run.mjs
nix develop -c bash -c "cd next-forge && bun install && bun run check"
```

## Flake layout

Root [`flake.nix`](../flake.nix) defines:

- `devShells.default` — node 22, bun, git, tmux, corepack yarn 3.3
- `packages.worktree-smoke` — wrapper around `e2e/worktree-smoke/run.mjs`

CI job `nix-orchestration-smoke` (`.github/workflows/ci.yml`) runs `nix develop -c node e2e/worktree-smoke/run.mjs` on orchestration path changes.

## Hydra-inspired evaluation (GitHub Actions, not Hydra server)

The [NixOS Hydra](https://github.com/NixOS/hydra) model evaluates jobsets on a schedule. ModMe mirrors that pattern with **path-filtered CI jobs**:

| Hydra concept | ModMe equivalent                                   |
| ------------- | -------------------------------------------------- |
| Project       | `Monorepo_ModMe` root orchestration                |
| Jobset        | `worktree-smoke` + `nix-orchestration-smoke`       |
| Inputs        | `scripts/**`, `flake.nix`, `e2e/worktree-smoke/**` |
| Evaluation    | `node e2e/worktree-smoke/run.mjs`                  |

We do **not** run a Hydra server locally; use `yarn e2e:worktree-smoke` or `nix develop -c` for the same checks.

## What this does not do

- Does not replace `bun.lock` / `yarn.lock` — installs still use each stack's native PM
- Does not unify the dual-monorepo (see `monorepo-boundaries.mdc`)
- Does not install Python agent deps — use `scripts/setup-agent.ps1` separately

## Windows

Native Nix on Windows is limited; prefer **WSL2** or a Linux CI runner for `nix develop`. PowerShell workflows (`yarn dev:forge`, `yarn harness:control-cli`) remain the primary Windows path.
