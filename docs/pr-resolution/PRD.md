# PR Resolution — PRD

## Problem statement

ModMe has 27 open PRs: 4 active `dev`-targeting PRs with unresolved AI review comments, and 23 stale `main`-targeting PRs violating merge policy. Manual triage does not scale across dual-monorepo stacks and multi-agent review bots.

**Falsifiable success:** Within 7 days, all P0 PRs (#88–#91) are merged to `dev` or have an open beads escalation with documented blockers; P1 stale PRs have a classified action (merge/retarget/close) recorded in the latest `[PR Triage]` issue.

## Personas

| Persona | Need |
|---------|------|
| Cursor agent | Prioritized comment list + merge gates |
| Maintainer | Daily triage issue with recommendations only |
| CI | Changelog + compatibility gates on merge path |

## Jobs to be done

1. Fetch review queue and aggregate bot comments by severity.
2. Run compatibility scan on changed stacks before merge.
3. Fix or escalate blockers; merge when gates pass.
4. Retarget or close stale `main` PRs in batch.

## Non-goals

- Auto-merge on first triage run (recommendation mode first).
- Trigger.dev cloud deployment (patterns only).
- Monte Carlo alert triage (GitHub PR triage instead).
- Merging to `main` directly.

## Metrics

| Leading | Lagging |
|---------|---------|
| `yarn pr:triage` runs per week | P0 PRs merged or escalated |
| High-severity comments resolved within 48h | Stale main PR count ↓ |
| Compatibility score recorded per merge | Changelog validator pass rate |
