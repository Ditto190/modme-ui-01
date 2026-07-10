# Checklist

## Platform Topology & Boundaries
- [x] All next-forge apps bind to assigned ports (app=3100, web=3101, api=3102, email=3103, docs=3104, storybook=6106)
- [x] Port block does not overlap GenerativeUI 3000–3004
- [x] Inter-app URLs use `NEXT_PUBLIC_APP_URL` / `WEB_URL` / `API_URL` / `DOCS_URL` env vars with localhost defaults
- [ ] Lint rule / boundary check prevents `next-forge/**` importing `GenerativeUI_monorepo/**` *(advisory-only — Task 13)*
- [x] Legacy GenerativeUI stack remains read-only (no edits unless explicit phase-4 task)

## Package Catalogue
- [x] Every `@repo/*` package from spec table exists with single responsibility
- [x] shadcn components are added via `npx shadcn@latest add [c] -c packages/design-system`
- [x] Apps consume UI primitives via `@repo/design-system`
- [x] Missing/extra packages flagged and reconciled with spec (`@repo/notifications`, `@repo/collaboration` added)

## Database Layer (Cloud-First Supabase + Prisma)
- [x] Prisma schema at `packages/database/prisma/schema.prisma` is the source of truth
- [x] Deploy order: `bun run db:push` (Prisma) before `bunx supabase db push` *(documented in SQL comment; automation pending — Task 14)*
- [x] SQL migration 001 (pgvector/RLS/storage) references Prisma-managed tables
- [x] `@repo/supabase` uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not legacy anon naming)
- [x] Local Supabase (`bun run db:start`) is optional/offline-only, not default
- [x] Hosted project `modme-next-forge` (ref `aevemmmmouxqlfyxthzf`, `us-east-1`) is the primary DB

## Authentication
- [x] Auth.js credentials provider wired in `@repo/auth`
- [x] Dev credentials `dev@modme.local` / `devpassword` seeded *(via env-fallback defaults in `auth.config.ts`)*
- [x] Supabase Auth middleware NOT wired into `apps/app` by default

## Inbox → Knowledge Pipeline
- [x] Funnel filename regex enforced: `YYYY-MM-DDTHH-MM-SS_{type}_{agent-role}_{summary-slug}.{ext}`
- [x] `.md` frontmatter validator requires: `timestamp`, `agent`, `type` (3 enforced; 4 more documented as recommended)
- [x] `yarn intake` runs ingest-only (`scripts/run-intake.mjs`)
- [x] `yarn intake:orchestrate` runs audit → ingest → embed → categorize → MDA with quality gates
- [x] Data contract v1 published at `docs/inbox-pipeline/contracts/inbox-contract.v1.json`
- [x] Embedding dimension is 384 across SQL migration, embed script, and RPC
- [x] CI PR gate runs validate-only funnel lens (no Supabase secrets)
- [x] CI dev/main gate runs staging dry-run orchestrator (with Supabase secrets)
- [x] `yarn inbox:fix:apply` only fixes structural issues; never rewrites content

## AI Agent App
- [x] Tools in `apps/agent/src/tools/` use VoltAgent `createTool` with Zod parameters
- [x] Tools return serializable JSON dicts (e.g., `{weather, message}`)
- [x] Workflows in `apps/agent/src/workflows/` compose registered tools (VoltAgent suspend/resume)
- [x] Intermediate state observable via VoltAgent server (`@voltagent/server-hono`)
- [ ] `@repo/ai` abstracts Gemini/Anthropic/OpenAI behind a common interface *(currently pure re-export of `ai`; multi-provider is future work)*

## Generative UI (GenUI)
- [x] Static GenUI: components exported from `@repo/design-system` with TypeScript-validated props
- [ ] Declarative GenUI: renderer accepts JSON schema and renders dashboard *(NOT-YET-MIGRATED — phase-4)*
- [ ] Open-Ended GenUI: HTML/JS executed in sandboxed iframes, gated to internal/trusted workflows *(NOT-YET-MIGRATED — phase-4)*

## Secrets & Environment Propagation
- [x] `yarn setup:env` writes all four target dotenv files per ADR-0010 table
- [x] `yarn setup:gh-aw` resolves token alias order COPILOT_GITHUB_TOKEN → GITHUB_PAT → GITHUB_PERSONAL_ACCESS_TOKEN
- [x] Resolved token pushed to GitHub as repo secret `COPILOT_GITHUB_TOKEN`
- [x] `.gitignore` covers root `.env`, `.env.local`, `artifacts.db`, `data/`, `menv/` *(audit: `data/` and `menv/` added in fix pass)*
- [x] Tracked docs contain variable names only (never values)

## Multi-Agent Worktrees
- [x] `yarn worktree:ensure` fails on main checkout
- [x] `.\scripts\new-agent-worktree.ps1` supports `-Owner {copilot|claude|cursor|antigravity}`
- [x] `yarn worktree:ports` / `load-worktree-ports.ps1` runs before `yarn dev:*`
- [x] `yarn worktree:doctor` / `worktree:doctor:fix` validates yarn.lock, ports, gh, Supabase env

## Observability
- [x] `yarn agenttrace --overview` displays global dashboard
- [x] `yarn agenttrace --doctor` / `--latest` surfaces anomalies (retry loops, slow tools)
- [ ] session-logger lightweight variant available *(aspirational only — Task 16)*

## Deployment (Bun Runtime)
- [ ] `bun run build` produces standalone Next.js output for all apps *(audit: `output: "standalone"` not set — Task 17)*
- [x] Env vars injected at runtime (not baked at build)

## CI Verification (CI Parity)
- [x] `yarn verify:forge` runs check + test + build
- [x] `yarn verify:generative` runs when GenerativeUI paths change *(audit: script added in fix pass)*
- [x] `yarn pre-commit:check` mirrors git pre-commit hook *(chained into `.beads/hooks/pre-commit` in fix pass)*
- [x] `yarn check:forge` / `yarn fix:forge` run Ultracite/Biome iterate/fix

## Integration & Workflow
- [x] PRs target `dev`, not `main`
- [x] `rg '<<<<<<<'` repo-wide clean before commit/push (no unresolved conflict markers)
- [x] `bunx supabase login --token sbp_...` preferred over browser login on Windows
- [x] `npx bun` used when Bun not on PATH
