# Conventions

## Core Sections (Required)

### 1) Format and Linting

| Stack | Linter / formatter | Config | Evidence |
|-------|-------------------|--------|----------|
| next-forge | Biome via Ultracite | `next-forge/biome.jsonc` | `yarn check:forge` → `bun run check` |
| GenerativeUI | ESLint + Prettier | `GenerativeUI_monorepo/.eslintrc.cjs`, `.prettierrc.json` | `yarn verify:generative` |
| Root scripts | Node ESM (`.mjs`) | — | `scripts/pre-commit-checks.mjs` |
| Python agent-server | Ruff (via project) | `apps/agent-server/pyproject.toml` | GenerativeUI CI lint job |

TypeScript: strict mode in each monorepo's `tsconfig.json` / `@repo/typescript-config`.

### 2) Development Workflows

- **Worktrees:** Feature work in `Monorepo_ModMe-dev/dev-agent-*` only (`docs/multi-agent-worktrees.md`)
- **ECL changes:** Structured work uses `harness/changes/active/` (`docs/ECL.md`)
- **Verify:** Path-filtered via `scripts/lib/path-filter.mjs` + `stack-paths.json`
- **Changelog:** Agent Update Protocol in `CHANGELOG.md`; enforced by `scripts/validate-changelog.mjs`

### 3) Dependencies and Paths

- **next-forge:** Bun workspaces, `@repo/*` protocol (`next-forge/package.json`)
- **GenerativeUI:** Yarn 3 workspaces, `workspace:*` (`GenerativeUI_monorepo/package.json`)
- **Cross-stack schemas:** Duplicate golden JSON fixtures — no cross-imports (`genui-agent-contract.golden.json` in both stacks)
- **Path aliases:** next-forge uses `@repo/*`; GenerativeUI packages use workspace package names

### 4) Documentation and Changelog

- Codebase evidence docs: `docs/codebase/*.md` (refreshed via `acquire-codebase-knowledge` scan)
- Agent entry: `AGENTS.md` (80–120 lines) → `docs/ECL.md` → active change → `docs/STATUS.md`
- C4 product docs: `C4-Documentation/`
- Inbox capture: `GenerativeUI_monorepo/docs/inbox/` with YAML frontmatter

### 5) Evidence

- `.cursor/rules/monorepo-boundaries.mdc`
- `.cursor/rules/package-manager-scope.mdc`
- `scripts/pre-commit-checks.mjs`
- `docs/ECL.md`
- `next-forge/package.json`, `GenerativeUI_monorepo/package.json`
