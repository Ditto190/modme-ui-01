# lspmux setup — shared LSP instances (ModMe)

Share **one rust-analyzer process per workspace path** across Cursor and VS Code via [lspmux](https://codeberg.org/p2502/lspmux).

For **multi-server merging** (ty + ruff, etc.) see [`docs/rassumfrassum-setup.md`](./rassumfrassum-setup.md).

---

## Quick start

**Prerequisites:** Rust ([rustup](https://rustup.rs/)) + **VS Build Tools → Desktop development with C++**. Use **Developer PowerShell** so MSVC `link.exe` is on PATH (not Git/Miniconda GNU `link`).

```powershell
yarn lspmux:install   # cargo install + seed config
yarn lspmux:start     # background daemon
yarn lspmux:status    # should exit 0 when daemon reachable
```

`cargo install lspmux` already succeeded if `%USERPROFILE%\.cargo\bin\lspmux.exe` exists.

### Windows config path

lspmux reads:

`%APPDATA%\lspmux\config\config.toml`

(not `%USERPROFILE%\.config\lspmux\`). `yarn lspmux:install` seeds/migrates this path.

---

## Verify (two windows, one RA instance)

1. `yarn lspmux:start`
2. Open **two** Cursor/VS Code windows on the **same** repo folder
3. Open a Rust file in both
4. `yarn lspmux:status` — one rust-analyzer instance, two clients

Editor wiring in [`.vscode/settings.json`](../.vscode/settings.json):

```json
"rust-analyzer.server.path": "${env:USERPROFILE}\\.cargo\\bin\\lspmux.exe",
"rust-analyzer.server.extraEnv": {
  "LSPMUX_SERVER": "${env:USERPROFILE}\\.cargo\\bin\\rust-analyzer.exe"
}
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `link.exe not found` on `cargo install` | VS Build Tools C++ workload; Developer PowerShell |
| Wrong `link.exe` (GNU) | Put MSVC before Git/Miniconda on PATH |
| `yarn lspmux:install` not found | Pull branch with scripts or run `.\scripts\lspmux\install.ps1` |
| Daemon refused connection | `yarn lspmux:start` |
| Config ignored | Ensure file at `%APPDATA%\lspmux\config\config.toml` |
| Stale diagnostics | `lspmux reload <workspace-path>` |

---

## Related

- [`docs/multi-agent-worktrees.md`](./multi-agent-worktrees.md)
- [`docs/rassumfrassum-setup.md`](./rassumfrassum-setup.md)
