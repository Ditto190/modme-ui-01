---
name: cicd-automation-workflow-automate
description: Design and implement CI/CD pipelines, GitHub Actions workflows, and automated development processes for Monorepo_ModMe. Use when consolidating workflows, adding verify scripts, or closing CI coverage gaps.
---

# CI/CD Workflow Automation — Monorepo_ModMe

Repo-specific overlay for pipeline design. Pair with [`.agents/skills/github-actions-efficiency/SKILL.md`](../github-actions-efficiency/SKILL.md) for cost/runtime audits.

## Current architecture

| Layer | Scope |
|-------|-------|
| `.github/workflows/ci.yml` | secret-guard (always) + path-filtered GenerativeUI, next-forge, agent-server |
| `.github/workflows/pre-commit-check.yml` | Policy checks via `scripts/pre-commit-checks.mjs --ci` |
| `.github/workflows/changelog-check.yml` | PR changelog require-update |
| `.github/workflows/launch-json-check.yml` | launch.json ↔ manifest sync |
| `.buildkite/pipeline.yml` | GenerativeUI lint/test/build |

## Local CI parity

```powershell
yarn verify:forge          # next-forge check + test + build
yarn verify:generative     # GenerativeUI lint + test + build
yarn pre-commit:check      # staged-aware hook checks
```

## Phased improvement backlog

### Phase A — Deduplication (done / maintain)

- Changelog validation owned by `changelog-check.yml` (not duplicated in `ci.yml`)
- `pre-commit-check.yml` runs policy only; stack builds in `ci.yml`
- `secret-guard` runs on every push/PR (no doc-only workflow skip)

### Phase B — Coverage

- `yarn verify:generative` at root
- `agent-server` pytest job in `ci.yml`
- `agenttrace-ci` on `main` and `dev`

### Phase C — Quality gates (planned)

- Prisma format check in next-forge CI
- `bun run boundaries` in next-forge CI
- Complete `docs/codebase/TESTING.md`

### Phase D — Deploy (needs approval)

- GitHub Environments + staging on merge to `dev`
- Document dormant `GenerativeUI_monorepo/.github/workflows/` as inactive

### Phase E — Agent task memory (beads)

Git-backed issue tracking for multi-session CI and migration work.

```powershell
yarn beads:init              # bd init --prefix modme + 5 starter issues
npx @beads/bd ready          # pick next unblocked issue at session start
npx @beads/bd close modme-N  # when task ships
```

| Script | Purpose |
|--------|---------|
| `scripts/init-beads-starter-issues.ps1` | Idempotent init + seed from `docs/beads-workflow.md` |
| `docs/beads-workflow.md` | Prefix, starter issue table, beads vs chat todos |

Wire beads into onboarding: `/init` Phase 1 → `yarn beads:init` → Phase 4 issues pre-seeded.

## Safety

- Avoid deployment steps without approvals and rollback plans.
- Treat secrets and environment configuration changes as high risk.
- Never commit `.env` files; use `secret-guard` patterns from `scripts/pre-commit-checks.mjs`.

## References

- [`docs/agent-index.md`](../../docs/agent-index.md) — CI summary
- [`docs/buildkite-guide.md`](../../docs/buildkite-guide.md)
- [`scripts/pre-commit-checks.mjs`](../../scripts/pre-commit-checks.mjs)
