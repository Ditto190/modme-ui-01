---
description: Lightweight PR review after green preflight — boundaries, test coverage delta, checklist
on:
  pull_request:
    types: [synchronize, opened, reopened]
permissions:
  contents: read
  pull-requests: write
engine: copilot
tools:
  cli-proxy: true
  github:
    mode: gh-proxy
    toolsets: [default, pull_requests]
network:
  allowed:
    - defaults
safe-outputs:
  add-comment:
    max: 3
timeout-minutes: 15
---

# PR Preflight Review (ModMe)

Run when a PR is **synchronized** (new commits pushed). Verify preflight CI is **green** before posting a lightweight review checklist.

**Gate:** Prefer when `review:*` labels exist (agent-codeowners dispatch). Docs-only (`review:docs`) → keep checklist minimal. SaaS bots stay path-gated (`.coderabbit.yaml`, `cubic.yaml`). See `docs/devops/agent-review-routing.md`.

## Preconditions

- PR targets `dev` (or repo default integration branch)
- Latest `Preflight CI` check on the PR head SHA is `success`
- If preflight failed, **do not** post review — exit via `noop` (failure triage workflow handles red builds)

## Checklist to post

Post **one** comment (marker `<!-- pr-preflight-review -->`) with:

1. **Preflight status** — green on head SHA
2. **Stack scope** — `next-forge/`, `GenerativeUI_monorepo/`, or both (from changed files)
3. **Agent roles** — `review:*` labels / expected `modme/agent-*` checks
4. **Boundaries** — confirm no `workspace:*` across stacks, no forbidden relative imports
5. **Test delta** — note new/changed `*.test.*` / `*.spec.*` files; flag if production code changed without tests
6. **Suggested commands** before merge:
   - `yarn preflight:fast` (local)
   - `yarn quality:route --pr <N>` for optional bugbot review
   - Trunk `/trunk merge` only after `modme/agent-merge` green

## Review tone

- Concise checklist, not a full code review
- Link `docs/devops/quality-loop.md` and `.agents/skills/modme-preflight/SKILL.md`
- For large diffs (>400 lines), suggest `bugbot` readonly via quality orchestrator

## Constraints

- Read-only except `add-comment` safe-output
- No secrets in comments
- gh-aw compile on Windows: WSL or CI per ADR-0010

If preflight check pending or failed, `noop` with status summary.
