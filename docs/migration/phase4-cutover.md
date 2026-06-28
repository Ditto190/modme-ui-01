# Phase 4 Cutover — GenerativeUI → next-forge

> Strangler migration final phase. Evidence: `.agents/skills/modme-generative-ui-migrate/SKILL.md`, `docs/agent-index.md`.

## Preconditions (must be green)

- [ ] `next-forge/apps/app/.../generative-ui/` feature-complete vs web-dashboard parity
- [ ] `@repo/schemas` golden JSON parity with agent-server pytest
- [ ] `yarn verify:forge` + `yarn verify:generative` pass on `dev`
- [ ] Feature flags documented in `next-forge/packages/feature-flags/FEATURE-FLAGS.md`

## Cutover steps

### 1. Enable next-forge as default UI

1. Set feature flag `generative-ui-next-forge=true` for internal users
2. Point `NEXT_PUBLIC_AGENT_SERVER_WS_URL` to agent-server (unchanged :8000)
3. Run smoke: app :3100 + agent-server :8000 + Supabase

### 2. Deprecate web-dashboard

1. Add deprecation banner in `GenerativeUI_monorepo/apps/web-dashboard`
2. Update `docs/agent-index.md` migration table → Phase 4 **Done**
3. Remove web-dashboard from required launch configs after one release cycle

### 3. CI / docs

1. Keep `generative-ui` CI job for agent-server + shared packages
2. Update `docs/codebase/STRUCTURE.md` entry points
3. Archive harness change: `node scripts/harness-change.mjs archive harness-setup-dual-monorepo`

### 4. Legacy root archive (`src/` + `agent/`)

**Do not delete until Phase 4 sign-off.**

| Step | Action |
|------|--------|
| A | Copy `src/` + `agent/` → `archive/legacy-genui-root/` (git tag `legacy-genui-root-v1`) |
| B | Add `README.md` in archive explaining supersession by next-forge + agent-server |
| C | Remove root `src/` + `agent/` from default dev docs (`AGENTS.md` already marks deprecated) |
| D | Add CI note: changes under `src/**`/`agent/**` trigger generative job only for maintenance |

### 5. Rollback

- Disable feature flag → users fall back to `yarn dev:generative` (web-dashboard :3001)
- agent-server unchanged — no rollback of Python stack required

## Verification checklist

```powershell
yarn lint:harness
yarn verify:all
yarn worktree:doctor
# Local E2E (not CI): next-forge playwright with full stack
```

## Evidence

- `docs/agent-index.md` (Migration status table)
- `harness/changes/active/harness-setup-dual-monorepo/CHANGE.md`
- `docs/codebase/CONCERNS.md` (Phase 4 section)
- `C4-Documentation/c4-component-generative-ui-hook.md`
