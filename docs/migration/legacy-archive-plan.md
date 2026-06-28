# Legacy Archive Plan — root `src/` and `agent/`

> Execute **after** Phase 4 cutover checklist passes. Do not archive while web-dashboard or root CLAUDE.md still drive agent behavior.

## Problem

Triple agent surface confuses agents:

| Surface | Points to | Status |
|---------|-----------|--------|
| `CLAUDE.md` | root `src/` + `agent/` | Misleading primary entry |
| `AGENTS.md` | dual monorepos | **Canonical** (slimmed) |
| Old docs | GenerativeUI-only | Refreshed in `docs/codebase/*` |

Root `agent/` also contains ~1283 tracked files including vendored `genai-toolbox` and large binaries.

## Target state

```
legacy/
  genui-workspace/     # archived root src/ + agent/ snapshot
  README.md            # pointer to next-forge + agent-server
CLAUDE.md              # short pointer → docs/agent-index.md
```

## Steps

1. **Freeze** root `src/` and `agent/` — no new commits except archive move
2. **Copy** to `legacy/genui-workspace/` in a dedicated PR (or external repo `[ASK USER]` for external archive)
3. **Update** `CLAUDE.md` to 20-line pointer doc
4. **Exclude** from agent context:
   - `.cursorignore` entries for `agent/genai-toolbox/`, large GIFs
   - `.lean-ctx.toml` exclude patterns
5. **Remove** root dev scripts that start legacy stack from default `npm run dev` if still present
6. **Verify** `yarn verify:all` + agent onboarding with `/init` only references next-forge

## genai-toolbox options

| Option | Tradeoff |
|--------|----------|
| Git submodule | Versioned, smaller main tree |
| `vendor/` quarantine | Simple, still in repo |
| External package | Cleanest, migration effort |

Default assumed: **vendor quarantine + cursorignore** until explicit submodule task.

## Evidence

- `docs/codebase/CONCERNS.md` — P0 triple-stack drift
- `docs/migration/phase4-cutover.md`
- Scan metrics: `docs/codebase/.codebase-scan.txt`
