# Monorepo build & CI setup

Operator guide for ModMe's **dual-stack** monorepo: Turbo caching, GitHub Actions CI, optional self-hosted remote cache, and toolchain pins. This repo does **not** use Rush â€” see [rush-evaluation-decision-log.md](research/rush-evaluation-decision-log.md).

## Stack boundaries (no Rush)

| Path | Role | Package manager | Build orchestrator |
|------|------|-----------------|-------------------|
| Repo root | Orchestration scripts only | Yarn 3.3 | â€” |
| `next-forge/` | **Primary** apps & packages | Bun | Turbo 2.8 |
| `GenerativeUI_monorepo/` | Legacy agent stack | Yarn 3.3 | Turbo |

**Forbidden:** `workspace:*` across stacks, Rush migration, or unified lockfiles. Integration is HTTP/WebSocket only. See `.cursor/rules/monorepo-boundaries.mdc`.

## Turbo caching â€” two layers

ModMe uses **two complementary** Turborepo cache layers for `next-forge/`:

| Layer | Scope | When active | Config location |
|-------|--------|-------------|-----------------|
| **GHA `actions/cache`** on `.turbo` | Per-branch, per-lockfile on the runner | Default CI path | `.github/workflows/ci.yml`, `catalog-ci.yml` |
| **Self-hosted remote cache (S3)** | Cross-machine, cross-PR | Opt-in when server + GitHub cfg live | [turbo-remote-cache-s3.md](turbo-remote-cache-s3.md) |

`GenerativeUI_monorepo/` uses **GHA `.turbo` cache only** in CI today (no `TURBO_*` remote secrets). Remote cache can be added later with a separate `TURBO_TEAM` if desired.

### Client config (`next-forge/turbo.json`)

Remote cache is enabled with signature verification and timeouts:

```json
"remoteCache": {
  "enabled": true,
  "signature": true,
  "timeout": 30,
  "uploadTimeout": 60
}
```

When remote secrets are unset or misconfigured, Turbo logs a warning and falls back to local `.turbo` â€” CI does not break.

## Critical: local env vs GitHub CI

**Local development** and **GitHub Actions** use **different configuration surfaces** for Turbo remote cache:

| Setting | Local dev | GitHub Actions CI |
|---------|-----------|-------------------|
| Enable remote cache | `TURBO_REMOTE_CACHE_ENABLED=true` in **`next-forge/.env`** (gitignored) | Repo **variable** `TURBO_REMOTE_CACHE_ENABLED=true` |
| API URL | `TURBO_API` in `next-forge/.env` | Repo **variable** `TURBO_API` |
| Team slug | `TURBO_TEAM` in `next-forge/.env` | Repo **variable** `TURBO_TEAM` |
| Bearer token | `TURBO_TOKEN` in `next-forge/.env` | Repo **secret** `TURBO_TOKEN` |
| Signature key | `TURBO_REMOTE_CACHE_SIGNATURE_KEY` in `next-forge/.env` | Repo **secret** `TURBO_REMOTE_CACHE_SIGNATURE_KEY` |

`next-forge/.env` does **not** gate CI. Setting `TURBO_REMOTE_CACHE_ENABLED=true` locally only affects your machine after those vars are loaded into the shell (e.g. `Get-Content next-forge/.env` + manual export, direnv, or IDE env). CI reads **`vars.TURBO_REMOTE_CACHE_ENABLED`** from GitHub repository settings.

When `vars.TURBO_REMOTE_CACHE_ENABLED` is not `true`, CI restores/saves `next-forge/.turbo` via `actions/cache` and skips relying on the remote server.

## Operator checklist â€” self-hosted S3 remote cache

Full S3/server detail: [turbo-remote-cache-s3.md](turbo-remote-cache-s3.md). ADR: [ADR-0011](../next-forge/docs/adr/0011-turbo-self-hosted-remote-cache.md).

### 1. S3 bucket

1. Create a private bucket (e.g. `modme-turbo-cache`).
2. IAM user/role with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket`.
3. Block public access.

### 2. Docker Compose cache server

```powershell
cd scripts/turbo-remote-cache
Copy-Item env.example .env
# Local dev: env.example defaults STORAGE_PROVIDER=local (no S3)
# Production: STORAGE_PROVIDER=s3 + S3_ACCESS_KEY / S3_SECRET_KEY
docker compose up -d
```

Or from repo root:

```powershell
yarn setup:turbo-cache -ApplyLocalEnv -LocalDev -StartDocker -CheckServer
```

`-LocalDev` uses `STORAGE_PROVIDER=local` with a Docker named volume — no AWS credentials required.

Stack: [ducktors/turborepo-remote-cache](https://github.com/ducktors/turborepo-remote-cache).

### 3. Verify server health

```powershell
# From repo root â€” loads next-forge/.env, hits /v8/artifacts/status (no secret values printed)
yarn setup:turbo-cache -CheckServer
```

Or manually (replace placeholders with your values):

```powershell
curl -H "Authorization: Bearer <TURBO_TOKEN>" "<TURBO_API>/v8/artifacts/status"
```

Expect JSON with `"status":"enabled"`.

### 4. GitHub repository configuration

Run the setup helper for copy-paste `gh` commands (names only):

```powershell
yarn setup:turbo-cache
```

| GitHub kind | Name | Purpose |
|-------------|------|---------|
| **Variable** | `TURBO_REMOTE_CACHE_ENABLED` | `true` when remote cache is live; omit or `false` for GHA `.turbo` only |
| **Variable** | `TURBO_API` | Base URL of cache server (no trailing slash) |
| **Variable** | `TURBO_TEAM` | Stable team slug (e.g. `modme`) |
| **Secret** | `TURBO_TOKEN` | Bearer token â€” must match server `TURBO_TOKEN` |
| **Secret** | `TURBO_REMOTE_CACHE_SIGNATURE_KEY` | Required with `remoteCache.signature: true` in `turbo.json` |

Example commands (fill values locally; never commit):

```powershell
gh variable set TURBO_REMOTE_CACHE_ENABLED -b "true"
gh variable set TURBO_API -b "https://turbo-cache.your-domain.internal"
gh variable set TURBO_TEAM -b "modme"
gh secret set TURBO_TOKEN
gh secret set TURBO_REMOTE_CACHE_SIGNATURE_KEY
```

### 5. Local developer setup (`next-forge/.env`)

Add **names only** to gitignored `next-forge/.env` (no `next-forge/.env.example` in repo â€” keep values out of git):

```
TURBO_REMOTE_CACHE_ENABLED=true
TURBO_API=
TURBO_TOKEN=
TURBO_TEAM=modme
TURBO_REMOTE_CACHE_SIGNATURE_KEY=
```

Second build on another machine should show cache hits:

```powershell
cd next-forge
bunx turbo build --verbosity=2
```

### 6. Verify in CI

Open a PR touching `next-forge/` and check the **Build** step for:

- `Remote caching enabled`
- `cache hit` / `FULL TURBO` on unchanged packages

If remote is misconfigured, the job still completes using GHA `.turbo` restore.

## CI workflows

| Workflow | Turbo remote env | GHA `.turbo` cache |
|----------|------------------|------------------|
| `.github/workflows/ci.yml` â€” `next-forge` job | `vars` + `secrets` as above | When `vars.TURBO_REMOTE_CACHE_ENABLED != 'true'` |
| `.github/workflows/catalog-ci.yml` â€” `catalog` job | Same | Same gate |
| `.github/workflows/ci.yml` â€” `generative-ui` job | None | Always (GenerativeUI path) |

Automation lever: `yarn setup:turbo-cache` â†’ `scripts/setup-turbo-remote-cache.ps1`.

## Nix dev shell (optional)

Reproducible Node 22 / Bun / Yarn 3.3 pins without replacing per-stack package managers:

```powershell
nix develop -c yarn worktree:doctor
```

See [nix-devshell.md](nix-devshell.md). Primary Windows path remains PowerShell + `yarn dev:forge:*`.

## Related docs & scripts

| Resource | Purpose |
|----------|---------|
| [turbo-remote-cache-s3.md](turbo-remote-cache-s3.md) | S3 + ducktors server deep dive |
| [ADR-0011](../next-forge/docs/adr/0011-turbo-self-hosted-remote-cache.md) | Architecture decision |
| [ADR-0010](../next-forge/docs/adr/0010-gh-aw-copilot-secrets-and-root-env-sync.md) | Root `.env` vs GitHub secrets (gh-aw) |
| `scripts/turbo-remote-cache/` | Docker Compose stack |
| `yarn setup:turbo-cache` | Validate compose; `-ApplyLocalEnv`, `-ApplyGh`, `-StartDocker`, `-LocalDev`, `-CheckServer` |
| `yarn research:monorepo-audit` | Rush vs Turbo toolchain snapshot |

## Audit

```powershell
node scripts/research/monorepo-tool-audit.mjs
```

Confirms dual-stack layout, CI Turbo signals, and Rush **REJECT** recommendation.
