---
name: next-forge
description: Expert assistance for next-forge — a production-grade Turborepo template for Next.js SaaS apps. Triggers on questions about next-forge installation, setup, architecture, packages, customization, deployment, and development workflows.
---

# next-forge (ModMe)

next-forge lives at `next-forge/` in Monorepo_ModMe. Use **Bun** (`npx bun` if not on PATH).

## ModMe port block (avoids GenerativeUI 3000–3004)

| App | Port |
|-----|------|
| app | 3100 |
| web | 3101 |
| api | 3102 |
| email | 3103 |
| docs | 3104 |
| storybook | 6106 |

Inter-app URLs in `.env.local`:

```
NEXT_PUBLIC_APP_URL=http://localhost:3100
NEXT_PUBLIC_WEB_URL=http://localhost:3101
NEXT_PUBLIC_API_URL=http://localhost:3102
NEXT_PUBLIC_DOCS_URL=http://localhost:3104
```

## Quick Start

From repo root:

```bash
yarn dev:forge:supabase   # start local Supabase (Docker)
yarn dev:forge:core       # app:3100 web:3101 api:3102
# or
cd next-forge && bun install && bun run dev:core
```

1. `bun run db:start` then copy `packages/database/.env.example` → `.env`
2. `bun run db:push`
3. Copy app `.env.example` → `.env.local` (Auth.js `AUTH_SECRET` + ModMe URLs)
4. Sign in with `dev@modme.local` / `devpassword`
5. Optional: `yarn dev:forge:workshop` for docs + storybook

**Auth:** Auth.js credentials (no Clerk). **Database:** Supabase local Postgres (no Neon required).

## Architecture

Apps in `next-forge/apps/`. Shared packages as `@repo/*`.

**Core packages**: `auth`, `database`, `payments`, `email`, `cms`, `design-system`, `analytics`, `observability`, `security`, `storage`, `seo`, `feature-flags`, `internationalization`, `webhooks`, `cron`, `notifications`, `collaboration`, `ai`, `rate-limit`, `next-config`, `typescript-config`.

See `references/architecture.md` for full structure.

## Boundaries

- Do not import from `GenerativeUI_monorepo/` directly.
- Legacy agent stack stays in GenerativeUI until phase-4 migration.

## Common Tasks

From repo root (recommended in worktrees):

```bash
yarn check:forge                 # ultracite/biome (pre-commit when next-forge/ staged)
yarn fix:forge                   # auto-fix
yarn verify:forge                # CI parity before PR
yarn pre-commit:check            # dry-run hook checks
```

From `next-forge/`:

```bash
npx bun run dev                  # all apps
npx bun run dev --filter docs
npx bun run dev --filter storybook
npx bun run build
npx bun run check                # ultracite/biome
npx shadcn@latest add [c] -c packages/design-system
```

## Session end

In a worktree after prototyping:

```powershell
.\scripts\vibe-session-finish.ps1
```

PRs target **`dev`**. See [`.agents/skills/smart-git-automation/SKILL.md`](../smart-git-automation/SKILL.md).

For upstream details see `references/setup.md`, `references/packages.md`, `references/customization.md`.
