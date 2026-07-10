# next-forge setup (ModMe — cloud-first Supabase)

Run from repository root after installing [Bun](https://bun.sh) and [Supabase CLI](https://supabase.com/docs/guides/cli).

**Database:** Hosted project `modme-next-forge` — see [`docs/supabase-cloud-setup.md`](../docs/supabase-cloud-setup.md) for keys and linking.

## 1. Dependencies

```powershell
cd next-forge
bun install
bun run check
```

## 2. Cloud database (Supabase)

1. Link CLI: `npx supabase link --project-ref aevemmmmouxqlfyxthzf`
2. Create `packages/database/.env` from dashboard (see cloud setup doc)
3. Push schema and SQL migrations:

```powershell
bun run db:push
npx supabase db push
```

**Optional local Docker** (offline only): `bun run db:start` — superseded by [ADR-0002](./docs/adr/0002-cloud-first-supabase-with-prisma.md).

## 3. App environment

Copy `apps/app/.env.example` → `apps/app/.env.local` and set Supabase publishable key from the [dashboard](https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf/settings/api).

**Or** from repo root: fill root `.env` and run `yarn setup:env` (see [ADR-0010](./docs/adr/0010-gh-aw-copilot-secrets-and-root-env-sync.md)).

Supabase client: `@repo/supabase` (`createBrowserSupabaseClient`, `createServerSupabaseClient`).

Also configure (if not already):

- `apps/app/.env.local`
- `apps/web/.env.local`
- `apps/api/.env.local`

Required vars: ModMe URLs (`3100` block) + `AUTH_SECRET`. **App and API** also need `DATABASE_URL` + `DIRECT_URL` (included in their `.env.example`; `yarn dev:forge:*` loads them from `packages/database/.env` automatically).

Default dev login:

- Email: `dev@modme.local`
- Password: `devpassword`

No Clerk, Neon, Stripe, or Resend keys are required for local prototyping.

## 4. Dev servers (ModMe ports)

```powershell
# Core apps (from repo root) — cloud DB, no Docker required
yarn dev:forge:core        # app:3100 web:3101 api:3102

# Optional
yarn dev:forge:workshop     # docs:3104 storybook:6106
yarn dev:forge              # full turbo dev stack
```

Sign in at http://localhost:3100/sign-in

## Verify

```powershell
cd next-forge
bun run db:status
bunx turbo build --dry-run
powershell -ExecutionPolicy Bypass -File ../scripts/smoke-forge-local.ps1
```

## Notes

- **Auth:** Auth.js credentials provider (`@repo/auth`), not Clerk
- **Database:** Hosted Supabase (`modme-next-forge`) + Prisma; local Docker optional
- **Stripe:** API `dev` no longer starts Stripe CLI; use `bun run dev:payments --filter api` when testing webhooks
- **Storybook PnP:** Root scripts use [`scripts/run-forge-bun.ps1`](../scripts/run-forge-bun.ps1) to hide root Yarn PnP during Bun runs
