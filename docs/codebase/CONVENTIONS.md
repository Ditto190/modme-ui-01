# Conventions

## Core Sections (Required)

### 1) Format and Linting

- Linter: ESLint for TypeScript/JavaScript (`.eslintrc.cjs`)
- Formatter: Prettier (`.prettierrc.json`)
- Strictness: TypeScript strictness managed via `tsconfig.json`.

### 2) Development Workflows

- Monorepo tooling: Turborepo manages commands via `yarn dev`, `yarn build`, `yarn lint`, `yarn test`.
- Multi-agent isolation: Feature work must happen in isolated Git worktrees (`.\scripts\new-agent-worktree.ps1`) to avoid port/file conflicts among multiple AI agents.

### 3) Dependencies and Paths

- Internal package linking: Uses Yarn Workspace protocol (`workspace:*`) for dependencies inside `packages/`.
- Import rules: [TODO - check specific lint rules for barrel imports]

### 4) Documentation and Changelog

- Keep a Changelog: Updates must follow the "Agent Update Protocol" at the top of `CHANGELOG.md`.
- Agent behavior: Updates to agent rules or IDE configs must be documented in `AGENTS.md` and `docs/agent-tech-guide.md`.
- Commit Hooks: Pre-commit hooks (`scripts/pre-commit-checks.mjs`) enforce changelog validation.

### 5) Evidence

- `GenerativeUI_monorepo/package.json`
- `AGENTS.md`
- `docs/agent-tech-guide.md`
