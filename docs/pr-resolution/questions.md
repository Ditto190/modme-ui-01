# PR Resolution — Clarifying Questions

**Classification:** T2 · S3 — orchestration pipeline for dual-monorepo PR backlog.

## Who and pain

1. **Merge authority:** Who may squash-merge to `dev` without human review when AI checks are green and high-severity comments are resolved?
   - **Assumption:** Cursor agents may merge docs-only and script-fix PRs; feature PRs require human ack on first triage run.

2. **Dependabot policy:** Close stale dependabot PRs targeting `main` and re-open bumps against `dev`, or leave open for manual cherry-pick?
   - **Assumption:** Close + document in triage issue; fresh bumps on `dev` only.

## Scope and wedge

3. **Compatibility floor:** Minimum `agent-compatibility` score before merge?
   - **Assumption:** ≥ 60; override via beads issue with `compat-override` label.

4. **Stale PR age:** Days before auto-close recommendation for wrong-base PRs with failing CI?
   - **Assumption:** 60 days + superseded on `dev`.

5. **P0 scope:** Process #88–#91 before any main-targeting PR?
   - **Answer:** Yes (confirmed in plan).

## Constraints and goals

6. **Auto-merge:** Enable in triage workflow after N successful recommendation runs?
   - **Assumption:** N = 2; recommendation mode until validated.

7. **Changelog:** Require `[Unreleased]` update for every merged PR touching monitored paths?
   - **Assumption:** Yes — enforced by `validate-changelog.mjs --require-update`.

8. **Escalation channel:** Beads issues vs GitHub issues for blocked merges?
   - **Assumption:** Beads for agent work; GitHub `[PR Triage]` issue for daily summary.
