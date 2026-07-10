---
name: modme-dev-setup
description: One-shot ModMe developer setup — sync root .env to next-forge, configure gh-aw Copilot secret, verify forge. Use for onboarding, DX optimization, or environment-setup tasks.
---

# ModMe dev setup

**ADR**: [ADR-0010 — gh-aw Copilot secrets & root `.env` sync](../../next-forge/docs/adr/0010-gh-aw-copilot-secrets-and-root-env-sync.md)

Run when onboarding, after cloning, or when `.env` / gh-aw / next-forge env is misconfigured.

## Session lifecycle (unified dispatcher)

One bootstrap layer — `scripts/lib/modme-env-bootstrap.ps1` — feeds all entry points.

| Phase | Command | When |
|-------|---------|------|
| Terminal open | *(automatic)* ModMe Dev profile | New integrated terminal |
| Session / worktree start | `yarn session:start` | After clone, worktree setup |
| Pre-launch (debug/tasks) | `yarn env:runtime` | Writes `.vscode/.env.runtime` |
| Verify | `yarn session:verify` | Smoke test env wiring |
| Session end | `yarn session:end` | Marker; add `-Yes -CommitMessage` for git |

Manifest: `scripts/modme-session.manifest.json`

## Pre-flight quality pipeline

Before PR or after major changes:

```powershell
yarn preflight:env      # env smoke only
yarn preflight:fast     # ~5 min: lint + test (no build)
yarn preflight          # full: both monorepos, check + test + build
yarn preflight:ci       # CI mirror (affected stacks only)
```

Skill: `.agents/skills/modme-preflight/SKILL.md` · Manifest: `scripts/preflight.manifest.json`

## Quick path (< 5 min goal)

From repo root (PowerShell):

```powershell
# 1. Ensure root .env exists (copy from .env.example, fill from dashboard)
Copy-Item .env.example .env   # if needed

# 2. Full setup
yarn setup:modme
# or: .\scripts\setup-modme-dev.ps1

# 3. Start core apps
yarn dev:forge:core
```

## What the scripts do

| Script | Yarn alias | Purpose |
|--------|------------|---------|
| `scripts/sync-env-from-root.ps1` | `yarn setup:env` | Root `.env` → next-forge dotenv files |
| `scripts/setup-gh-aw-secrets.ps1` | `yarn setup:gh-aw` | `COPILOT_GITHUB_TOKEN` on GitHub from `.env` |
| `scripts/setup-modme-dev.ps1` | `yarn setup:modme` | Orchestrates sync + secrets + forge check |

## gh-aw Copilot token

Required for agentic workflows with `engine: copilot`.

1. [Create fine-grained PAT](https://github.com/settings/personal-access-tokens/new) → **Copilot Requests: Read**
2. Add to root `.env` as `COPILOT_GITHUB_TOKEN=` (or `GITHUB_PAT=` / `GITHUB_PERSONAL_ACCESS_TOKEN=`)
3. Run `yarn setup:gh-aw`

**Token lookup order**: `COPILOT_GITHUB_TOKEN` → `GITHUB_PAT` → `GITHUB_PERSONAL_ACCESS_TOKEN`

Ref: [gh-aw quick start](https://github.com/github/gh-aw/blob/main/docs/src/content/docs/setup/quick-start.mdx)

## Windows + gh-aw CLI

Native PowerShell: `gh aw compile` / `gh aw status` may **hang**. Scripts skip compile on Windows.

```bash
wsl bash -lc 'cd /mnt/c/Users/dylan/Monorepo_ModMe && gh aw compile --validate'
```

Or rely on GitHub Actions after push.

## Cursor IDE practices

Integrated from [araguaci/cursor-skills](https://github.com/araguaci/cursor-skills):

- Rule: `.cursor/rules/cursor-skills-modme-next-forge.mdc`
- Format on save, strict TS, Server Components first
- Worktree isolation for feature work

## Verify

```powershell
yarn verify:forge
yarn worktree:doctor
# WSL only:
# gh aw compile --validate
```

Sign in: http://localhost:3100/sign-in (`dev@modme.local` / `devpassword`)

## Related

- `.agents/skills/next-forge/SKILL.md`
- `docs/gh-aw-setup.md`
- `docs/supabase-cloud-setup.md`
- `next-forge/SETUP.md`
- `AGENTS.md` → **Environment & secrets** section
