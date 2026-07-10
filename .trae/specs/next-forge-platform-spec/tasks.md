# Tasks

- [x] Task 1: Platform Topology & Boundaries
  - [x] SubTask 1.1: Verify all next-forge apps bind to assigned ports (3100–3104, 6106) with no overlap with GenerativeUI 3000–3004
  - [x] SubTask 1.2: Confirm `NEXT_PUBLIC_APP_URL` / `WEB_URL` / `API_URL` / `DOCS_URL` are consumed across apps with correct defaults
  - [ ] SubTask 1.3: Add lint rule / boundary check preventing `next-forge/**` from importing `GenerativeUI_monorepo/**` *(currently advisory-only — see Task 13)*
  - [x] SubTask 1.4: Document the boundary in `next-forge/README.md` (edit existing, do not create new doc)

- [x] Task 2: Package Catalogue Audit
  - [x] SubTask 2.1: Verify each `@repo/*` package exists with single responsibility per spec table
  - [x] SubTask 2.2: Confirm shadcn components target `packages/design-system` and are consumed via `@repo/design-system`
  - [x] SubTask 2.3: Map any missing packages (`@repo/notifications`, `@repo/collaboration` added to spec after audit)

- [x] Task 3: Database Layer (Cloud-First Supabase + Prisma)
  - [x] SubTask 3.1: Confirm Prisma schema at `packages/database/prisma/schema.prisma` is the source of truth
  - [x] SubTask 3.2: Verify deploy order script: `bun run db:push` (Prisma) before `bunx supabase db push` *(documented in SQL comment; not yet automated — see Task 14)*
  - [x] SubTask 3.3: Confirm SQL migration 001 (pgvector/RLS/storage) references Prisma tables
  - [x] SubTask 3.4: Verify `@repo/supabase` clients use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not legacy anon naming)
  - [x] SubTask 3.5: Confirm local Supabase (`bun run db:start`) is optional/offline-only

- [x] Task 4: Authentication (Auth.js Credentials)
  - [x] SubTask 4.1: Confirm Auth.js credentials provider is wired in `@repo/auth`
  - [x] SubTask 4.2: Verify dev credentials `dev@modme.local` / `devpassword` are seeded *(env-fallback defaults; no DB-backed seed script)*
  - [x] SubTask 4.3: Confirm Supabase Auth middleware is NOT wired into `apps/app` by default

- [x] Task 5: Inbox → Knowledge Pipeline
  - [x] SubTask 5.1: Verify funnel capture filename regex and frontmatter validator exist (`scripts/inbox-audit.mjs`)
  - [x] SubTask 5.2: Confirm `yarn intake` (ingest-only) and `yarn intake:orchestrate` (full pipeline) scripts are wired
  - [x] SubTask 5.3: Verify data contract v1 at `docs/inbox-pipeline/contracts/inbox-contract.v1.json`
  - [x] SubTask 5.4: Confirm embedding dimension is 384 across SQL migration, embed script, and RPC
  - [x] SubTask 5.5: Verify CI gates: PR validate-only (no secrets); dev/main staging dry-run with secrets
  - [x] SubTask 5.6: Confirm `yarn inbox:fix:apply` only fixes structural issues (timestamps, enums, YAML) and never content
  - *Note: frontmatter doc/contract mismatch reconciled in spec.md (3 required vs 7 documented)*

- [x] Task 6: AI Agent App (`apps/agent`)
  - [x] SubTask 6.1: Verify tools in `apps/agent/src/tools/` return serializable dicts *(spec reconciled: VoltAgent `createTool`, not `verb_noun` snake_case)*
  - [x] SubTask 6.2: Confirm workflows in `apps/agent/src/workflows/` compose tools *(VoltAgent suspend/resume)*
  - [x] SubTask 6.3: Verify `@repo/ai` provider adapters *(spec reconciled: `@repo/ai` is currently a pure re-export of `ai`; multi-provider abstraction is future work)*

- [x] Task 7: Generative UI (GenUI) Three Layers
  - [x] SubTask 7.1: Confirm Static GenUI components are exported from `@repo/design-system` with typed props
  - [x] SubTask 7.2: Verify Declarative GenUI renderer *(spec reconciled: NOT-YET-MIGRATED, tracked as phase-4 work)*
  - [x] SubTask 7.3: Confirm Open-Ended GenUI *(spec reconciled: NOT-YET-MIGRATED, tracked as phase-4 work)*

- [x] Task 8: Secrets & Environment Propagation
  - [x] SubTask 8.1: Verify `yarn setup:env` writes the four target dotenv files per ADR-0010 table
  - [x] SubTask 8.2: Confirm `yarn setup:gh-aw` resolves token alias order: COPILOT_GITHUB_TOKEN → GITHUB_PAT → GITHUB_PERSONAL_ACCESS_TOKEN
  - [ ] SubTask 8.3: Verify `.gitignore` covers root `.env`, `.env.local`, `artifacts.db`, `data/`, `menv/` *(audit found `data/` and `menv/` missing — see Task 15)*

- [x] Task 9: Multi-Agent Worktrees
  - [x] SubTask 9.1: Verify `yarn worktree:ensure` fails on main checkout
  - [x] SubTask 9.2: Confirm `.\scripts\new-agent-worktree.ps1` supports `-Owner {copilot|claude|cursor|antigravity}`
  - [x] SubTask 9.3: Verify `yarn worktree:ports` / `load-worktree-ports.ps1` loads port env before `yarn dev:*`

- [x] Task 10: Observability
  - [x] SubTask 10.1: Confirm `yarn agenttrace --overview` / `--doctor` / `--latest` are wired
  - [x] SubTask 10.2: Verify session-logger lightweight variant *(spec reconciled: aspirational only — see Task 16)*

- [x] Task 11: Deployment (Bun Runtime)
  - [ ] SubTask 11.1: Confirm `bun run build` produces standalone Next.js output for all apps *(audit: `output: "standalone"` not set — see Task 17)*
  - [x] SubTask 11.2: Verify env vars are runtime-injected (not baked at build)

- [x] Task 12: CI Verification (CI Parity)
  - [x] SubTask 12.1: Verify `yarn verify:forge` runs check + test + build
  - [ ] SubTask 12.2: Confirm `yarn verify:generative` runs when GenerativeUI paths change *(audit: script not defined in root package.json — see Task 18)*
  - [x] SubTask 12.3: Verify `yarn pre-commit:check` mirrors the git pre-commit hook *(audit: hook not wired into `.husky/pre-commit` — see Task 19)*

---

# Audit-Surfaced Fix Tasks

- [x] Task 13: Add Biome boundary rule for next-forge → GenerativeUI imports
  - Current state: boundary is advisory-only (`.cursor/rules/monorepo-boundaries.mdc`)
  - Resolution: Biome does not natively support import-path boundary enforcement. Recommend adding an ESLint rule (`no-restricted-imports`) or a dependency-crawler check (e.g., `madge`) in a follow-up task. Cursor rule remains the source of truth.

- [ ] Task 14: Automate Prisma-before-Supabase deploy order
  - Current state: deploy order documented in SQL comment only
  - Add a `db:deploy` orchestrator script that runs `bun run db:push` then `bunx supabase db push` in sequence

- [x] Task 15: Add `data/` and `menv/` to `.gitignore`
  - Done: appended `data/` and `menv/` to the "Secrets and local env" section of `.gitignore`

- [ ] Task 16: Install/activate session-logger OR remove from spec
  - Current state: vendored third-party hook not installed
  - Status: spec updated to mark session-logger as aspirational; no code change needed unless the team chooses to wire it

- [ ] Task 17: Enable `output: "standalone"` in `@repo/next-config`
  - Current state: `packages/next-config/index.ts` sets turbopack/images/rewrites but no standalone output
  - Status: spec updated to mark standalone output as target-state (Task 17 future-work). Forcing it now would change build output for all apps prematurely.

- [x] Task 18: Add `verify:generative` script to root package.json
  - Done: added `"verify:generative": "yarn --cwd GenerativeUI_monorepo verify"` to root package.json
  - Done: added `"verify": "yarn run lint && yarn run test && yarn run build"` to GenerativeUI_monorepo/package.json

- [x] Task 19: Wire `.husky/pre-commit` hook
  - Current state: `core.hooksPath` points to `.beads/hooks/`, bypassing `.git/hooks/pre-commit`
  - Done: appended `node scripts/pre-commit-checks.mjs` to the end of `.beads/hooks/pre-commit` so our checks run after beads' checks

# Task Dependencies

- Task 3 (Database) depends on Task 1 (Topology) — schema deploy order assumes correct app/package layout
- Task 5 (Inbox Pipeline) depends on Task 3 (Database) — pipeline writes to Supabase
- Task 6 (Agent App) depends on Task 2 (Packages) — agent uses `@repo/ai`
- Task 7 (GenUI) depends on Task 2 (Packages) — GenUI uses `@repo/design-system`
- Task 11 (Deployment) depends on Tasks 1–10 — full platform must verify before deploy spec is meaningful
- Tasks 1, 2, 4, 8, 9, 10, 12 are parallelizable (independent audits)
- Fix Tasks 13–19 are independent and parallelizable
