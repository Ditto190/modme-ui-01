# Worktree & Monorepo Audit — 2026-07-04

## Federated layout (unchanged, correct)

| Layer | Path | Package manager | Role |
|-------|------|-----------------|------|
| Root orchestrator | `Monorepo_ModMe/` | Yarn 3.3 | Harness, verify scripts, intake |
| Primary product | `next-forge/` | Bun + Turbo 2.8 | Apps, `@repo/*`, Supabase |
| Legacy satellite | `GenerativeUI_monorepo/` | Yarn 3.3 + Turbo 2.8 | agent-server, web-dashboard |

Cross-stack integration: HTTP/WebSocket + `@repo/schemas` golden JSON only. No `workspace:*` across stacks.

## Worktree topology

### Before

```
Monorepo_ModMe/              [dev or feature]  ~37 GB
../Monorepo_ModMe-dev/
  dev/                       [dev]             ~25 GB (duplicate)
  dev-agent-cursor-monorepo-audit/             ~21 GB (removed)
  dev-agent-cursor-thermo-nuclear-baseline/    ~2.4 GB (removed)
```

**~85 GB** total across duplicate checkouts.

### After

```
Monorepo_ModMe/              [review/feature — NOT dev]  ~37 GB
  .worktrees/
    dev/                     [dev]                       persistent checkout
    dev-agent-<owner>-<task>/  (on demand)
```

**Estimated savings:** ~46 GB from removing audit worktrees + duplicate `Monorepo_ModMe-dev` tree.

## Verify matrix (Phase 1 baseline)

| Command | Stack | Scope |
|---------|-------|-------|
| `yarn lint:harness` | Root ECL | `scripts/lint-ecl.mjs`, encoding, stack-paths |
| `yarn pre-commit:check --full` | Root | Staged + path-scoped CI suites |
| `yarn verify:forge` | next-forge | `check` + `test` + `build` via Bun |
| `yarn verify:generative` | GenerativeUI | lint + test + build via Yarn |
| `yarn verify:all` | Both | `scripts/lib/run-verify-all.mjs` |

### 2026-07-04 run (from `.worktrees/dev` @ `9a74a9ef`)

| Check | Result | Notes |
|-------|--------|-------|
| `yarn lint:harness` | **PASS** | Root ECL / stack-paths harness |
| `yarn pre-commit:check --full` | **FAIL** | `CHANGELOG.md` — missing `[Unreleased]` entry for consolidation changes |
| `yarn verify:forge` | **FAIL** | 38 Biome lint errors in next-forge |
| `yarn verify:generative` | **FAIL** | `devops-voltagent` format check |

Re-run after fixes:

```powershell
cd C:\Users\dylan\Monorepo_ModMe\.worktrees\dev
yarn lint:harness
yarn pre-commit:check --full
yarn verify:forge
yarn verify:generative
# or: yarn verify:all
```

## Dependency disk optimization

| Mechanism | Status |
|-----------|--------|
| Turbo 2.8 worktree cache sharing | next-forge on `^2.8.14`; GenerativeUI bumped to `^2.8.14` |
| Yarn `nmMode: hardlinks-global` | Added to `GenerativeUI_monorepo/.yarnrc.yml` |
| Bun global cache | Default (`~/.bun/install/cache`) |
| Turbo remote cache | Not configured — optional follow-up |

### Worktree install policy

1. **`.worktrees/dev`** — full install once (yarn + bun + poetry)
2. **`.worktrees/dev-agent-*`** — lite mode OK for docs-only; run `yarn worktree:doctor` before verify
3. **Main checkout** — never install deps for active development

## Gaps & recommendations

1. **CHANGELOG** — add `[Unreleased]` entry before merge; unblocks `pre-commit:check --full`
2. **next-forge Biome** — triage 38 lint errors (`yarn check:forge` / `bun run check` in next-forge)
3. **GenerativeUI format** — fix `devops-voltagent` formatting in `GenerativeUI_monorepo`
4. **Push `dev`** — local `dev` may be ahead of `github/dev`; push after green `verify:all`
5. **Main checkout policy** — keep main for review/merge only; feature work under `.worktrees/`
6. **Stashes** — consolidation stashes may retain drift; drop after confirming contents
7. **IDE** — open `Monorepo_ModMe/.worktrees/dev` as primary workspace
8. **`.gitignore`** — local artifacts only under `.worktrees/` (`.worktree-ports.env`, `logs/`); worktree dirs remain tracked by Git

## Script & doc changes (Phases 4–7)

- `scripts/lib/worktree-context.ps1` — detect `.worktrees/` inside repo
- `scripts/init-worktrees.ps1` — create `.worktrees/dev`
- `scripts/new-agent-worktree.ps1` — target `.worktrees/dev-agent-*`
- `scripts/ensure-worktree.ps1` — fail on main checkout
- `scripts/worktree-doctor.ps1`, `load-worktree-ports.ps1`, `remove-agent-worktree.ps1` — updated examples
- `scripts/load-lean-ctx-env.ps1`, `ensure-lean-ctx-config.ps1` — `.worktrees/dev` trusted root
- `.lean-ctx.toml` — `extra_roots = [".worktrees/dev"]`
- Docs: `multi-agent-worktrees.md`, `AGENTS.md`, `CONVENTIONS.md`, `repo-alignment.md`
- `.cursor/rules/multi-agent-worktrees.mdc`, `smart-git-automation/SKILL.md`
