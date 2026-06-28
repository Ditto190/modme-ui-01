# GitHub Copilot Instructions — Monorepo_ModMe

This dual-monorepo contains two independent Turborepo projects: **next-forge** (Bun-based modern apps) and **GenerativeUI_monorepo** (Yarn-based legacy agent stack). Work in the appropriate monorepo based on the task.

## Quick Reference

### Build, Test, Lint Commands

**next-forge** (from repo root):

```bash
yarn dev:forge              # Start all next-forge apps (app:3100, web:3101, api:3102)
yarn dev:forge:core         # Just core apps (faster iteration)
yarn dev:forge:docs         # Mintlify docs on :3104
yarn dev:forge:storybook    # Storybook on :6106
yarn check:forge            # Biome check (fast quality check)
yarn fix:forge              # Auto-fix linting/formatting
yarn verify:forge           # Full CI parity (check + test + build)

cd next-forge
npx bun install             # Install deps (Bun, not Yarn)
npx bun run build           # Build all packages
npx bun run test            # Run Vitest tests
npx bun run analyze         # Bundle analysis
```

**GenerativeUI_monorepo** (from `GenerativeUI_monorepo/` directory):

```bash
yarn install                # Install deps
yarn dev                    # Start all services (web-dashboard + agent-server)
yarn workspace @monorepo-template/web-dashboard dev    # Frontend only
cd apps/agent-server && poetry run uvicorn src.main:app --reload  # Backend only
yarn build                  # Build all packages
yarn test                   # Run tests
yarn lint                   # Run ESLint
yarn eslint:fix             # Auto-fix linting issues
```

### Database (next-forge only)

```bash
cd next-forge
bun run db:start            # Start local Supabase (requires Docker)
bun run db:push             # Push schema to local DB
bun run db:stop             # Stop Supabase
```

---

## High-Level Architecture

### Dual-Monorepo Layout

```
Monorepo_ModMe (root)
├── next-forge/                    ← Production apps (Bun, TypeScript, React 18, Next.js App Router)
│   ├── apps/
│   │   ├── app/                   # Desktop app (main product)
│   │   ├── web/                   # Web frontend
│   │   ├── api/                   # REST API
│   │   └── ...                    # docs, storybook, etc.
│   ├── packages/
│   │   ├── design-system/         # shadcn/ui + Tailwind
│   │   ├── database/              # Prisma + Supabase
│   │   ├── auth/                  # Auth.js credentials provider
│   │   └── ...
│   └── biome.jsonc                # Biome (linting/formatting)
│
├── GenerativeUI_monorepo/         ← Legacy agent stack (Yarn, CopilotKit + FastAPI)
│   ├── apps/
│   │   ├── web-dashboard/         # Next.js frontend
│   │   ├── agent-server/          # Python FastAPI + AG2
│   │   └── ...
│   ├── packages/
│   │   ├── shared-schemas/        # Zod + Pydantic definitions
│   │   └── ...
│   └── .eslintrc.cjs              # ESLint config
│
├── .agents/skills/                # Copilot/Cursor agent skills (12 installed)
├── .cursor/rules/                 # Cursor project rules (Biome, linting, awesome-copilot)
├── .github/instructions/          # Per-file Copilot instructions (from awesome-copilot)
└── scripts/                       # Root-level automation scripts
```

### next-forge Architecture

**Tech Stack:** Bun, TypeScript strict, React 18, Next.js 15 (App Router), TanStack Router/Query, Tailwind CSS, Prisma (Supabase), Auth.js, Vitest

**Frontend-Backend Flow:**

- Desktop app and web frontend share the same backend API
- Auth via Auth.js (no third-party; uses Postgres sessions)
- Database: Supabase (Postgres) + Prisma migrations
- Real-time queries: TanStack Query with server caching
- Design system: shadcn/ui components + Tailwind utilities

**Port Allocation (development):**

- App: `:3100` (Desktop app)
- Web: `:3101` (Web frontend)
- API: `:3102` (REST API)
- Docs: `:3104` (Mintlify)
- Storybook: `:6106`

### GenerativeUI_monorepo Architecture

**Tech Stack:** Yarn 3, TypeScript, React 18, Next.js 14, CopilotKit, Python FastAPI, AG2 (AutoGen), Zod/Pydantic

**Frontend-Backend Communication:**

```
web-dashboard (Next.js + CopilotKit)
         ↓ WebSocket (ws://localhost:8000/ws/agent)
agent-server (FastAPI + AG2 GroupChat)
         ↓ Streams AgentState
web-dashboard re-renders GenerativeCanvas
```

**Key Integration Points:**

- `shared-schemas/` defines Zod (frontend) + Pydantic (backend) schemas
- WebSocket streams agent state changes in real-time
- `GenerativeCanvas` renders dynamic UI based on agent output
- Workspace dependencies via `workspace:*` protocol

---

## Monorepo Conventions

### Package Manager

- **next-forge**: Use `npx bun` only. Never `yarn install`.
- **GenerativeUI_monorepo**: Use `yarn` only. Never `npm install` or `bun install`.

### Workspace Dependencies

- **Internal packages**: Use `workspace:*` for version constraints
  ```json
  { "@repo/database": "workspace:*" }
  ```
- **Cross-monorepo**: Do NOT add `workspace:*` deps from GenerativeUI → next-forge
- **Version bumps**: Run `bun run bump-deps` (next-forge) or manually in GenerativeUI

### Dependency Resolution

Before adding a new dependency:

1. Check if it's already in the monorepo root `package.json`
2. If not, confirm the specific version needed for your use case
3. Never use conflicting versions across workspaces

### Git Workflow

- **Branch structure**: Feature branches created via `./scripts/new-agent-worktree.ps1`
- **PRs target**: `dev` branch, NOT `main`
- **Commits**: Use conventional commit format (scope: feat, fix, docs, etc.)
- **Pre-commit hook**: Runs `yarn pre-commit:check` automatically

### Multi-Agent Worktrees

Feature work happens in **isolated Git worktrees** to avoid conflicts:

```powershell
# Initial setup (once)
.\scripts\init-worktrees.ps1

# Create worktree for a task
.\scripts\new-agent-worktree.ps1 -Name "feature-name" -Owner copilot

# Before yarn dev, source ports
source .worktree-ports.env
yarn dev:forge:core

# After work complete
.\scripts\vibe-session-finish.ps1     # Auto-commits and creates PR to dev
```

---

## File-Scoped Instructions

Per-file Copilot instructions are located in `.github/instructions/`:

- **nextjs.instructions.md** — Next.js 16 App Router best practices
- **nextjs-tailwind.instructions.md** — Tailwind CSS patterns and design tokens
- **github-actions-ci-cd-best-practices.instructions.md** — CI/CD security, workflow optimization
- **agent-skills.instructions.md** — Creating high-quality agent skills

These are automatically applied to matching file patterns.

---

## Agent Skills & Tools

### Installed Skills (12 total)

Use with `@skill-name` syntax in Cursor or GitHub Copilot CLI:

- `@acquire-codebase-knowledge` — Map unfamiliar codebases
- `@quality-playbook` — Comprehensive quality audit (spec tests, code review, Council of Three)
- `@doublecheck` — Three-layer AI output verification with citations
- `@next-forge` — next-forge expert assistance
- `@github-actions-expert` — Secure CI/CD workflows
- `@build` — Build/compile automation
- `@create-agentsmd` — Generate AGENTS.md documentation
- `@voltagent-best-practices` — VoltAgent architecture patterns
- `@voltagent-docs-bundle` — VoltAgent API reference
- Plus others: `create-voltagent`, `react18-dep-compatibility`

### Key Coding Tools

- **lean-ctx** (context compression — **mandatory for file reads**)
  - **Do not** use native Read/Grep/Glob for repo files when lean-ctx MCP is available
  - **Read:** `ctx_read(path, mode)` — `full` before edits, `diff` after, `map`/`signatures` to orient ([read modes](https://leanctx.com/docs/concepts/read-modes/))
  - **Search:** `ctx_search(pattern, path)`
  - **Shell:** `lean-ctx -c "command"` or `ctx_shell`
  - Rules: `LEAN-CTX.md`, `.cursor/rules/lean-ctx.mdc`, skill `.agents/skills/lean-ctx/SKILL.md`
  - Config: `yarn lean-ctx:ensure` · hooks redirect reads via `~/.cursor/hooks.json`
- **MCP servers**: Playwright (visual testing), genkit, etc.
- **GitHub CLI** (`gh`): For PR/issue operations

---

## Verification Workflow

Before marking work complete:

1. **Run targeted tests** (not full suite):
   - next-forge: `cd next-forge && npx bun run test -- <pattern>`
   - GenerativeUI: `yarn workspace <package> run test`

2. **Lint & format**:
   - next-forge: `yarn fix:forge` (Biome)
   - GenerativeUI: `yarn eslint:fix`

3. **Type check**:
   - next-forge: Done automatically by Biome
   - GenerativeUI: `yarn workspace <package> run tsc --noEmit`

4. **Full CI parity** (before PR):
   - next-forge: `yarn verify:forge` (check + test + build)
   - GenerativeUI: `yarn build && yarn test`

### Example: Single Test Run

```bash
# next-forge
cd next-forge
npx bun run test -- auth.test.ts

# GenerativeUI
yarn workspace @monorepo-template/web-dashboard run test -- auth
```

---

## Common Tasks

### Adding a Package to next-forge

```bash
cd next-forge/packages
mkdir my-package
cd my-package
echo '{ "name": "@repo/my-package", "private": true, "type": "module" }' > package.json
# Add scripts to package.json: build, dev, lint, test
cd ../..
npx bun install
```

### Modifying Shared Schemas (GenerativeUI)

1. Edit `packages/shared-schemas/src/index.ts` (Zod definitions)
2. Rebuild: `yarn build`
3. Backend: Mirror changes with Pydantic models in `apps/agent-server/src/models/schemas.py`
4. Both frontend and backend re-import types

### Database Migration (next-forge)

```bash
cd next-forge/packages/database
npx bun run prisma format
npx bun run prisma migrate dev --name <migration-name>
npx bun run prisma generate
```

### Testing Frontend-Backend Communication (GenerativeUI)

1. Ensure backend is running: `cd apps/agent-server && poetry run uvicorn src.main:app --reload`
2. Check WebSocket in browser DevTools > Network > WS
3. Verify Supabase/database credentials in `.env` files

---

## Troubleshooting

### Command fails or hangs?

1. Check the actual error message (don't assume)
2. Verify you're in the correct monorepo directory
3. Clear node_modules: `rm -rf node_modules` + re-install
4. Check `.env` and `.env.local` files for missing variables

### Port conflicts?

- Check `.worktree-ports.env` in a worktree
- Use `lsof -i :PORT` (macOS/Linux) or `Get-NetTCPConnection -LocalPort PORT` (Windows) to find processes
- Next-forge ports: 3100–3102, 3104, 6106
- GenerativeUI backend: 8000

### Dependency resolution errors?

- next-forge: Run `npx bun install`
- GenerativeUI: Run `yarn install --force`
- Check for conflicting versions in workspace root vs individual packages

---

## Key Reminders

✅ **DO:**

- Read `package.json` in target package before changing build/test commands
- Use `yarn` in GenerativeUI, `bun` in next-forge
- Run verification before claiming work is done
- Use isolated worktrees for feature work
- Check `.github/instructions/` for file-scoped rules

❌ **DON'T:**

- Mix package managers (no npm/yarn in next-forge, no bun in GenerativeUI)
- Commit secrets, API keys, or credentials
- Refactor unrelated code (scope discipline)
- Skip tests or linting before PR
- Add `workspace:*` deps across monorepos

---

## Further Reading

- **Workspace docs**: See AGENTS.md in root for multi-agent worktree setup
- **next-forge setup**: `next-forge/SETUP.md` — Bun + Supabase local dev
- **GenerativeUI structure**: `GenerativeUI_monorepo/AGENTS.md` — CopilotKit + FastAPI architecture
- **CI/CD**: `.github/workflows/` — GitHub Actions for both monorepos
- **Skill development**: `.agents/skills/` — Create custom agent skills

---

_Last updated: 2026-06-20_  
_For updates to this file, edit `.github/copilot-instructions.md` at the repository root._
