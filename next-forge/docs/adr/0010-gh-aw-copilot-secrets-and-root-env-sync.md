# ADR-0010: gh-aw Copilot Secrets and Root `.env` Sync

## Status

**Accepted**

## Context

ModMe uses [GitHub Agentic Workflows (gh-aw)](https://github.com/github/gh-aw) with **`engine: copilot`** in `.github/workflows/*.md`. Copilot-backed workflow runs require a repository secret **`COPILOT_GITHUB_TOKEN`** — a fine-grained PAT with **Copilot Requests: Read**. This is distinct from the default `GITHUB_TOKEN` Actions provides.

Agents and humans also maintain secrets across:

- **Repo root** `.env` (gitignored) — intake scripts, gh-aw PAT, shared Supabase keys
- **next-forge** dotenv files — `packages/database/.env`, `apps/*/.env.local`

Without a documented single source of truth, agents repeatedly:

- Commit or paste secret values into docs
- Miss `COPILOT_GITHUB_TOKEN` on GitHub while local `.env` has `GITHUB_PAT`
- Create divergent Supabase URLs between root intake and next-forge apps

Additionally, **`gh aw compile`** hangs on native Windows PowerShell; validation must happen in WSL or GitHub Actions.

## Decision Drivers

- **Agent discoverability** — Any Cursor/Copilot agent must find setup steps in ADR, `AGENTS.md`, and skills without reading chat history
- **Never commit secrets** — Only variable **names** in tracked files; values live in gitignored `.env`
- **One human edit point** — Developer fills root `.env` once; scripts propagate to next-forge
- **Copilot engine default** — Existing workflows (`workflow-health`, `create-agentic-workflow-builder`) already use `engine: copilot`
- **Windows DX** — Scripts must not block on hung `gh aw` CLI

## Considered Options

### Option 1: Manual per-target env files (status quo before ADR)

Developers copy keys into each next-forge `.env.local` and set GitHub secrets via UI.

**Pros**: No scripts  
**Cons**: Drift, agent confusion, easy to skip `COPILOT_GITHUB_TOKEN` — **rejected**

### Option 2: Root `.env` + sync scripts + automated `gh secret set` (SELECTED)

Root `.env.example` documents keys; `sync-env-from-root.ps1` propagates; `setup-gh-aw-secrets.ps1` pushes PAT to GitHub as `COPILOT_GITHUB_TOKEN`.

**Pros**: Repeatable, agent-scriptable, documented token alias order  
**Cons**: Requires `gh auth login`; Windows compile needs WSL — **accepted**

### Option 3: Doppler / 1Password / GitHub Environments only

Central secret manager, no root `.env`.

**Pros**: Enterprise-grade rotation  
**Cons**: Extra tooling not yet adopted; blocks local-first agent workflow — **deferred**

## Decision

1. **Single source**: Root **`.env`** (gitignored) holds all local secret **values**. Tracked **`.env.example`** lists **names only**.
2. **Propagation**: `scripts/sync-env-from-root.ps1` (`yarn setup:env`) writes next-forge dotenv targets (merge mode).
3. **gh-aw secret**: `scripts/setup-gh-aw-secrets.ps1` (`yarn setup:gh-aw`) reads token in order:
   - `COPILOT_GITHUB_TOKEN`
   - `GITHUB_PAT`
   - `GITHUB_PERSONAL_ACCESS_TOKEN`  
   Then runs `gh secret set COPILOT_GITHUB_TOKEN -R <owner/repo>`.
4. **Orchestrator**: `scripts/setup-modme-dev.ps1` (`yarn setup:modme`) runs env sync + gh-aw secret + optional forge check.
5. **Engine**: Default **`engine: copilot`** for ModMe agentic workflows unless an ADR supersedes.
6. **Windows**: Skip `gh aw compile` on native Windows; use WSL or rely on Actions compile in CI.

## Rationale

- Matches [gh-aw quick start](https://github.com/github/gh-aw/blob/main/docs/src/content/docs/setup/quick-start.mdx) while fitting ModMe's dual-monorepo layout
- Agents follow one skill (`.agents/skills/modme-dev-setup/SKILL.md`) and one ADR
- Token alias order avoids duplicate PAT keys in `.env`
- Aligns with ADR-0002 cloud Supabase (shared keys at root, propagated to forge)

## Consequences

### Positive

- Onboarding: `Copy-Item .env.example .env` → fill → `yarn setup:modme`
- Agents never need to invent secret names or paths
- GitHub Actions agentic workflows authenticate once repo secret is set

### Negative

- Root `.env` remains a high-value file — must stay gitignored
- PAT must include Copilot permission or workflows fail at runtime (opaque in logs)
- Windows developers need WSL for local `gh aw compile --validate`

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PAT committed | Critical | Pre-commit secret scan; docs name-only policy |
| Wrong repo for `gh secret set` | Medium | Script resolves `gh repo view --json nameWithOwner` |
| Local vs cloud Supabase URL drift | Medium | Document in `.env.example`; ADR-0002 cloud-first default |
| gh-aw 0.68.4–0.71.3 billing bug | High | Use extension **v0.79.8+** |

## Implementation

### Agent checklist (do this, in order)

```powershell
# From repo root — never commit .env
Copy-Item .env.example .env          # if missing; fill values (names only in example)
yarn setup:env                       # sync → next-forge dotenv files
yarn setup:gh-aw                     # COPILOT_GITHUB_TOKEN → GitHub repo secret
yarn dev:forge:core                  # verify apps
```

### Token creation (human)

1. [Fine-grained PAT](https://github.com/settings/personal-access-tokens/new)
2. **Account permissions → Copilot Requests: Read**
3. Repository access: `modme-ui-01` (or target repo)
4. Store in root `.env` as `COPILOT_GITHUB_TOKEN=` (preferred) or `GITHUB_PAT=`

### Sync targets (written by `sync-env-from-root.ps1`)

| Source keys (root `.env`) | Target file |
|---------------------------|-------------|
| `DATABASE_URL`, `DIRECT_URL` | `next-forge/packages/database/.env` |
| Supabase + DB + `AUTH_SECRET` + ModMe URLs | `next-forge/apps/app/.env.local` |
| Supabase + DB + `AUTH_SECRET` | `next-forge/apps/api/.env.local` |
| Supabase + web URL | `next-forge/apps/web/.env.local` |

### Windows compile (WSL)

```bash
wsl bash -lc 'cd /mnt/c/Users/dylan/Monorepo_ModMe && gh aw compile --validate'
```

### Files agents must read

| File | Purpose |
|------|---------|
| This ADR | Decision + checklist |
| `docs/gh-aw-setup.md` | gh-aw asset map + CLI |
| `.agents/skills/modme-dev-setup/SKILL.md` | Skill entry point |
| `.cursor/rules/cursor-skills-modme-next-forge.mdc` | Cursor rule |
| `.github/agents/agentic-workflows.md` | Copilot dispatcher + secrets |

### Yarn scripts (root `package.json`)

| Script | Script file |
|--------|-------------|
| `yarn setup:env` | `scripts/sync-env-from-root.ps1` |
| `yarn setup:gh-aw` | `scripts/setup-gh-aw-secrets.ps1` |
| `yarn setup:modme` | `scripts/setup-modme-dev.ps1` |

## Related Decisions

- **ADR-0002**: Cloud-first Supabase — shared `DATABASE_URL` / publishable keys propagated from root
- **ADR-0009**: Inbox pipeline — root `.env` supplies `SUPABASE_SERVICE_ROLE_KEY` for intake

## References

- [gh-aw quick start — COPILOT_GITHUB_TOKEN](https://github.com/github/gh-aw/blob/main/docs/src/content/docs/setup/quick-start.mdx)
- [gh-aw auth reference](https://github.github.com/gh-aw/reference/auth/)
- [`docs/gh-aw-setup.md`](../../../docs/gh-aw-setup.md)
- [`docs/supabase-cloud-setup.md`](../../../docs/supabase-cloud-setup.md)

---

**ADR Created**: 2026-06-27  
**Last Updated**: 2026-06-27  
**Status**: Accepted
