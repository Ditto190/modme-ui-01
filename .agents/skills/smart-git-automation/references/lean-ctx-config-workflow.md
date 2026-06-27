# lean-ctx config workflow (ModMe)

Advisory automation for hybrid lean-ctx usage before smart-git session finish. Does **not** block agents or hooks.

## When this applies

- Session start or finish in `Monorepo_ModMe`
- `lean-ctx` missing, invalid, or bypassed (native Read/Grep/Shell)
- Editing `config-schema.json`, `.lean-ctx.toml`, or `docs/lean-ctx/**`

## Config locations

| Path | Role |
|------|------|
| `~/.config/lean-ctx/config.toml` | **Active global config** (XDG) |
| `~/.lean-ctx/config.toml` | Legacy — warn if present; do not treat as primary |
| `<repo>/.lean-ctx.toml` | Project overrides (merged; project wins) |
| `docs/lean-ctx/config-schema.json` | Reference snapshot (`lean-ctx config schema`); not read at runtime |

Override directory: `$env:LEAN_CTX_CONFIG_DIR` if set.

## Commands

```powershell
yarn lean-ctx:ensure              # detect + safe auto-apply
yarn lean-ctx:ensure -- -CheckOnly   # report only (vibe-session-finish default)
yarn lean-ctx:ensure -- -Force       # overwrite customized preset keys (backs up .bak)
yarn lean-ctx:ensure -- -ProjectOnly # .lean-ctx.toml + schema only
yarn lean-ctx:doctor
yarn lean-ctx:schema:sync
```

Script: [`scripts/ensure-lean-ctx-config.ps1`](../../../scripts/ensure-lean-ctx-config.ps1)

## ModMe preset (merge, not clobber)

Global keys set only when **missing** (unless `-Force`):

| Key | Value |
|-----|-------|
| `compression_level` | `max` |
| `memory_profile` | `balanced` |
| `tool_profile` | `power` |
| `proxy_enabled` | `true` |
| `max_ram_percent` | `5` |
| `graph_index_max_files` | `15000` |

Project `.lean-ctx.toml` (created if missing):

```toml
graph_index_max_files = 15000
```

## Detection phases

1. **Binary** — `Get-Command lean-ctx`; exit 1 if missing (cannot auto-install)
2. **Validate** — `lean-ctx config validate`
3. **Doctor** — `lean-ctx doctor` (summary only in ensure script; full via `yarn lean-ctx:doctor`)
4. **Usage** — `.cursor/hooks/state/lean-ctx-session-markers.jsonl` + `lean-ctx discover` heuristics

## Auto-apply (safe)

Only when not `-CheckOnly`:

- Backup `*.bak` before writes
- `lean-ctx config init --full` if global config missing
- `lean-ctx config set <key> <value>` for absent preset keys
- Create `.lean-ctx.toml` if missing
- `lean-ctx config schema > docs/lean-ctx/config-schema.json`
- `lean-ctx restart` after changes

Never overwrite user values without `-Force`.

## Adoption nudge (once per session)

When configured but MCP tools unused:

1. `ctx_session` → `load` + `ctx_knowledge` → `wakeup`
2. Replace Read → `ctx_read`, Grep → `ctx_search`, Shell → `lean-ctx -c` / `ctx_shell`
3. `lean-ctx gain` at session end

Session flag: `.cursor/hooks/state/lean-ctx-adopted-{session}.json` (avoids re-nag).

## Integration points

| Surface | Behavior |
|---------|----------|
| smart-git Step 0 | `yarn lean-ctx:ensure` before git grouping |
| `vibe-session-finish.ps1` | `-CheckOnly` pre-flight; `-ApplyLeanCtx` to auto-apply |
| `.cursor/hooks.json.example` | Optional `sessionStart` advisory hook (failClosed false, 5s) |

## Related

- [docs/lean-ctx-guide.md](../../../../docs/lean-ctx-guide.md)
- [`.cursor/rules/lean-ctx-config.mdc`](../../../../.cursor/rules/lean-ctx-config.mdc)
- [`.cursor/rules/lean-ctx.mdc`](../../../../.cursor/rules/lean-ctx.mdc) (always-on hybrid mapping)
