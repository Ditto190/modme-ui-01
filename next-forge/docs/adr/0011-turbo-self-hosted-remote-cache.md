# ADR-0011: Turbo Self-Hosted Remote Cache

**Accepted**

## Context

ModMe is a **meta-monorepo**: independent Turborepos (`next-forge/` with Bun, `GenerativeUI_monorepo/` with Yarn) under one Git root. Cross-stack `workspace:*` links are forbidden.

CI for `next-forge/` runs `check`, `test`, and `build` on every path-filtered change. Without shared cache artifacts, cold builds repeat work across PRs, branches, and runners.

[Rush.js was evaluated and rejected](../../../docs/research/rush-evaluation-decision-log.md) — Bun lockfiles, dual Turbo roots, and migration cost outweigh benefits. The team needs faster CI within the existing **Turbo + Bun** stack.

Vercel Remote Cache requires Vercel linking; ModMe is self-hosted and multi-stack. Raw S3 is insufficient because Turbo speaks the HTTP remote cache API, not S3 directly.

## Decision Drivers

- **CI speed** — Reuse Turbo task outputs across machines and PRs
- **Self-hosted control** — No mandatory Vercel dependency for cache
- **Safe defaults** — CI must not fail when remote cache is unset
- **Dual-stack boundaries** — Solution applies to `next-forge/` first; GenerativeUI stays on GHA `.turbo` until opted in
- **Agent discoverability** — Clear split between local `next-forge/.env` and GitHub `vars`/`secrets`

## Considered Options

### Option 1: GHA `actions/cache` on `.turbo` only (baseline)

Per-branch local Turbo cache on the runner.

**Pros:** Zero infra, already wired  
**Cons:** No cross-PR sharing, cache keyed per `github.sha` on save — **kept as default**

### Option 2: Vercel Remote Cache

Hosted Turbo remote cache tied to Vercel account/project.

**Pros:** Managed, fast setup  
**Cons:** Vercel coupling, less control for on-prem / VPN dev — **rejected as default**

### Option 3: Self-hosted S3 via ducktors + GHA `.turbo` fallback (SELECTED)

Run [ducktors/turborepo-remote-cache](https://github.com/ducktors/turborepo-remote-cache) with S3 backend. Gate CI on repo variable `TURBO_REMOTE_CACHE_ENABLED`; when not `true`, use `actions/cache` on `next-forge/.turbo`.

**Pros:** Cross-machine cache, opt-in, graceful fallback  
**Cons:** Operate cache server, rotate tokens, HTTPS + network ACLs — **accepted**

### Option 4: Rush build cache

Centralized Rush cache with pnpm subspaces.

**Pros:** Mature enterprise monorepo tooling  
**Cons:** Rejected in rush evaluation — incompatible with Bun-first `next-forge/` — **rejected**

## Decision

We will implement **Option 3**:

1. **Default CI:** `actions/cache` on `next-forge/.turbo` when `vars.TURBO_REMOTE_CACHE_ENABLED != 'true'`.
2. **Optional remote:** When `TURBO_REMOTE_CACHE_ENABLED` repo variable is `true`, pass `TURBO_API`, `TURBO_TEAM` (variables) and `TURBO_TOKEN`, `TURBO_REMOTE_CACHE_SIGNATURE_KEY` (secrets) to `next-forge` CI jobs.
3. **Server:** Docker Compose under `scripts/turbo-remote-cache/` (ducktors image, S3 storage).
4. **Client:** `next-forge/turbo.json` — `remoteCache.enabled`, `signature: true`, timeouts.
5. **Local dev:** Developers set `TURBO_*` in gitignored **`next-forge/.env`** — **not** propagated from root `.env` sync (ADR-0010). CI gates on **GitHub variables**, not `next-forge/.env`.
6. **GenerativeUI:** GHA `.turbo` only in CI; remote cache deferred.

## Consequences

### Positive

- Faster `next-forge` CI when remote cache is enabled
- No CI breakage when remote secrets are missing (Turbo warns, GHA cache still runs when gated off)
- Documented operator path: `yarn setup:turbo-cache`, [monorepo-build-ci-setup.md](../../../docs/monorepo-build-ci-setup.md)
- Aligns with Rush **REJECT** — improves Turbo in place

### Negative

- Operators must run and secure cache server (HTTPS, VPN, token rotation)
- **Two config surfaces** — local `next-forge/.env` vs GitHub `vars`/`secrets` (easy to confuse)
- Signed caches require matching `TURBO_REMOTE_CACHE_SIGNATURE_KEY` on server and clients
- GenerativeUI does not share remote cache until explicitly configured

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token leak | High | GitHub Secrets; never commit values; `secret-guard` CI job |
| Misconfigured remote slows CI | Medium | Gate + fallback to GHA `.turbo`; Turbo timeouts in `turbo.json` |
| Local/CI config drift | Medium | Master doc + `setup-turbo-remote-cache.ps1`; ADR-0011 |
| Unsigned cache tampering | Medium | `remoteCache.signature: true` |

## Implementation Notes

### CI workflows

- `.github/workflows/ci.yml` — `next-forge` job env + conditional `.turbo` cache step
- `.github/workflows/catalog-ci.yml` — same pattern for database/catalog path

### Operator scripts

```powershell
yarn setup:turbo-cache              # Print gh commands, validate compose files
yarn setup:turbo-cache -CheckServer # Health check via next-forge/.env
```

### Docker Compose

```powershell
cd scripts/turbo-remote-cache
Copy-Item env.example .env
docker compose up -d
```

### Verification

```powershell
node scripts/research/monorepo-tool-audit.mjs
cd next-forge && bunx turbo build --verbosity=2
```

## Related Decisions

- **ADR-0010**: Root `.env` sync for Supabase/gh-aw — separate from Turbo cache (Turbo vars live in `next-forge/.env` locally and GitHub Actions cfg in CI)
- **Rush evaluation**: [rush-evaluation-decision-log.md](../../../docs/research/rush-evaluation-decision-log.md) — Rush rejected

## References

- [monorepo-build-ci-setup.md](../../../docs/monorepo-build-ci-setup.md)
- [turbo-remote-cache-s3.md](../../../docs/turbo-remote-cache-s3.md)
- [Turborepo remote caching](https://turbo.build/docs/core-concepts/remote-caching)
- [ducktors/turborepo-remote-cache](https://github.com/ducktors/turborepo-remote-cache)

**ADR Created**: 2026-06-27  
**Last Updated**: 2026-06-27  
**Status**: Accepted
