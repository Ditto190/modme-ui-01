# PR Resolution — Research

**Date:** 2026-07-05  
**Repo:** [Ditto190/modme-ui-01](https://github.com/Ditto190/modme-ui-01)

## PR inventory

| Tier | PRs | Base | AI review | Inline comments | CI |
|------|-----|------|-----------|-----------------|-----|
| P0 | [#91](https://github.com/Ditto190/modme-ui-01/pull/91) speckit gates | `dev` | Green | 16+ (high: PS null-safe, CHANGELOG dup) | Green |
| P0 | [#90](https://github.com/Ditto190/modme-ui-01/pull/90) thermo Round 2 | `dev` | Green | Medium: manifest counts, archive 404s | Green |
| P0 | [#89](https://github.com/Ditto190/modme-ui-01/pull/89) chat suggestion | `dev` | Green | Low | Green |
| P0 | [#88](https://github.com/Ditto190/modme-ui-01/pull/88) thermo baseline | `dev` | Green | Low | Green |
| P1 | #27–#81 (23 PRs) | `main` | Mixed | Stale | Many dependabot CI failures (Apr 2026) |

## Comment themes (P0)

- **Null-safe PowerShell:** `.Trim()` on potentially `$null` git output (`install-git-hooks.ps1`, `repo-alignment-doctor.ps1`).
- **CHANGELOG hygiene:** Duplicated bullet text in `[Unreleased]`.
- **Docs accuracy:** ECL archive links 404; manifest finding counts mismatch report body.

## Infrastructure gaps (pre-implementation)

| Gap | Status |
|-----|--------|
| `gh-review-requests` script | Missing — personal repo mode needed |
| `get-pr-comments` automation | Missing — now `scripts/pr-triage/aggregate-pr-comments.mjs` |
| `update-changelog.js` | Missing — now `scripts/update-changelog.mjs` |
| Trigger.dev | Not adopted — GitHub Actions + yarn scripts instead |
| `issue-context-mapper` wired to triage | Pending — pr-triage-orchestrator workflow |

## Wrong-base count

23 open PRs target `main`; repo policy requires PRs to `dev` ([AGENTS.md](../../AGENTS.md), [multi-agent-worktrees.md](../multi-agent-worktrees.md)).

## Sources

- Live `gh pr list` 2026-07-05
- Plan: PR Triage Pipeline (idea-os Phase 0)
