# Supabase setup — ModMe

One guide. Two targets: **local Docker** (default for dev) and **cloud** (shared/staging).

Supabase config lives in **`next-forge/supabase/`**. Always pass **`--workdir ../..`** when running the CLI from `next-forge/packages/database`, or use the yarn/bun scripts below (they set paths for you).

---

## Local development (recommended)

From **repo root**:

```powershell
yarn supabase:local:setup
yarn intake:dry-run
yarn intake
```

From **`next-forge/`** (same thing — avoids the yarn/bun packageManager conflict):

```powershell
bun run db:local:setup
bun run intake:dry-run
bun run intake
```

What `supabase:local:setup` does:

1. Starts Docker (`supabase start`)
2. Writes `.env` files from `supabase status` (no manual copy/paste)
3. `bun run db:push` — Prisma tables on `127.0.0.1:54322`
4. `supabase db push --local` — pgvector, RLS, category seeds

### Env files (auto-written)

| File | Purpose |
|------|---------|
| `next-forge/packages/database/.env` | `DATABASE_URL` / `DIRECT_URL` for Prisma |
| `.env` (repo root) | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for intake |
| `next-forge/apps/app/.env.local` | App Supabase client keys |

Re-sync after restart: `yarn supabase:local:env`

### Useful commands

| Goal | Command |
|------|---------|
| Status / Studio URL | `cd next-forge && bun run db:status` |
| Stop Docker | `cd next-forge && bun run db:stop` |
| Re-apply SQL only | `cd next-forge && bun run db:local:push` |
| Re-apply Prisma only | `cd next-forge && bun run db:push` |

### Do not

- Run `supabase db push` without `--local` while linked to cloud — it targets **remote** and fails if MCP migrations differ from git.
- Run `yarn intake` from `next-forge/` — Yarn reads `bun@1.3.10` and errors. Use `bun run intake` there instead.
- Run `supabase status --workdir ..\...` from `next-forge/` — that resolves to repo root (no `supabase/config.toml`). Use `bun run db:status`.

---

## Cloud (modme-next-forge)

Project ref: `aevemmmmouxqlfyxthzf`  
Dashboard: https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf

**You must set** `next-forge/packages/database/.env` with your cloud DB password (dashboard → Settings → Database → Connect → Prisma).

Then:

```powershell
yarn supabase:setup
# or manually:
cd next-forge
bun run db:push
bun run db:remote:push
```

If remote push fails with *Remote migration versions not found*, the cloud DB was migrated via MCP. Repair or pull:

```powershell
cd next-forge/packages/database
bunx supabase migration repair --status reverted 20260620103349 20260620103425 20260620103448 --workdir ../.. --dns-resolver https
bunx supabase db pull --workdir ../.. --dns-resolver https
```

For cloud intake, set root `.env` with cloud URL + service role key from the dashboard API page.

---

## Architecture

```
Prisma (db:push)     → base tables (inbox_entries, categories, …)
Supabase SQL (db push) → pgvector, RLS, storage bucket, match_inbox_entries(), seeds
inbox-ingest.mjs     → reads GenerativeUI_monorepo/docs/inbox/ → Supabase
```

Order matters: **Prisma first**, then SQL migrations.

---

## Windows notes

- Use `bunx supabase` from `next-forge/packages/database` (v2.x), not global `supabase` v1.
- Cloud link/push: add `--dns-resolver https` (IPv6 DNS issue for `db.*.supabase.co`).

See also: [`docs/supabase-cloud-setup.md`](supabase-cloud-setup.md) (cloud checklist).
