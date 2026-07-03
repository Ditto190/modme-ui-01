# Bugbot Review Rubric (ModMe)

Use this rubric for all PR/MR reviews. Flag findings as **BLOCKER**, **NON-BLOCKER**, or **SUGGESTION**.

See also: [copilot-code-review-generic.mdc](../rules/copilot-code-review-generic.mdc)

## Priority order

1. **BLOCKER** — Security, correctness, data loss, breaking API changes, monorepo boundary violations
2. **NON-BLOCKER** — Missing tests on critical paths, performance regressions, architecture drift
3. **SUGGESTION** — Readability, minor style, docs gaps

## Comment format

```markdown
**[PRIORITY] Category: Brief title**

What is wrong and where.

**Why this matters:** Impact on users, CI, or maintainability.

**Suggested fix:** (code or steps)

**Reference:** (doc link or file path)
```

## Stack-specific checks

### stack:forge (`next-forge/`)

- Bun/Turbo only — no Yarn install inside `next-forge/`
- Supabase: RLS on new tables; `getUser()` not `getSession()` on server
- Auth.js for `apps/app` — do not wire Supabase Auth middleware by default
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` naming for browser clients
- Feature flags: see [FEATURE-FLAGS.md](../../next-forge/packages/feature-flags/FEATURE-FLAGS.md)

### stack:generative (`GenerativeUI_monorepo/`)

- Yarn 3.3 only — no Bun inside GenerativeUI
- No `workspace:*` deps to `next-forge/`
- No relative imports across monorepo boundaries

### stack:orchestration (root scripts, `.cursor/`, beads, hooks)

- Feature work in worktrees under `Monorepo_ModMe-dev/`, not main checkout
- PRs target `dev`, not `main`
- beads prefix `modme`; link issue ID in PR body when multi-session

### stack:root (cross-cutting)

- No secrets in source or logs
- Conventional commits; hooks not skipped without explicit approval

## CI/CD findings

For pipeline failures, prefer `/principle-fix-root-causes` — trace to root cause, not symptom guards.

Required verify commands by stack:

| Stack | Command |
|-------|---------|
| forge | `yarn verify:forge` |
| generative | `yarn verify:generative` |
| both | both commands |
| orchestration | `yarn pre-commit:check` |
