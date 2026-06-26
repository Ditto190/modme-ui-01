# lspmux setup — shared LSP instances (ModMe)

Share **one rust-analyzer process per workspace path** across Cursor, VS Code, and other LSP clients on the same machine. Uses [lspmux](https://codeberg.org/p2502/lspmux) as a client shim + host daemon.

**Honest scope:** Multiple editors on the **same checkout** share one RA instance. **Different worktrees** get **separate** instances (correct — file trees differ). One daemon serves all instances.

Related: `[docs/multi-agent-worktrees.md](./multi-agent-worktrees.md)` (LSP section), inbox note `GenerativeUI_monorepo/docs/inbox/lspmux_dx-ide.md`.

---

## Quick start (Windows)

### 1. Install

Requires [Rust](https://rustup.rs/) (`cargo` on PATH) and **MSVC linker** (Visual Studio Build Tools → **Desktop development with C++**). Without `link.exe`, `cargo install lspmux` fails on Windows. **PATH :** Git `usr\bin\link.exe` or Miniconda `Library\usr\bin\link.exe` (GNU link) can win over MSVC — use Developer PowerShell or put MSVC before those directories on `PATH`.**shadowing**

```powershell
.\scripts\lspmux\install.ps1
```

If `cargo` is missing, the script still writes `%USERPROFILE%\.config\lspmux\config.toml` from the repo template. Install Rust, then re-run.

### 2. Start daemon

Once per login session (or use Task Scheduler — see below):

```powershell
.\scripts\lspmux\start-daemon.ps1
```

Foreground (debug):

```powershell
.\scripts\lspmux\start-daemon.ps1 -Foreground
```

### 3. Editor settings (already in repo)

`[.vscode/settings.json](../.vscode/settings.json)` and `[.cursor/settings.json](../.cursor/settings.json)` wire rust-analyzer through lspmux:

```json
{
  "rust-analyzer.server.path": "${env:USERPROFILE}\\.cargo\\bin\\lspmux.exe",
  "rust-analyzer.server.extraEnv": {
    "LSPMUX_SERVER": "${env:USERPROFILE}\\.cargo\\bin\\rust-analyzer.exe"
  }
}
```

Reload the window after install. Requires the **rust-analyzer** extension in VS Code / Cursor.

### 4. Verify (two windows, one RA instance)

1. Start daemon: `.\scripts\lspmux\start-daemon.ps1`
2. Open **two** Cursor or VS Code windows on the **same** repo folder
3. Open a Rust file in both
4. Check status:

```powershell
.\scripts\lspmux\status.ps1
# or: lspmux status
```

Expect **one** rust-analyzer instance and **two** clients for the same workspace key.

---

## Configuration

Template: `[scripts/lspmux/config.toml.template](../scripts/lspmux/config.toml.template)`

Installed copy: `%USERPROFILE%\.config\lspmux\config.toml`

Critical defaults:


| Setting              | Value               | Why                                    |
| -------------------- | ------------------- | -------------------------------------- |
| `listen` / `connect` | `127.0.0.1:27631`   | Windows TCP daemon                     |
| `instance_timeout`   | `300`               | Idle instance GC (seconds)             |
| `pass_environment`   | filter terminal IDs | Avoid duplicate instances per terminal |


Worktrees receive `LSPMUX_CONNECT=127.0.0.1:27631` in `.worktree-ports.env` (auto-generated).

---

## WSL / Linux / macOS

Run a **separate** lspmux daemon inside WSL if you edit files there. Do **not** mix Windows and WSL paths through one server — workspace keys and filesystem views differ.

**Linux / macOS (native checkout):**

```bash
cargo install lspmux --locked
mkdir -p ~/.config/lspmux
cp scripts/lspmux/config.toml.template ~/.config/lspmux/config.toml
# Edit connect/listen for Unix socket if preferred (see upstream README)
lspmux server &
lspmux status
```

Editor paths use `$HOME/.cargo/bin/lspmux` instead of `%USERPROFILE%\.cargo\bin\lspmux.exe`.

---

## Worktrees

- **One daemon** on the host (port `27631`)
- **One language-server instance per unique workspace path** (each worktree folder)
- **No cross-worktree sharing** — intentional; sharing would produce wrong diagnostics

`scripts/worktree-copy-env.ps1` merges lspmux rust-analyzer settings into `.vscode/settings.json` if missing. `yarn worktree:doctor` warns when lspmux or the daemon is unavailable.

---

## Pitfalls


| Issue                                       | Cause                                        | Mitigation                                                                                                                            |
| ------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `cargo install` fails: `link.exe not found` | MSVC Build Tools missing                     | Install [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with C++ workload; retry in Developer PowerShell |
| Wrong `link.exe` on PATH                    | Git or Miniconda GNU `link.exe` shadows MSVC | Use Developer PowerShell; put MSVC before Git/Miniconda on `PATH`                                                                     |
| Duplicate RA processes                      | Daemon not running; editor bypasses lspmux   | Start daemon; confirm `rust-analyzer.server.path` points to lspmux                                                                    |
| Stale diagnostics after branch switch       | Same worktree path, changed files            | `lspmux reload <workspace-path>`                                                                                                      |
| Progress / config prompts missing           | lspmux drops server→client requests          | Known upstream limitation; use direct RA for debugging if needed                                                                      |
| Wrong diagnostics across folders            | Expecting one RA for all worktrees           | Expected — one instance **per path** only                                                                                             |


---

## Troubleshooting

### Daemon not reachable

```powershell
.\scripts\lspmux\status.ps1
.\scripts\lspmux\start-daemon.ps1
yarn worktree:doctor   # includes lspmux probe
```

Logs (background start): `%LOCALAPPDATA%\lspmux\logs\daemon-*.log`

Verbose (temporary):

```powershell
$env:RUST_LOG = 'lspmux=debug'
.\scripts\lspmux\start-daemon.ps1 -Foreground
```

### Reload workspace instance

```powershell
lspmux reload "C:\path\to\your\checkout"
```

Use the folder path shown in `lspmux status`.

### Optional PowerShell proxy

If an editor cannot invoke `.exe` shims cleanly:

```powershell
# rust-analyzer.server.path → repo-relative or absolute path to:
.\scripts\lspmux\rust-analyzer-proxy.ps1
```

---

## Phase 4 — TypeScript evaluation (optional)

**Current state:** VS Code and Cursor use the **built-in TypeScript extension** (`tsserver`). It is **not** routed through lspmux without changing the language stack.

**When to consider:** Rust multiplexing is in place but TS/JavaScript RAM remains a bottleneck (many windows, large monorepos).

**Evaluation path:**

1. Install `typescript-language-server` globally or via `npm i -g typescript-language-server typescript`
2. Point a dedicated client at lspmux:
  ```powershell
   # Example extraEnv when using a TS-specific editor setting (varies by extension)
   lspmux client --server-path typescript-language-server
  ```
3. Disable or sideline the built-in TS extension for that workspace (DX change — test on one checkout first)
4. Compare RAM (`Task Manager` / `htop`) with two windows on the same path vs native `tsserver`
5. Accept tradeoffs: formatting, refactorings, and extension integrations may differ from built-in TS

**Recommendation:** Multiplex **Rust first** (Phase 1–3). Revisit TS only if profiling shows `tsserver` as a top memory consumer. CI truth remains `yarn verify:forge` / `yarn verify:generative` — not LSP diagnostics.

---

## Scripts reference


| Script                                   | Purpose                                           |
| ---------------------------------------- | ------------------------------------------------- |
| `scripts/lspmux/install.ps1`             | `cargo install lspmux` + seed config              |
| `scripts/lspmux/start-daemon.ps1`        | Start background daemon                           |
| `scripts/lspmux/status.ps1`              | Daemon + instance status (`-Json` for automation) |
| `scripts/lspmux/rust-analyzer-proxy.ps1` | Optional PS wrapper for editors                   |


---

## Related docs

- `[docs/multi-agent-worktrees.md](./multi-agent-worktrees.md)`
- `[docs/debug-launch-guide.md](./debug-launch-guide.md)`
- `[scripts/worktree-doctor.ps1](../scripts/worktree-doctor.ps1)`

