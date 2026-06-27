# Agent Index — Monorepo_ModMe

Single onboarding map for Cursor agents, cloud agents, and Copilot. Run `/init` first, then use this index to navigate the dual-monorepo.

## Read order

1. [`AGENTS.md`](../AGENTS.md) — commands, layout, session end
2. This file — stack map, ports, skills, drift register
3. [`docs/agent-tech-guide.md`](agent-tech-guide.md) — lean-ctx, CI, changelog
4. [`docs/codebase/STACK.md`](codebase/STACK.md) — dependency scorecard

---

## Repository map

| Path | Role | Package manager |
|------|------|-----------------|
| `next-forge/` | **Primary** product stack (apps, docs, workshop) | Bun |
| `GenerativeUI_monorepo/` | **Legacy** agent stack (CopilotKit + agent-server) | Yarn 3.3 |
| `GenerativeUI_monorepo/UniversalWorkbench*/` | Separate product — **read-only** unless tasked | Yarn 4.10 |
| Root | Orchestration scripts only | Yarn 3.3 |

### Root commands (`package.json`)

| Command | Stack |
|---------|-------|
| `yarn dev:forge` / `:core` / `:workshop` / `:supabase` | next-forge |
| `yarn dev:generative` | GenerativeUI |
| `yarn check:forge` / `yarn verify:forge` | next-forge CI parity |
| `yarn verify:generative` | GenerativeUI CI parity |
| `yarn pre-commit:check` | Staged-aware hook checks |
| `yarn worktree:doctor` / `yarn worktree:doctor:fix` | Worktree pre-flight |
| `yarn setup:modme` / `setup:env` / `setup:gh-aw` | Root `.env` sync + gh-aw Copilot secret (ADR-0010) |
| `yarn setup:turbo-cache` | Turbo remote cache compose check + GitHub `vars`/`secrets` hints (ADR-0011) |
| `.\scripts\new-agent-worktree.ps1` | Isolated feature worktrees |

### Codebase deep docs (`docs/codebase/`)

| File | Use when |
|------|----------|
| `STACK.md` | Ports, package managers, setup status |
| `ARCHITECTURE.md` | GenerativeCanvas, agent-server boundaries |
| `STRUCTURE.md` | web-dashboard → apps/app mapping |
| `CONVENTIONS.md` | Naming, imports |
| `INTEGRATIONS.md` | External services |
| `CONCERNS.md` | Tech debt, risks |
| `TESTING.md` | Test frameworks and commands |

---

## next-forge (primary)

Setup: [`next-forge/SETUP.md`](../next-forge/SETUP.md). Skill: [`.agents/skills/next-forge/SKILL.md`](../.agents/skills/next-forge/SKILL.md). **Env + gh-aw secrets**: [ADR-0010](../next-forge/docs/adr/0010-gh-aw-copilot-secrets-and-root-env-sync.md), [`modme-dev-setup` skill](../.agents/skills/modme-dev-setup/SKILL.md), `yarn setup:modme`.

| App | Port | Path | Purpose |
|-----|------|------|---------|
| app | 3100 | `next-forge/apps/app` | Authenticated SaaS (Auth.js, Prisma, Liveblocks) |
| web | 3101 | `next-forge/apps/web` | Marketing site (i18n, CMS) |
| api | 3102 | `next-forge/apps/api` | Webhooks, cron, health |
| email | 3103 | `next-forge/apps/email` | React Email preview |
| docs | 3104 | `next-forge/apps/docs` | Mintlify documentation |
| storybook | 6106 | `next-forge/apps/storybook` | Design-system workshop (migration target) |
| agent | 3105 | `next-forge/apps/agent` | VoltAgent experimental server |
| studio | 3005 | `next-forge/apps/studio` | Prisma Studio GUI |

### Key `@repo/*` packages

`auth`, `database`, `design-system`, `schemas`, `analytics`, `observability`, `security`, `payments`, `email`, `cms`, `collaboration`, `feature-flags`, `internationalization`, `ai`, `webhooks`, `storage`, `seo`, `notifications`, `rate-limit`, `next-config`, `typescript-config`

Local dev:

```powershell
yarn dev:forge:supabase   # Docker Supabase (Postgres :54322)
cd next-forge && bun install && bun run db:push
yarn dev:forge:core         # app + web + api
```

Sign in: `dev@modme.local` / `devpassword`

---

## GenerativeUI (legacy)

Skill: [`.agents/skills/modme-generative-ui-migrate/SKILL.md`](../.agents/skills/modme-generative-ui-migrate/SKILL.md).

| App / package | Port | Migration role |
|---------------|------|----------------|
| web-dashboard | 3001 | **Migrate** → `next-forge/apps/app` |
| agent-server | 8000 | **Keep** as Python satellite (WebSocket) |
| shared-schemas | — | **Migrated** → `@repo/schemas` |
| vibe-web-app | 3000 | Legacy-only (design sandbox) |
| example-next / example-react | 3002 / 3003 | Legacy-only (templates) |
| agent-generator | — | Legacy-only (MCP CLI tooling) |

Local dev:

```powershell
cd GenerativeUI_monorepo && yarn install
cd apps/agent-server && poetry install
yarn dev:generative   # from repo root
```

**Boundaries:** No `workspace:*` imports between monorepos. Integration via HTTP/WebSocket only.

---

## Migration status (GenerativeUI → next-forge)

| Phase | Status | Deliverable |
|-------|--------|-------------|
| 1 Workshop | In progress | `next-forge/apps/storybook/stories/modme-workshop.stories.tsx` |
| 2 Schemas | Done | `next-forge/packages/schemas` (`@repo/schemas`) |
| 3 Client island | Done | `next-forge/apps/app/app/(authenticated)/generative-ui/` |
| 4 Cutover | Pending | Feature flags, deprecate web-dashboard |

Rollback: `yarn dev:generative` restores legacy stack; disable feature flags in next-forge.

---

## Agent tooling layer

| Layer | Location |
|-------|----------|
| Onboarding command | `.cursor/commands/init.md` |
| Rules | `.cursor/rules/` — lean-ctx, monorepo-boundaries, multi-agent-worktrees, package-manager-scope |
| Repo skills | `.agents/skills/` (17 skills — see table below) |
| Cursor skills | `.cursor/skills/` (80+ vendor/project skills) |
| CI orchestrator | `scripts/pre-commit-checks.mjs` |
| Forge CI parity | `scripts/verify-forge-ci.ps1` |
| Generative CI parity | `scripts/verify-generative-ci.ps1` |
| Worktrees | `docs/multi-agent-worktrees.md` — **mandatory for feature work** |
| Beads | `docs/beads-workflow.md` — issue tracking (`modme` prefix) |
| Debug | `docs/debug-launch-guide.md`, `.vscode/launch.json`, `scripts/launch-manifest.json` |
| Buildkite | `docs/buildkite-guide.md`, `.buildkite/pipeline.yml` (GenerativeUI) |

### Repo-local skills (`.agents/skills/`)

| Skill | Use when |
|-------|----------|
| `next-forge` | Bun dev, ports, Supabase, verify commands |
| `modme-generative-ui-migrate` | Porting GenerativeCanvas, schemas, client island |
| `framework-migration-code-migrate` | Wrapper → modme-generative-ui-migrate |
| `cicd-automation-workflow-automate` | CI/CD pipeline design and consolidation |
| `smart-git-automation` | Worktree session end, PR to `dev` |
| `github-actions-efficiency` | Reduce CI minutes, dedupe workflows |
| `acquire-codebase-knowledge` | Architecture mapping |
| `create-agentsmd` | AGENTS.md generation |
| `quality-playbook` | Spec-traced audits |
| `doublecheck` | Verify agent claims |
| `supabase` / `supabase-postgres-best-practices` | Database guidance |
| `voltagent-*` / `create-voltagent` | VoltAgent workflows |
| `react18-dep-compatibility` | React 18 compat during migration |
| `memory-merger` | Memory tooling |

---

## CI/CD summary

| Workflow | Scope |
|----------|-------|
| `.github/workflows/ci.yml` | Path-filtered GenerativeUI + next-forge |
| `.github/workflows/pre-commit-check.yml` | Policy checks (secret, changelog, launch-json, skills) |
| `.github/workflows/changelog-check.yml` | PR changelog require-update |
| `.github/workflows/launch-json-check.yml` | launch.json ↔ manifest sync |
| `.github/workflows/agenttrace-ci.yml` | Agent session anomalies (`main`, `dev`) |
| `.buildkite/pipeline.yml` | GenerativeUI lint/test/build |

Local parity: `yarn verify:forge`, `yarn verify:generative`, `yarn pre-commit:check`

**Build & CI:** [`docs/monorepo-build-ci-setup.md`](monorepo-build-ci-setup.md) · [ADR-0011](../next-forge/docs/adr/0011-turbo-self-hosted-remote-cache.md) (Turbo remote cache) · [`docs/turbo-remote-cache-s3.md`](turbo-remote-cache-s3.md) (S3 server detail)

---

## Known drift register

Track and resolve these during onboarding maintenance:

| Item | Status |
|------|--------|
| next-forge launch.json configs | Added (forge-app/web/api/docs/storybook) |
| `monorepo-modme.mdc` primary stack wording | Updated → next-forge primary |
| `apps/studio` wrong `packages/db/` path | Open |
| CHANGELOG `[Unreleased]` bucket hygiene | Updated |
| Beads issue tracking | Docs in `docs/beads-workflow.md`; run `bd init --prefix modme` locally (CLI not bundled) |

---

## Session end checklist

1. Append `CHANGELOG.md` under `[Unreleased]` if change is notable
2. Update this index or `AGENTS.md` if layout/commands changed
3. Run `yarn pre-commit:check` before commit
4. In worktrees: `yarn verify:forge` or `yarn verify:generative` as appropriate
5. `.\scripts\vibe-session-finish.ps1` — commit, push, PR to **`dev`**
