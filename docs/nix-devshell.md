# Nix dev shell (optional)

Reproducible toolchain pins for ModMe without replacing per-stack package managers.

| Stack | Package manager | Nix shell provides |
|-------|-----------------|-------------------|
| Root | Yarn 3.3 (Corepack) | `nodejs_22`, Corepack → `yarn@3.3.0` |
| `next-forge/` | Bun | `bun` on PATH |
| `GenerativeUI_monorepo/` | Yarn 3 | use `yarn` after `corepack prepare` |

## Prerequisites

- [Nix](https://nixos.org/download.html) with flakes enabled, or NixOS/WSL2 on Windows
- Optional: [direnv](https://direnv.net/) + `use flake` in `.envrc` (not committed by default)

## Usage

```bash
# From repo root
nix develop

# One-shot command
nix develop -c yarn worktree:doctor
nix develop -c bash -c "cd next-forge && bun install && bun run check"
```

## What this does not do

- Does not replace `bun.lock` / `yarn.lock` — installs still use each stack’s native PM
- Does not unify the dual-monorepo (see `monorepo-boundaries.mdc`)
- Does not install Python agent deps — use `scripts/setup-agent.ps1` separately

## Windows

Native Nix on Windows is limited; prefer **WSL2** or a Linux CI runner for `nix develop`. PowerShell workflows (`yarn dev:forge`) remain the primary Windows path.
