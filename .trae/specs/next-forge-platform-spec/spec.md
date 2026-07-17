# next-forge Platform Specification

## Why

Monorepo_ModMe runs two parallel stacks: a **legacy** GenerativeUI monorepo (CopilotKit + Python ADK) and a **primary** next-forge monorepo (Next.js 16 + Bun + Supabase). The next-forge platform must consolidate the legacy stack's GenUI vision (Static / Declarative / Open-Ended layers), the Inbox → Knowledge pipeline, and the AI agent toolset into one coherent, production-grade specification so engineers and agents share a single source of truth for capabilities, contracts, and boundaries.

## What Changes

- Codify the **next-forge platform architecture** (apps, packages, boundaries) as the authoritative spec.
- Specify the **Inbox → Knowledge pipeline** contract (funnel capture, data contract v1, quality gates, CI gates) end-to-end.
- Specify the **AI agent app** (`apps/agent`) tools, workflows, and state synchronization model.
- Specify the **Generative UI (GenUI)** three-layer model and component registry contract.
- Specify the **database layer** (Prisma schema source of truth + Supabase Auth/Storage/Realtime/RLS + pgvector).
- Specify **cross-cutting concerns**: auth (Auth.js credentials), secrets/env propagation, observability (agenttrace/session-logger), multi-agent worktrees, deployment.
- **BREAKING** (relative to legacy GenerativeUI): no direct imports from `GenerativeUI_monorepo/` into `next-forge/`; legacy stack remains read-only until phase-4 migration.

## Impact

- **Affected specs**: all next-forge packages (`@repo/*`), GenerativeUI inbox pipeline, root orchestration scripts.
- **Affected code**:
  - `next-forge/apps/{app,web,api,agent,email,docs,storybook}/`
  - `next-forge/packages/{auth,database,supabase,payments,email,cms,design-system,analytics,observability,security,storage,seo,feature-flags,internationalization,webhooks,ai,rate-limit,next-config,typescript-config,schemas}/`
  - `GenerativeUI_monorepo/docs/inbox/` (source of funnel captures)
  - Root scripts (`scripts/*.ps1`, `scripts/run-intake.mjs`, `scripts/inbox-audit.mjs`, `scripts/inbox-fix.mjs`)

---

## ADDED Requirements

### Requirement: Platform Topology

The platform SHALL be organized as a Turborepo monorepo at `next-forge/` using **Bun** as the runtime/package manager, with shared code exposed as `@repo/*` workspace packages.

#### Scenario: App port allocation

- **WHEN** any next-forge app starts in development
- **THEN** it SHALL bind to its assigned port: app=3100, web=3101, api=3102, email=3103, docs=3104, storybook=6106
- **AND** the port block SHALL NOT overlap the legacy GenerativeUI 3000–3004 block

#### Scenario: Inter-app URLs

- **WHEN** an app references another app
- **THEN** it SHALL use the env vars `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DOCS_URL`
- **AND** default values SHALL point to `http://localhost:{3100|3101|3102|3104}`

### Requirement: Monorepo Boundary Enforcement

The platform SHALL enforce a hard boundary between next-forge and the legacy GenerativeUI monorepo.

#### Scenario: No legacy imports

- **WHEN** code under `next-forge/` is compiled or linted
- **THEN** it SHALL NOT import from `GenerativeUI_monorepo/`
- **AND** the legacy stack SHALL remain read-only until an explicit phase-4 migration task targets it

### Requirement: Package Catalogue

The platform SHALL expose shared capabilities as workspace packages with single responsibilities:

| Package | Responsibility |
|---------|----------------|
| `@repo/auth` | Auth.js credentials provider, session, middleware helpers |
| `@repo/database` | Prisma client, schema (source of truth), migrations |
| `@repo/supabase` | Browser + SSR Supabase clients (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) |
| `@repo/payments` | Stripe integration (subscriptions, webhooks, checkout) |
| `@repo/email` | React Email templates + provider abstraction |
| `@repo/cms` | Content management (Mintlify docs, blog) |
| `@repo/design-system` | shadcn/ui components, tokens, Tailwind 4 config |
| `@repo/analytics` | Product analytics adapter |
| `@repo/observability` | Logging, tracing, agenttrace/session-logger hooks |
| `@repo/security` | Headers, CSP, rate-limit helpers, input validation |
| `@repo/storage` | Supabase Storage adapters (signed URLs, uploads) |
| `@repo/seo` | Metadata, sitemaps, JSON-LD |
| `@repo/feature-flags` | Flag evaluation (edge-compatible) |
| `@repo/internationalization` | i18n dictionaries + routing |
| `@repo/webhooks` | Webhook receiver + signature verification |
| `@repo/ai` | AI provider adapters (Gemini, Anthropic, OpenAI) |
| `@repo/rate-limit` | Edge rate limiting (Upstash Redis) |
| `@repo/next-config` | Shared Next.js config helpers |
| `@repo/typescript-config` | Shared tsconfig bases |
| `@repo/schemas` | Zod schemas exported to inbox contract artifacts |
| `@repo/notifications` | Notification provider/trigger components (in-app, email, etc.) |
| `@repo/collaboration` | Realtime rooms, presence, hooks (Liveblocks/LivegenUI style) |

#### Scenario: Adding a shadcn component

- **WHEN** a new UI primitive is needed
- **THEN** it SHALL be added via `npx shadcn@latest add [component] -c packages/design-system`
- **AND** consumed by apps via `@repo/design-system`

### Requirement: Database Layer (Cloud-First Supabase + Prisma)

The platform SHALL use **Prisma as the schema source of truth** and **hosted Supabase** (`modme-next-forge`, ref `aevemmmmouxqlfyxthzf`, region `us-east-1`) as the primary database, per ADR-0002.

#### Scenario: Schema deploy order

- **WHEN** schema changes are deployed
- **THEN** `bun run db:push` (Prisma) SHALL run before `bunx supabase db push`
- **AND** SQL migration 001 (pgvector, RLS, storage) SHALL reference Prisma-managed tables

#### Scenario: Local Supabase fallback

- **WHEN** a developer is offline
- **THEN** local Supabase (`bun run db:start`) MAY be used as an optional offline path
- **AND** it SHALL NOT be the default database path

#### Scenario: Supabase client naming

- **WHEN** browser/SSR Supabase clients are created via `@repo/supabase`
- **THEN** they SHALL use env var `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not legacy anon-only naming)

### Requirement: Authentication (Auth.js Credentials)

The platform SHALL use **Auth.js with a credentials provider** (no Clerk, no Supabase Auth middleware in `apps/app` by default).

#### Scenario: Default dev sign-in

- **WHEN** a developer runs `yarn dev:forge:core`
- **THEN** they SHALL sign in with `dev@modme.local` / `devpassword`
- **AND** Supabase Auth SHALL NOT be wired into `apps/app` middleware by default

### Requirement: Inbox → Knowledge Pipeline

The platform SHALL provide a multi-stage pipeline that ingests funnel captures from `GenerativeUI_monorepo/docs/inbox/` into Supabase and produces a searchable knowledge base, per ADR-0009.

#### Scenario: Funnel capture filename

- **WHEN** an agent or human drops a capture in the inbox
- **THEN** the filename SHALL match `YYYY-MM-DDTHH-MM-SS_{type}_{agent-role}_{summary-slug}.{ext}`
- **AND** `.md` files SHALL include minimum frontmatter. The validator (`scripts/lib/inbox-contract.mjs`) enforces three **required** fields: `timestamp` (ISO 8601), `agent`, `type`. The AGENTS.md capture protocol documents seven fields (`timestamp`, `agent`, `agent_role`, `type`, `severity`, `tags`, `branch`); the additional four are **recommended** but not enforced by the validator.

#### Scenario: Pipeline stages

- **WHEN** `yarn intake:orchestrate` runs
- **THEN** it SHALL execute: audit → ingest → embed → categorize → MDA (with quality gates)
- **AND** `yarn intake` SHALL run ingest-only via `scripts/run-intake.mjs`

#### Scenario: Data contract v1

- **WHEN** a capture enters the pipeline
- **THEN** it SHALL be validated against `docs/inbox-pipeline/contracts/inbox-contract.v1.json`
- **AND** embedding dimension SHALL be 384 across SQL, embed script, and RPC

#### Scenario: Quality gates

- **WHEN** a PR touches inbox paths
- **THEN** CI SHALL run validate-only funnel lens (no Supabase secrets)
- **AND** merge to dev/main SHALL run staging dry-run orchestrator with Supabase secrets

#### Scenario: Self-healing scope

- **WHEN** `yarn inbox:fix:apply` runs
- **THEN** it SHALL only auto-fix missing timestamps, invalid enums, malformed YAML
- **AND** it SHALL NEVER rewrite content

### Requirement: AI Agent App (`apps/agent`)

The platform SHALL provide an AI agent app built on **VoltAgent** (`@voltagent/core`, `@voltagent/server-hono`, `@voltagent/libsql`), exposing tools and workflows with serializable state. VoltAgent supersedes the earlier Vercel AI SDK direction because it bundles durable memory (LibSQL), observability, and suspend/resume workflows that the legacy stack lacked.

#### Scenario: Tool registration

- **WHEN** a tool is defined in `apps/agent/src/tools/` via `createTool` from `@voltagent/core`
- **THEN** it SHALL accept a Zod-validated `parameters` schema
- **AND** return a serializable JSON dict (tooling convention prefers a `message` or `status` key)

#### Scenario: Workflow composition

- **WHEN** a multi-step agent flow is defined in `apps/agent/src/workflows/`
- **THEN** it SHALL compose registered tools using VoltAgent's workflow API (suspend/resume steps)
- **AND** intermediate state SHALL be observable via the VoltAgent server (`@voltagent/server-hono`)

#### Scenario: Provider abstraction

- **WHEN** the agent binds a model
- **THEN** it SHALL use `@repo/ai` to resolve the provider
- **AND** the active implementation MAY delegate to `@ai-sdk/openai` pointed at a compatible endpoint (e.g., z.ai `glm-4`) until `@repo/ai` grows native Gemini/Anthropic adapters

#### Scenario: Memory and observability storage

- **WHEN** the VoltAgent server boots
- **THEN** memory SHALL persist to `./.voltagent/memory.db` and observability to `./.voltagent/observability.db` (LibSQL, gitignored)
- **AND** the server SHALL bind to `PORT` env (default 3105)

### Requirement: Generative UI (GenUI) Three Layers

The platform SHALL support three GenUI layers, migrated conceptually from the legacy stack. **Migration status (as of audit):** only Static GenUI is implemented in `next-forge/`; Declarative and Open-Ended layers remain in the legacy `GenerativeUI_monorepo/` and are tracked as phase-4 migration work.

1. **Static GenUI** *(implemented)* — agent selects pre-built components from `@repo/design-system` registry with typed props.
2. **Declarative GenUI** *(not-yet-migrated)* — agent emits JSON schemas rendered by a dashboard renderer. Target: port `DashboardRenderer` from legacy `GenerativeUI_monorepo/` into a `next-forge/packages/genui` package.
3. **Open-Ended GenUI** *(not-yet-migrated)* — agent emits HTML/JS executed in sandboxed iframes (internal/trusted only). Target: port sandbox wrapper from legacy stack; gate behind feature flag.

#### Scenario: Static GenUI component

- **WHEN** the agent selects a component
- **THEN** props SHALL be TypeScript-validated against the component's prop interface
- **AND** the component SHALL be exported from `@repo/design-system`

#### Scenario: Declarative GenUI migration gate

- **WHEN** a phase-4 task ports the Declarative renderer
- **THEN** it SHALL land in a new `@repo/genui` package
- **AND** the legacy `DashboardRenderer` SHALL remain read-only until the port is merged

### Requirement: Secrets and Environment Propagation

The platform SHALL propagate secrets from a single root `.env` to per-package dotenv files, per ADR-0010.

#### Scenario: Root env sync

- **WHEN** `yarn setup:env` runs
- **THEN** it SHALL write:
  - `next-forge/packages/database/.env` ← `DATABASE_URL`, `DIRECT_URL`
  - `next-forge/apps/app/.env.local` ← Supabase, DB, `AUTH_SECRET`, ModMe URLs
  - `next-forge/apps/api/.env.local` ← Supabase, DB, `AUTH_SECRET`
  - `next-forge/apps/web/.env.local` ← Supabase, web URL

#### Scenario: GitHub token alias

- **WHEN** `yarn setup:gh-aw` resolves the PAT
- **THEN** first match wins: `COPILOT_GITHUB_TOKEN` → `GITHUB_PAT` → `GITHUB_PERSONAL_ACCESS_TOKEN`
- **AND** the resolved value SHALL be pushed to GitHub as repo secret `COPILOT_GITHUB_TOKEN`

#### Scenario: Never commit secrets

- **WHEN** any file is staged
- **THEN** root `.env`, `.env.local`, `artifacts.db`, `data/` SHALL be gitignored
- **AND** only variable names (never values) SHALL appear in tracked docs

### Requirement: Multi-Agent Worktrees

The platform SHALL require feature work to happen in isolated Git worktrees, not the main checkout.

#### Scenario: Worktree creation

- **WHEN** a feature task starts
- **THEN** it SHALL create a worktree via `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner <owner>`
- **AND** `yarn worktree:ensure` SHALL fail if running in the main checkout

#### Scenario: Worktree port loading

- **WHEN** a worktree is active
- **THEN** `. .\scripts\load-worktree-ports.ps1` or `yarn worktree:ports` SHALL run before any `yarn dev:*` command

### Requirement: Observability

The platform SHALL provide agent observability via agenttrace (full). A lightweight session-logger variant is documented as a goal but is not yet installed/activated in the repo; it remains aspirational until a follow-up task wires the vendored hook.

#### Scenario: Anomaly detection

- **WHEN** an agent run appears hung or fails repeatedly
- **THEN** `yarn agenttrace --doctor` or `yarn agenttrace --latest` SHALL surface retry loops and slow tools

### Requirement: Deployment (Bun Runtime)

The platform SHALL be deployable on Bun-compatible runtimes with Next.js 16 standalone output. **Status (as of audit):** `output: "standalone"` is not yet set in `@repo/next-config`; the current config favours Turbopack dev DX. A follow-up task SHALL enable standalone output and add a deploy script before production cut.

#### Scenario: Build (target state)

- **WHEN** `bun run build` runs from `next-forge/`
- **THEN** all apps SHALL produce standalone output (once `output: "standalone"` is set in `@repo/next-config`)
- **AND** env vars SHALL be injected at runtime (not baked)

#### Scenario: Build (current state)

- **WHEN** `bun run build` runs today
- **THEN** it SHALL produce a `.next/` build artefact per app
- **AND** standalone output SHALL be added by the deployment task before this requirement is considered satisfied

---

## MODIFIED Requirements

### Requirement: CI Verification (CI Parity)

The platform SHALL provide yarn scripts that mirror CI locally so PRs can be validated before push.

- `yarn verify:forge` → check + test + build (next-forge)
- `yarn verify:generative` → lint + test + build (legacy, when GenerativeUI paths change)
- `yarn pre-commit:check` → dry-run hook checks
- `yarn check:forge` / `yarn fix:forge` → Ultracite/Biome iterate/fix

---

## REMOVED Requirements

### Requirement: Local Docker Supabase as Default

**Reason**: ADR-0002 supersedes ADR-0001; cloud-first removes Docker friction and dual-env confusion.
**Migration**: `bun run db:start` remains as optional offline-only path; default DB is hosted `modme-next-forge`.

### Requirement: Direct Legacy Imports

**Reason**: Boundary enforcement prevents drift between legacy and primary stacks during migration.
**Migration**: Legacy capabilities are re-implemented in `next-forge/` packages; GenerativeUI remains read-only until phase-4 migration.
