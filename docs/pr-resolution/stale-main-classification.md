# Stale main-targeting PR classification

**Generated:** 2026-07-05  
**Source:** `yarn pr:classify --base main`

## Summary

| Action | Count | PRs |
|--------|-------|-----|
| `retarget_dev` | 7 | #68, #72, #74, #76, #79, #80, #81 |
| `escalate_before_close` | 16 | #27–#35, #37, #38, #50, #55, #56, #59, #61, #62, #65, #67 |

## Retarget to `dev` (CI green, recent)

These PRs target `main` but have green AI/CI signals. Recommended: `gh pr edit <n> --base dev`, rebase, re-run checks.

| PR | Title |
|----|-------|
| [#81](https://github.com/Ditto190/modme-ui-01/pull/81) | Cursor/ignore skills |
| [#80](https://github.com/Ditto190/modme-ui-01/pull/80) | Supabase architecture |
| [#79](https://github.com/Ditto190/modme-ui-01/pull/79) | Ignore rules, lspmux |
| [#76](https://github.com/Ditto190/modme-ui-01/pull/76) | Agent index, beads CI |
| [#74](https://github.com/Ditto190/modme-ui-01/pull/74) | Cursor plugins |
| [#72](https://github.com/Ditto190/modme-ui-01/pull/72) | GenUI registry checklist |
| [#68](https://github.com/Ditto190/modme-ui-01/pull/68) | GenUI dashboard extension |

## Escalate before close

Stale (>60d), failing CI, and/or commits not on `dev`. Review unique commits before close.

| PR | Age | Notes |
|----|-----|-------|
| [#35](https://github.com/Ditto190/modme-ui-01/pull/35) | 146d | 103 commits not on dev — **do not mass-close** |
| [#32](https://github.com/Ditto190/modme-ui-01/pull/32) | 163d | CI failing |
| [#56](https://github.com/Ditto190/modme-ui-01/pull/56), [#55](https://github.com/Ditto190/modme-ui-01/pull/55), [#50](https://github.com/Ditto190/modme-ui-01/pull/50) | 94–108d | Dependabot, CI red |
| [#27–#30](https://github.com/Ditto190/modme-ui-01/pull/27) | 170d | Copilot-era PRs, likely superseded |

## Next steps

1. Retarget batch (#68–#81) in recommendation mode; confirm with maintainer.
2. For dependabot stale PRs: close and open fresh bumps against `dev`.
3. Full triage issue: `docs/pr-resolution/reports/triage-2026-07-05.md`
