# Devcontainer setup (ModMe)

Codespaces / Dev Containers use `.devcontainer/devcontainer.json` with next-forge ports and ModMe launch health on start.

## Ports forwarded

| Port | Service |
|------|---------|
| 3100 | next-forge app |
| 3101 | next-forge web |
| 3102 | next-forge api |
| 3104 | Mintlify docs |
| 6106 | Storybook workshop |

## Post-create flow

1. `bash .devcontainer/post-create.sh` — Yarn bootstrap + optional Python agent
2. `yarn workspace:bootstrap:lite` or `yarn workspace:bootstrap:shared` when deps missing
3. `yarn launch:full` — advisory health + KM verify

## Post-start

`postStartCommand`: `yarn launch:health` (advisory, non-blocking).

## Local vs worktree

Main checkout uses default forge ports. Git worktrees load `.worktree-ports.env` via `yarn worktree:ports`.

## Related

- `yarn setup:modme` — full env + gh-aw + forge check
- `.agents/skills/modme-dev-setup/SKILL.md`
- `docs/debug-launch-guide.md`
