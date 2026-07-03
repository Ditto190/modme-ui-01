# C4 Component — next-forge App

**Container:** next-forge App (:3100)

## Responsibility

Authenticated SaaS surface: Auth.js sessions, Prisma data, Generative UI client island under `(authenticated)/generative-ui/`.

## Key modules

- `@repo/auth` — credentials provider
- `@repo/database` — Prisma client
- `generative-ui/hooks/use-agent-state.ts` — WebSocket client

## Dependencies

- Supabase Postgres (via Prisma)
- agent-server WebSocket (:8000)

## Evidence

- `next-forge/apps/app/package.json`
- `next-forge/apps/app/app/(authenticated)/generative-ui/`
