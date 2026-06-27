# rassumfrassum setup (feature-merging LSP)

[rassumfrassum](https://github.com/joaotavora/rassumfrassum) multiplexes **multiple language servers into one** LSP stream (1 client → N servers). This is the **opposite** of [lspmux](https://codeberg.org/p2502/lspmux), which shares **one server across many clients** (N clients → 1 server).

| Tool | Direction | Use case |
|------|-----------|----------|
| **lspmux** | N clients → 1 server | Cursor + VS Code share one `rust-analyzer` |
| **rassumfrassum (`rass`)** | 1 client → N servers | Python: `ty` + `ruff`; TS: `typescript-language-server` + `eslint` |

See [`docs/lspmux-setup.md`](./lspmux-setup.md) for instance sharing.

---

## Install

Requires Python **3.10+**.

```powershell
yarn rass:install
yarn rass:validate
```

Manual:

```powershell
python -m pip install --upgrade rassumfrassum ty ruff
rass --help
```

---

## Validate

```powershell
yarn rass:validate
```

Expect:

- `rass` on PATH
- `rass --help` succeeds
- `pip show rassumfrassum` reports a version
- `ty` and `ruff` on PATH (warn if missing — needed for `rass python`)

---

## Usage examples

### Python preset (ty + ruff)

```powershell
rass python
# equivalent to: rass -- ty server -- ruff server
```

### Custom server list

```powershell
rass -- ty server -- ruff server
```

### Emacs (Eglot)

`C-u M-x eglot RET rass python RET`

### Neovim

```lua
vim.lsp.config('rass-python', {
  cmd = { 'rass', 'python' },
  filetypes = { 'python' },
  root_markers = { '.git' },
})
vim.lsp.enable('rass-python')
```

---

## Cursor / VS Code

Built-in TS/Python extensions do **not** use `rass` by default. To use rass in VS Code you need an LSP client extension that accepts a custom server command (e.g. point server path at `rass` with args `python`). This is an advanced setup — validate install first with `yarn rass:validate`, then configure per-language extensions separately.

For **ModMe** monorepo defaults:

- **Rust:** use **lspmux** (see lspmux-setup.md)
- **Python multi-server:** evaluate `rass python` via a custom LSP client if you need ty+ruff in one stream
- **TypeScript:** built-in `tsserver` OR future `rass tslint` preset (larger DX change)

---

## Bundled presets

| Preset | Servers |
|--------|---------|
| `python` | ty + ruff |
| `basedruff` | basedpyright + ruff |
| `tslint` | typescript-language-server + eslint |
| `tsbiome` | typescript-language-server + biome |

List presets: explore `pip show -f rassumfrassum` or upstream repo `src/rassumfrassum/presets/`.

---

## Related

- Upstream: https://github.com/joaotavora/rassumfrassum
- Eglot multi-server: https://elpa.gnu.org/devel/doc/eglot.html#Using-Rassumfrassum
- Inbox research: `GenerativeUI_monorepo/docs/inbox/lspmux_dx-ide.md`
