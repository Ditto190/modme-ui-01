# Supabase cloud setup — ModMe (`modme-next-forge`)

Hosted project created via Supabase MCP on **2026-06-20**.

| | |
|---|---|
| **Dashboard** | https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf |
| **Project ref** | `aevemmmmouxqlfyxthzf` |
| **API URL** | `https://aevemmmmouxqlfyxthzf.supabase.co` |
| **Region** | `us-east-1` |
| **Org** | Ditto190's Org |
| **Plan** | Free ($0/month at creation) |

ADR: [`next-forge/docs/adr/0002-cloud-first-supabase-with-prisma.md`](../next-forge/docs/adr/0002-cloud-first-supabase-with-prisma.md)

**Hybrid + agents:** [`docs/supabase-agent-hybrid.md`](supabase-agent-hybrid.md) — hosted primary, optional local Studio, MCP/CLI/script paths.

---

## Step 1 — Get API keys (you, ~2 min)

1. Open [Project Settings → API](https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf/settings/api)
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (or publishable) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (server/scripts only — never in frontend)
3. Open [Database Settings](https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf/settings/database)
4. Copy or reset **Database password** for connection strings

---

## Step 2 — Link Supabase CLI (once)

```powershell
cd next-forge\packages\database
bunx supabase login --token sbp_<from-dashboard-account-tokens>
cd ..\..
cd next-forge
bunx supabase link --project-ref aevemmmmouxqlfyxthzf --workdir . --dns-resolver https --yes
# Or from repo root: yarn supabase:setup
```

**Windows DNS fix:** `db.*.supabase.co` is IPv6-only. If link fails with `no such host`, add **`--dns-resolver https`** (required on many Windows networks).

Verify:

```powershell
cd next-forge/packages/database
bunx supabase projects list
```

---

## Step 3 — Environment files

### `next-forge/packages/database/.env`

Create from dashboard values (file is gitignored):

```env
# Session pooler (Prisma migrations / serverless)
DATABASE_URL="postgresql://postgres.aevemmmmouxqlfyxthzf:[YOUR-DB-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (Prisma db push / migrations)
DIRECT_URL="postgresql://postgres:[YOUR-DB-PASSWORD]@db.aevemmmmouxqlfyxthzf.supabase.co:5432/postgres"
```

Use **Connect** button in dashboard → **ORMs** → Prisma for the exact strings if regions differ.

### `next-forge/apps/app/.env.local` (and `apps/api/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://aevemmmmouxqlfyxthzf.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key-from-dashboard>
DATABASE_URL=<same as packages/database/.env>
DIRECT_URL=<same as packages/database/.env>
AUTH_SECRET=<generate: openssl rand -base64 32>
```

Use the **publishable** key (`sb_publishable_...`) for browser/SSR clients via `@repo/supabase`. Legacy anon JWT still works but publishable keys are preferred.

### Repo root — inbox / intake scripts

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://aevemmmmouxqlfyxthzf.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-from-dashboard>"
```

Or add to root `.env` (gitignored) if you use `dotenv_if_exists` via direnv.

---

## Step 4 — Push schema to cloud

```powershell
cd next-forge
bun install
bun run db:push
```

This creates Prisma tables (`inbox_entries`, `categories`, etc.) on the hosted database.

---

## Step 5 — Apply SQL migrations

**Cloud (linked project):**

```powershell
cd next-forge/packages/database
bunx supabase db push --workdir ..\.. --dns-resolver https --yes
```

**Local Docker** (after `bun run db:start` and `bun run db:push`):

```powershell
cd next-forge/packages/database
bunx supabase db push --local --workdir ..\.. --yes
```

Do **not** run `db push` without `--local` or `--linked` while linked to cloud if you intend to target local Postgres — the default targets the **remote** linked project.

If remote push fails with *Remote migration versions not found in local migrations directory*, the cloud DB was migrated via MCP with timestamped versions. Either repair history (`supabase migration repair --status reverted ...`) and `supabase db pull`, or use `--local` for local dev only.

Applies:

- `001_inbox_pipeline_pgvector.sql` — pgvector, RLS, storage bucket, `match_inbox_entries`
- `002_seed_categories.sql` — taxonomy seed data

Confirm in dashboard **Table Editor** or:

```powershell
npx supabase db remote commit   # optional: snapshot remote state
```

---

## Step 6 — Run intake (repo root)

```powershell
cd C:\Users\dylan\Monorepo_ModMe
# env vars set from Step 3
yarn intake
```

Dry-run first if you prefer: `yarn intake:dry-run` (still needs env for non-dry paths).

---

## Step 7 — Cursor Supabase MCP

The Supabase plugin MCP is authenticated. Useful tools:

- `list_tables` — verify schema
- `apply_migration` — DDL on remote (prefer `supabase db push` from git for history)
- `get_advisors` — security/performance checks after RLS changes

Project ID for MCP calls: `aevemmmmouxqlfyxthzf`

---

## Optional: local Supabase (deprecated as default)

ADR-0001 local Docker flow still works for offline dev but is **not required**:

```powershell
bun run db:stop    # stop local containers if running
```

Do not mix local URLs and cloud URLs in the same `.env` file.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `cannot read config ... supabase\config.toml` | Run CLI from **`next-forge/`**, not repo root. Config lives at `next-forge/supabase/config.toml`. |
| `supabase login` → HTTP 401 | Global CLI is likely **v1.x** (you had `1.142.2`). Use **`bunx supabase`** from `next-forge/packages/database` (v2.x), or login with a [dashboard access token](https://supabase.com/dashboard/account/tokens): `bunx supabase login --token sbp_...` |
| `link` → `no such host` for `db.*.supabase.co` | IPv6-only DB hostname on Windows — use **`--dns-resolver https --yes`** on link (see Step 2). |
| Browser login times out | Complete **Authorize** in the browser *before* the CLI spinner finishes; or skip browser flow and use `--token` (recommended on Windows). |
| `supabase status -o env` on cloud setup | That command is for **local Docker** only. Cloud keys come from [Project Settings → API](https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf/settings/api). |
| Project paused (free tier) | Dashboard → Restore project, or MCP `restore_project` |
| `relation does not exist` on migration 001 | Run `bun run db:push` **before** `supabase db push` |
| Prisma pooler errors | Use `DIRECT_URL` for `db push`; pooler URL for runtime |
| Intake skips Supabase | Set both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |
| RLS blocks client writes | Use service role in scripts; browser uses publishable key + policies |

---

## Security checklist (from Supabase skill)

- Never put `service_role` in `NEXT_PUBLIC_*` or client bundles
- RLS enabled on all public tables (migration 001 does this)
- Do not use `user_metadata` for authorization in policies
- Rotate keys if ever committed to git
