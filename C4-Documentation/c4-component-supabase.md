# C4 Component — Supabase / Database

**Package:** `@repo/database`

## Responsibility

Prisma ORM against Supabase Postgres (cloud default). Migrations via `bun run db:push` from next-forge.

## Config

- `next-forge/packages/database/.env` — `DATABASE_URL`, `DIRECT_URL`
- Root `.env` — `NEXT_PUBLIC_SUPABASE_URL`, service role for intake

## Evidence

- `next-forge/packages/database/prisma/schema.prisma`
- `docs/supabase-cloud-setup.md`
