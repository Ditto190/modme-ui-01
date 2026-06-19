# next-forge setup (ModMe — local-first)

Run from repository root after installing [Bun](https://bun.sh) and [Supabase CLI](https://supabase.com/docs/guides/cli) (Docker required).

## 1. Dependencies

```powershell
cd next-forge
bun install
bun run check
```

## 2. Local database (Supabase)

1. Start local Supabase (Postgres on `:54322`):

```powershell
bun run db:start
```

2. Copy `packages/database/.env.example` → `packages/database/.env` (defaults target local Supabase)
3. Push schema:

```powershell
bun run db:push
```

From repo root: `yarn dev:forge:supabase` also runs `supabase start`.

## 3. App environment

Copy each app's `.env.example` → `.env.local`:

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
# Terminal 1 — database (if not already running)
cd next-forge && bun run db:start

# Terminal 2 — core apps (from repo root)
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
- **Database:** Supabase local Postgres + Prisma; cloud Neon optional later
- **Stripe:** API `dev` no longer starts Stripe CLI; use `bun run dev:payments --filter api` when testing webhooks
- **Storybook PnP:** Root scripts use [`scripts/run-forge-bun.ps1`](../scripts/run-forge-bun.ps1) to hide root Yarn PnP during Bun runs
