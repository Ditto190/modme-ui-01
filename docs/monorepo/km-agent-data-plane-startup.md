# KM Agent Data Plane — Monorepo Startup & Config

Operational runbook for the **agent data plane** (Entire + Dolt + Beads) beside next-forge / GenerativeUI. Product data stays on Supabase (ADR-0013 / ADR-0014).

**Beads:** `modme-awz`  
**ADRs:** [0013 dual-store](../architecture/decisions/0013-dolt-beads-entire-agent-data-plane.md) · [0014 session startup](../architecture/decisions/0014-km-session-startup-wiring.md)

## Planes (do not merge)

| Plane | Store | Soft-fail on product F5? |
|-------|--------|---------------------------|
| Product + inbox UI | Supabase Postgres + Prisma | N/A (required for apps) |
| Agent tasks | Beads (Dolt embedded) | Yes — warn only |
| Catalog CMS | Dolt `config/dolt/catalog/` + sql-server `:3307` | Yes — warn only |
| Session transcripts | Entire CLI → `entire/checkpoints/v1` | Yes — warn only |

## Config files

| Path | Role |
|------|------|
| `.beads/config.yaml` | `issue-prefix: modme`, `sync.remote` / `federation.remote` → `Ditto190/modme-ui-01`, **`backup.enabled: false`** (avoids Error 1105) |
| `.beads/metadata.json` | `dolt_mode: embedded`, recommended sql-server `127.0.0.1:3307` |
| `.dolt-data/beads-server.env` | Optional `BEADS_DOLT_SERVER_*` (gitignored); loaded by bootstrap |
| `.entire/settings.json` | Entire on; `telemetry: false`; `push_sessions: false` |
| `scripts/launch-manifest.json` | CI SoR for launch/task/compound names |
| `.vscode/tasks.json` / `launch.json` | Soft KM `dependsOn` + strict KM launch |

## Build / install steps (once per machine)

```powershell
# From worktree or main checkout root
yarn entire:install          # Scoop/Go Entire + enable Cursor hooks
winget install DoltHub.Dolt  # once
yarn dolt:up                 # sql-server :3307 (idempotent)
yarn dolt:catalog:init       # catalog schema
yarn beads:ready             # no Error 1105 when backup disabled
yarn km:status               # aggregate health
```

## Session / worktree wiring

```text
Worktree setup step 9
  → scripts/km-session-bootstrap.ps1   (soft)
  → scripts/agent-session-start.ps1 -SkipBeads
       → km-session-bootstrap again (idempotent; -SkipBeads if set)
       → builders catalog-cms-eval
```

Yarn facades:

| Script | Behavior |
|--------|----------|
| `yarn km:bootstrap` | Soft bootstrap |
| `yarn km:bootstrap:strict` | Exit 1 on any failure |
| `yarn km:status` | Entire + Dolt + Beads + inbox funnel |
| `yarn dolt:up` / `down` / `status` | Shared sql-server |
| `yarn entire:status` / `doctor` | Entire health |
| `yarn agent:session:start` | Envelope + KM bootstrap + catalog preflight |

## VS Code / Cursor debug

1. **next-forge: dev core** — `dependsOn`: `modme: env bootstrap` then `modme: KM data plane up` (soft).
2. **Agent Data Plane: bootstrap (strict)** — fails if KM unhealthy.
3. Compound **Full Stack: Forge Core + Agent Data Plane** — strict KM + forge core.

Validate:

```powershell
node scripts/validate-launch-json.mjs --require-manifest-sync
```

## Git hooks coexistence

- ModMe SoR: `yarn hooks:install` → `scripts/install-git-hooks.ps1` (`.githooks/` → `.git/hooks/`).
- After `entire enable`, re-run `yarn hooks:install` if Entire overwrote pre-commit/pre-push.
- Entire keeps prior hooks as `*.pre-entire`.

## Verification checklist

```powershell
powershell -File .\scripts\km-session-bootstrap.ps1
yarn agent:session:start --% -TaskTitle "km bootstrap smoke"
yarn km:status
node scripts/validate-launch-json.mjs --require-manifest-sync
yarn beads:ready   # must not print Error 1105
```

## Changelog linkage

`CHANGELOG.md` `[Unreleased]` bullets for agent data plane + session startup wiring + beads backup fix. Close beads `modme-awz` when merged to `dev`.

## Out of scope

- Prisma/Supabase → Dolt rewrite
- Full Beads `bd init --server` cutover
