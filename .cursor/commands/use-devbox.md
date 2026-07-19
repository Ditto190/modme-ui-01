# Use Devbox (optional)

ModMe works in a bare shell. When `devbox.json` exists at the repo root, prefer devbox for consistent tooling (Node 22, Yarn, bats, shellcheck, jq).

## Quick start (Windows)

Devbox runs in **WSL Ubuntu**, not native PowerShell.

```powershell
yarn wsl:ubuntu:setup   # once: systemd + modme-agent profile + devbox
wsl -d Ubuntu           # default user: modme-agent (passwordless sudo)
cd /mnt/c/Users/dylan/Monorepo_ModMe
devbox shell
yarn launch:health
```

## Devbox scripts

| Script                     | Yarn equivalent      |
| -------------------------- | -------------------- |
| `devbox run health`        | `yarn launch:health` |
| `devbox run km-verify`     | `yarn km:verify`     |
| `devbox run session-start` | `yarn session:start` |

## Notes

- Devbox is **optional** — CI and Windows PowerShell paths use yarn directly.
- Do not run `yarn install` inside nested monorepos from devbox unless you know which stack you are targeting (see `monorepo-boundaries` rule).
