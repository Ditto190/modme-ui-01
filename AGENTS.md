<<<<<<< HEAD
# AGENTS.md - Agent Development Guide

**Purpose**: Guidelines for agentic coding assistants working in this GenUI workspace.

## Essential Commands

### Development

```bash
npm run dev              # Start both UI (3000) and agent (8000)
npm run dev:ui           # Frontend only
npm run dev:agent        # Python agent only
npm run dev:debug        # With LOG_LEVEL=debug
```

### Build & Quality

```bash
npm run build            # Build Next.js for production
npm run lint             # ESLint (TS) + Ruff (Python)
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier + Ruff format
npx tsc --noEmit         # TypeScript type checking
```

### Testing

```bash
# Python (pytest)
pytest tests/                    # Run all tests
pytest tests/test_file.py       # Run single test file
pytest tests/test_file.py::test_function_name  # Run specific test
pytest -v                        # Verbose output
pytest --cov                    # Coverage report

# TypeScript/React (check for test files - none configured yet)
```

### Documentation & Validation

```bash
npm run validate:toolsets    # Validate toolset JSON schemas
npm run docs:all             # Generate all docs + diagrams
npm run docs:sync            # Sync JSON ↔ Markdown
```

## Code Style Guidelines

### Imports

- Group: external libs → internal modules → relative imports
- Use `@/*` alias for src imports: `import { UIElement } from "@/lib/types"`
- No default exports for components (named exports preferred)

### Formatting

- **TypeScript/React**: Prettier (auto-run via `npm run format`)
- **Python**: Ruff format (auto-run via `npm run format`)
- **Line length**: No strict limit, keep readable

### TypeScript Rules

- **Strict mode enabled**: `strict: true` in tsconfig.json
- Use `type` for type-only imports: `import type { Metadata } from "next"`
- No `any`: Use `unknown` or proper types
- Props interfaces should be inferred from Zod schemas

### Python Rules

- **Type hints required**: All functions must have type annotations
- Use `Dict[str, Any]` for JSON props, not generic `dict`
- Docstrings follow Google style (triple quotes)
- `from __future__ import annotations` at top of files

### Naming Conventions

- **Files**: PascalCase for components (`StatCard.tsx`), snake_case for modules
- **React components**: PascalCase, named export (`export const StatCard: React.FC<Props>`)
- **Element IDs**: snake_case (`revenue_stat`)
- **Component types**: PascalCase strings (`"StatCard"`)
- **Props**: camelCase (`trendDirection`)
- **Functions/variables**: snake_case in Python, camelCase in TypeScript

### Error Handling

- **Components**: Use Zod `safeParse()` with fallback UI
- **Agent tools**: Return `{"status": "error"|"success", "message": "..."}`
- **API routes**: Proper FastAPI/Next.js error responses
- **Always validate props before use** (see StatCard.tsx)

### Component Pattern

```typescript
// 1. Define Zod schema for validation
const PropsSchema = z.object({ title: z.string(), value: z.number() });

// 2. Infer type from schema
type Props = z.infer<typeof PropsSchema>;

// 3. Validate and render
export const MyComponent: React.FC<Props> = (rawProps) => {
  const result = PropsSchema.safeParse(rawProps);
  if (!result.success) return <ErrorFallback />;
  const props = result.data;
  return <div>{props.title}</div>;
};
```

### Agent Tool Pattern

```python
def my_tool(tool_context: ToolContext, param: str) -> Dict[str, str]:
    if not param or not isinstance(param, str):
        return {"status": "error", "message": "Invalid param"}

    elements = tool_context.state.get("elements", [])
    # ... operation ...

    tool_context.state["elements"] = elements
    return {"status": "success", "message": "Done"}
}
```

### Critical Conventions (Do Not Break)

- **State is ONE-WAY**: Python writes → React reads. Never mutate from React.
- **ALLOWED_TYPES whitelist**: Must match switch cases in `src/app/page.tsx`
- **Props must be JSON-serializable**: No functions, no circular refs
- **Key prop required**: Always use `key={el.id}` when rendering lists

### File Locations

| Purpose       | Path                       |
| ------------- | -------------------------- |
| Components    | `src/components/registry/` |
| Types         | `src/lib/types.ts`         |
| Page renderer | `src/app/page.tsx`         |
| Agent tools   | `agent/main.py`            |
| Tests         | `tests/*.py`               |

### Environment

- Node.js: 22.9.0+ (use nvm)
- Python: 3.12+ (with uv or pip)
- Required: `GOOGLE_API_KEY` in `.env`

### Debugging

```bash
curl http://localhost:8000/health  # Agent health
curl http://localhost:8000/ready   # Agent readiness + toolset info
```

See `.github/copilot-instructions.md` for detailed architecture and patterns.
=======
# AGENTS.md — Monorepo_ModMe

Guidance for Cursor agents, cloud agents, and GitHub Copilot working in this repository.

## Repository layout

- **`next-forge/`** — **primary** Turborepo for apps, Mintlify docs, and Storybook workshop (Bun, `@repo/*`)
- **`GenerativeUI_monorepo/`** — **legacy** Turborepo (Yarn 3 workspaces, Turbo) — CopilotKit + agent-server
  - `apps/` — web-dashboard, agent-server, vibe-web-app, agent-generator
  - `packages/` — shared-schemas and template packages
  - `UniversalWorkbench/` — workbench monorepo variant (staging/dev copies also exist; read-only unless tasked)
- **`.cursor/rules/`** — Cursor project rules (MDC). Includes lean-ctx, monorepo-boundaries, multi-agent-worktrees.
- **`.agents/skills/`** — Agent skills (Cursor + Copilot compatible SKILL.md format)
- **`.github/copilot-instructions.md`** — always-on Copilot instructions
- **`.github/instructions/`** — file-scoped Copilot instructions from awesome-copilot
- **`.vendor/awesome-copilot-main/`** — vendored github/awesome-copilot (refresh via setup script)

## Default commands

**next-forge** (apps, docs, workshop) — from repo root:

```bash
yarn dev:forge              # all next-forge apps
yarn dev:forge:core         # app + web + api (3100–3102)
yarn dev:forge:workshop     # docs + storybook
yarn dev:forge:supabase     # local Supabase Postgres
yarn dev:forge:docs         # Mintlify on port 3104
yarn dev:forge:storybook    # Storybook on port 6106
yarn verify:forge           # CI parity (check + test + build)
```

From `next-forge/` (use `npx bun` if Bun is not on PATH):

```bash
npx bun install
npx bun run dev
npx bun run build
```

**GenerativeUI** (legacy agent stack) — from repo root or `GenerativeUI_monorepo/`:

```bash
yarn dev:generative         # from repo root
yarn verify:generative      # CI parity (lint + test + build)
```

```bash
cd GenerativeUI_monorepo
yarn install
yarn dev
yarn build
yarn test
yarn lint
```

Per-package scripts vary (Vite/Biome/Vitest vs Next.js). Check the nearest `package.json`.

## Multi-agent worktrees

Feature work **must not** happen in the main checkout. Use isolated Git worktrees so parallel agents avoid file/Git/port conflicts.

| IDE | Start |
|-----|-------|
| Cursor Agents Window | Start agent (auto worktree via `.cursor/worktrees.json`) |
| Cursor Editor | `/worktree <task>` |
| VS Code Copilot | `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner copilot` |
| Claude Code | `-Owner claude` |
| Antigravity | `-Owner antigravity` |

**Once:** `.\scripts\init-worktrees.ps1`  
**Per task:** `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner <owner>`  
**Guard:** `yarn worktree:ensure` (fail on main checkout) or `.\scripts\ensure-worktree.ps1 -WarnOnly`  
**Doctor:** `yarn worktree:doctor` / `yarn worktree:doctor:fix` (yarn.lock, ports, gh, Supabase env)  
**Migrate main:** `.\scripts\migrate-main-to-worktree.ps1 -Name "<task>" -Owner cursor` when main has uncommitted work  
**Ports:** `. .\scripts\load-worktree-ports.ps1` or `yarn worktree:ports` before `yarn dev:*`  
**Docs:** [`docs/multi-agent-worktrees.md`](docs/multi-agent-worktrees.md)

## Agent behavior

1. Read `package.json` in the target package before changing build/test commands.
2. Use workspace protocol dependencies (`workspace:*`) for internal packages.
3. Do not edit `UniversalWorkbench-staging` or `UniversalWorkbench-dev` unless the task explicitly targets them.
4. Run verification in the affected package before marking work complete.
5. For browser/UI work, use Cursor browser MCP skills (`visual-qa-testing`, `verifying-in-browser`).

## End of session (vibe-coding / prototypes)

After prototyping in a **worktree** (not the main checkout):

```powershell
yarn worktree:doctor          # pre-flight in worktree (use -Fix via yarn worktree:doctor:fix)
yarn check:forge              # fast Ultracite check while iterating (next-forge)
yarn verify:forge             # CI parity before PR (check + test + build)
yarn verify:generative        # when GenerativeUI paths changed
yarn pre-commit:check         # same as git pre-commit hook
.\scripts\vibe-session-finish.ps1   # group → commit → optional push/PR (prefer in worktrees)
# Agent headless: -Yes -CommitMessage "..." -Push -CreatePr
# Preview: .\scripts\vibe-session-finish.ps1 -DryRun -SkipPull
```

- Branch creation: `new-agent-worktree.ps1` or `/worktree` only — see [`.agents/skills/smart-git-automation/SKILL.md`](.agents/skills/smart-git-automation/SKILL.md)
- PRs target **`dev`**, not `main`
- Git hooks install automatically in worktrees; one-time on main: `yarn hooks:install`

## Updating AI configuration

```powershell
.\scripts\cursor-ai\setup.ps1
yarn contextarch:install   # contextarch CLI (vendor + verify)
```

## ContextArch (AI context file generator)

[contextarch](https://github.com/ksoventures/contextarch-cli) generates consistent `.cursorrules`, `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` from a single wizard.

- **Install/verify**: `yarn contextarch:install` (vendors source to `.vendor/contextarch-cli-main/` and builds the CLI)
- **Run wizard**: `yarn contextarch init` (interactive; backs up existing files on overwrite)
- **Verify outputs**: `yarn contextarch:verify`
- **Sub-project**: `yarn contextarch init -C next-forge`
- **Non-interactive bootstrap**: `yarn contextarch:bootstrap next-forge` (see `scripts/contextarch-targets.json`)

Root `AGENTS.md` and `.cursor/rules/` are hand-maintained — use contextarch for **new packages** or after reviewing `--overwrite` impact.

## Workspace docs (all agents)

- **Onboarding:** run `/init` in Cursor (beads + debug setup + doc map)
- [`docs/agent-index.md`](docs/agent-index.md) — dual-monorepo index (ports, skills, migration status)
- [`docs/agent-tech-guide.md`](docs/agent-tech-guide.md) — lean-ctx, skills, changelog, CI, debug
- [`docs/debug-launch-guide.md`](docs/debug-launch-guide.md) — VS Code `launch.json`, ports, CI validation
- [`docs/multi-agent-worktrees.md`](docs/multi-agent-worktrees.md) — mandatory for feature work
- [`docs/inbox-pipeline/README.md`](docs/inbox-pipeline/README.md) — **Inbox → Knowledge pipeline** (feature taxonomy, mermaid architecture, all scripts + DB + UI + workflows)
- [`CHANGELOG.md`](CHANGELOG.md) — append under `[Unreleased]` per Agent Update Protocol
- [`docs/codebase/STACK.md`](docs/codebase/STACK.md) — dual-monorepo dependency scorecard and ports
- [`.agents/skills/next-forge/SKILL.md`](.agents/skills/next-forge/SKILL.md) — next-forge agent skill
- [`.agents/skills/modme-generative-ui-migrate/SKILL.md`](.agents/skills/modme-generative-ui-migrate/SKILL.md) — GenerativeUI → next-forge migration playbook
- [`.agents/skills/cicd-automation-workflow-automate/SKILL.md`](.agents/skills/cicd-automation-workflow-automate/SKILL.md) — CI/CD consolidation
- [`next-forge/SETUP.md`](next-forge/SETUP.md) — Bun + Supabase setup walkthrough
- [`docs/beads-workflow.md`](docs/beads-workflow.md) — beads issue tracking (`modme` prefix)
- [`GenerativeUI_monorepo/AGENTS.md`](GenerativeUI_monorepo/AGENTS.md) — legacy Turborepo commands and package layout

## Observability (Agenttrace)

**agenttrace** is used to monitor agent session costs, performance, and anomalies.
**session-logger** is a lighter weight version of agenttrace that is used to monitor agent session costs, performance, and anomalies.

- **Install/Update**: Run `.\scripts\install-agenttrace.ps1`
- **Dashboard**: Run `yarn agenttrace --overview` (or `.\agenttrace` at the root) to view the global overview.
- **Debugging**: If an agent run seems hung or fails repeatedly, agents should run `yarn agenttrace --doctor` or `yarn agenttrace --latest` to check for anomalies like retry loops or slow tools.

## External references

- [awesome-copilot](https://github.com/github/awesome-copilot) — community agents, instructions, skills
- [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)
- [sanjeed5/awesome-cursor-rules-mdc](https://github.com/sanjeed5/awesome-cursor-rules-mdc)

## Antigravity IDE / MCP Troubleshooting

- **Windows `npx` quoting bugs:** When configuring MCP servers using `npx` in `mcp_config.json`, use `"command": "npx.cmd"` instead of `"npx"`.
- **Missing Module Errors:** If `notebooks` or `visualization` MCP servers fail with `Cannot find module`, verify extension version paths in `mcp_config.json`.
- **GitHub Copilot MCP:** The `copilot plugin` command expects exactly 0 extra arguments. Use `"args": ["plugin"]`.
- **Stitch MCP API Key:** Inject API keys securely into `mcp_config.json` from `.env` using a background script to bypass LLM redaction filters.

---

## Inbox Capture Protocol

When making significant design decisions, architectural changes, code reviews, or any research worth keeping, **drop a note in the inbox**:

**Location**: `GenerativeUI_monorepo/docs/inbox/`

**Filename**: `YYYY-MM-DDTHH-MM-SS_{type}_{agent-role}_{summary-slug}.{ext}`

**Minimum frontmatter** (`.md` files):
```yaml
---
timestamp: <ISO 8601>        # e.g. 2026-06-20T13:08:52Z
agent: copilot               # your agent name
agent_role: architect        # frontend|backend|devops|architect|reviewer|researcher
type: architecture           # architecture|design|code-review|solution|research|snippet|link|component
severity: high               # low|medium|high|critical
tags: [supabase, decision]
branch: <current branch>
---
```

For non-`.md` formats (links, PDFs, code snippets, React components), just drop the file — the ingestor handles extraction automatically.

The pipeline runs on every push to `docs/inbox/` and ingests new entries into Supabase.

## Learned User Preferences

- Prefer cloud-first hosted Supabase over local Docker as the default database path; local Supabase is optional offline-only.
- When asked for Supabase credentials, verify from the user's dashboard or `npx supabase status -o env` — do not answer from generic demo defaults alone.
- Use the Cursor Supabase plugin MCP for project creation and management; Rube/supabase-automation requires a separate Composio connection.
- Run `yarn vibe:finish` / session finish only from a worktree under `Monorepo_ModMe-dev/`, not the main checkout.
- Prefer `.\scripts\vibe-session-finish.ps1` directly in worktrees when `yarn` fails due to missing `yarn.lock`.
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not legacy anon-only naming) for next-forge browser/SSR Supabase clients via `@repo/supabase`.
- Do not wire Supabase Auth middleware into `apps/app` by default — ModMe uses Auth.js for sign-in.
- On Windows, prefer `bunx supabase login --token sbp_...` (dashboard access token) over browser login; avoid bare `supabase` on PATH (often v1.x, HTTP 401).

## Learned Workspace Facts

- Hosted Supabase project: `modme-next-forge` (ref `aevemmmmouxqlfyxthzf`, region `us-east-1`); ADR-0002 supersedes ADR-0001 (local Docker).
- Supabase setup: `docs/supabase-setup.md` (local: `yarn supabase:local:setup` then `yarn intake`); cloud checklist: `docs/supabase-cloud-setup.md`
- Root intake scripts need `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; Prisma DB URLs live in `next-forge/packages/database/.env`.
- Worktrees branched from `dev` may lack `yarn.lock`; `worktree-copy-env.ps1` copies `yarn.lock`, `.yarnrc.yml`, and `.yarn/` from main.
- `vibe-session-finish.ps1 -DryRun` skips interactive `Read-Host` and pre-commit; use `yarn vibe:finish:dry-run` or the script with `-DryRun -SkipPull`.
- `yarn intake` from repo root runs `scripts/run-intake.mjs` (ingest only); `yarn intake:orchestrate` runs audit → ingest → embed → MDA with quality gates.
- Inbox data contract v1: `docs/inbox-pipeline/contracts/inbox-contract.v1.json` (ADR-0009). Quality: `yarn inbox:audit`, `yarn inbox:fix`, `yarn inbox:test`. Reports: `docs/inbox-pipeline/reports/latest.md`.
- Schema deploy order: `bun run db:push` (Prisma) before `bunx supabase db push` — SQL migration 001 expects Prisma tables.
- Supabase CLI config lives at `next-forge/supabase/`; use `bunx supabase` from `next-forge/packages/database` with `--workdir ../.. --dns-resolver https` on Windows.
- next-forge default ports: app 3100, web 3101, api 3102, docs 3104, storybook 6106 (avoids GenerativeUI 3000–3004 block).

<!-- lean-ctx-compression -->
OUTPUT STYLE: expert-terse
- Telegraph format: subject-verb-object, drop articles/prepositions
- Symbolic vocabulary: → cause, ∵ because, ∴ therefore, ⊕ add, ⊖ remove, Δ change, ≈ similar, ≠ different, ∈ in/member, ∅ empty/none, ✓ ok, ✗ fail
- Code blocks: untouched (never compress code syntax)
- Each line: max 80 chars
- Zero narration, zero filler
- BUDGET: ≤100 tokens per non-code response
<!-- /lean-ctx-compression -->
>>>>>>> chore/adr-readme-pipeline
