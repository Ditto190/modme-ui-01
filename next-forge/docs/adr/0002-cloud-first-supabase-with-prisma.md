# ADR-0002: Cloud-First Supabase with Prisma

## Status

**Accepted** (Supersedes [ADR-0001](./0001-supabase-local-development-with-hybrid-cloud.md))

## Context

ADR-0001 adopted Docker-based local Supabase for development with a planned hybrid path to cloud production. In practice:

- Local Docker added setup friction (Docker Desktop, port conflicts, dual env files)
- No hosted Supabase project existed yet — pipelines (inbox ingest, catalogue, intake orchestrator) could not run end-to-end
- Prisma remains the schema source of truth; SQL migrations in `supabase/migrations/` extend pgvector, RLS, and storage
- Team priority shifted to **one shared cloud database** for dev + CI + agents, with optional local Supabase later if needed

## Decision Drivers

- Single source of truth for inbox/catalogue data across agents and GitHub Actions
- Faster onboarding: no Docker requirement for database access
- Supabase MCP + CLI linked to one hosted project (`modme-next-forge`)
- Keep Prisma for typed access; use Supabase for Auth, Storage, Realtime, and REST

## Considered Options

### Option 1: Cloud-first Supabase + Prisma (SELECTED)

Hosted Supabase project; developers and scripts use cloud URLs and service role for writes.

**Pros**: No Docker; shared data; works with intake/ingest scripts immediately; Studio in browser  
**Cons**: Requires network; free-tier limits; secrets must stay in `.env` (gitignored)

### Option 2: Local Docker Supabase (ADR-0001)

**Pros**: Offline dev; no cloud cost during iteration  
**Cons**: Environment drift; blocked intake without env; Docker overhead — **rejected as primary**

### Option 3: Neon / raw Postgres only

**Pros**: Simple Postgres  
**Cons**: Lose Supabase Auth/Storage/RLS integration; more glue code — **rejected**

## Decision

Adopt **cloud-first Supabase** as the primary database for next-forge and root-level inbox/catalogue scripts. Local Supabase (`bun run db:start`) is **optional** for offline work only, not the default path.

**Hosted project** (created 2026-06-20):

| Field | Value |
|-------|--------|
| Name | `modme-next-forge` |
| Project ref | `aevemmmmouxqlfyxthzf` |
| Region | `us-east-1` |
| API URL | `https://aevemmmmouxqlfyxthzf.supabase.co` |
| Organization | Ditto190's Org |

## Rationale

- Eliminates the “local keys vs cloud keys” confusion that blocked `yarn intake`
- Agents and CI can target the same project via env vars
- Prisma `db push` + `supabase db push` apply schema to one remote database
- Supabase MCP in Cursor is already authenticated and can manage the project

## Consequences

### Positive

- `yarn intake` and inbox ingest work once env vars are set
- Browser Studio at [Supabase Dashboard](https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf)
- One migration path: git → `supabase link` → `db push`

### Negative

- Database password and service role key must be stored securely (never committed)
- Free tier pauses after inactivity — use dashboard or `restore_project` to wake
- All developers share one dev DB unless branching is added later

## Implementation

See [`docs/supabase-cloud-setup.md`](../../../docs/supabase-cloud-setup.md) (repo root).

```powershell
# 1. Link CLI (once)
cd next-forge
npx supabase login
npx supabase link --project-ref aevemmmmouxqlfyxthzf

# 2. Copy env template → packages/database/.env (set DB password from dashboard)
# 3. Push Prisma schema
bun run db:push

# 4. Apply SQL migrations (pgvector, RLS, seeds)
npx supabase db push

# 5. Repo-root intake
$env:NEXT_PUBLIC_SUPABASE_URL = "https://aevemmmmouxqlfyxthzf.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<from dashboard Settings → API>"
yarn intake
```

## Related Decisions

- **ADR-0001**: Superseded — local-hybrid no longer default
- Inbox pipeline: `GenerativeUI_monorepo/docs/inbox/`, `docs/inbox-pipeline/README.md`

## References

- [Supabase: Linking local CLI to remote](https://supabase.com/docs/guides/cli/local-development#link-your-project)
- [Prisma + Supabase](https://supabase.com/docs/guides/integrations/prisma)
- Project dashboard: https://supabase.com/dashboard/project/aevemmmmouxqlfyxthzf

---

**ADR Created**: 2026-06-20  
**Last Updated**: 2026-06-20  
**Status**: Accepted
