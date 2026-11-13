# KM Agent Data Plane — Monorepo Startup & Config

Operational runbook for the **agent data plane** (Entire + Dolt + Beads) beside next-forge / GenerativeUI. Product data stays on Supabase (ADR-0013 / ADR-0014).

**ADRs:** [0013 dual-store](../architecture/decisions/0013-dolt-beads-entire-agent-data-plane.md) · [0014 session startup](../architecture/decisions/0014-km-session-startup-wiring.md)

## Planes (do not merge)

| Plane               | Store                                            | Soft-fail on product F5? |
| ------------------- | ------------------------------------------------ | ------------------------ |
| Product + inbox UI  | Supabase Postgres + Prisma                       | N/A (required for apps)  |
| Agent tasks         | Beads (Dolt embedded)                            | Yes — warn only          |
| Catalog CMS         | Dolt `config/dolt/catalog/` + sql-server `:3307` | Yes — warn only          |
| Session transcripts | Entire CLI → `entire/checkpoints/v1`             | Yes — warn only          |

**`yarn intake:orchestrate` is Supabase inbox** — not KM. Failures there mean missing `.env` Supabase keys / schema / embeddings. Diagnose: `yarn supabase:env:diagnose`. KM health: `yarn km:status`.

## Entry matrix (soft KM unless noted)

| Entry                                          | Calls KM?                                |
| ---------------------------------------------- | ---------------------------------------- |
| `.cursor/setup-worktree-windows.ps1` / unix    | Yes (soft)                               |
| `scripts/agent-session-start.ps1`              | Yes (soft)                               |
| `scripts/lib/worktree-bootstrap.ps1` (Copilot) | Yes even with `-SkipSession`             |
| `scripts/copilot-workspace/session-start.ps1`  | Yes via agent-session-start              |
| `scripts/new-agent-worktree.ps1`               | Yes (soft)                               |
| VS Code `next-forge: dev core`                 | Yes via `dependsOn` soft task            |
| Launch `Agent Data Plane: bootstrap (strict)`  | Yes **strict**                           |
| `yarn agent:tui` / mprocs                      | Yes — `km_bootstrap` **autostart: true** |
| pwsh `$PROFILE`                                | No (opt-in only; see below)              |

## Config files

| Path                           | Role                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `.beads/config.yaml`           | `issue-prefix: modme`, remotes → `Ditto190/modme-ui-01`, **`backup.enabled: false`** |
| `.beads/metadata.json`         | `dolt_mode: embedded`, sql-server `127.0.0.1:3307`                                   |
| `.dolt-data/beads-server.env`  | Optional `BEADS_DOLT_SERVER_*` (gitignored)                                          |
| `.entire/settings.json`        | Entire on; telemetry off; no session push                                            |
| `scripts/launch-manifest.json` | CI SoR for launch/task/compound names                                                |

## Build / install steps (once per machine)

```powershell
yarn entire:install
winget install DoltHub.Dolt
yarn dolt:up
yarn dolt:catalog:init
yarn beads:ready
yarn km:status
```

## Yarn facades

| Script                       | Behavior                                            |
| ---------------------------- | --------------------------------------------------- |
| `yarn km:bootstrap`          | Soft bootstrap                                      |
| `yarn km:bootstrap:strict`   | Exit 1 on failure                                   |
| `yarn km:bootstrap:smoke`    | Skip all heavy steps — contract smoke               |
| `yarn km:status`             | Aggregate health                                    |
| `yarn agent:session:start`   | Envelope + KM + catalog preflight                   |
| `yarn agent:mprocs:generate` | Regenerates `mprocs.yaml` (includes `km_bootstrap`) |

## Verification (prove wiring)

```powershell
yarn vitest run scripts/__tests__/km-startup-wiring.test.mjs
yarn km:bootstrap:smoke
node scripts/validate-launch-json.mjs --require-manifest-sync
yarn agent:mprocs:generate
yarn e2e:worktree-smoke
yarn vitest run scripts/__tests__/intake-orchestrate-preflight.test.mjs
```

## Optional pwsh profile (opt-in only)

Do **not** enable by default. If you want once-per-shell soft KM when cwd is a ModMe worktree:

```powershell
# In $PROFILE — only when MODME_KM_PROFILE=1
if ($env:MODME_KM_PROFILE -eq '1' -and (Test-Path .\scripts\km-session-bootstrap.ps1)) {
  powershell -NoProfile -File .\scripts\km-session-bootstrap.ps1 | Out-Host
}
```

## Out of scope

- Prisma/Supabase → Dolt
- Full Beads `bd init --server` cutover
- Default profile auto-run
