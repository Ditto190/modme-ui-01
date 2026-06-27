# Worktree smoke (E2E stub)

Minimal end-to-end checks for the **Agent Terminal Orchestration Layer**. Intended for CI and local pre-PR validation.

## Local run

From repo root (main or worktree):

```powershell
yarn e2e:worktree-smoke
```

Or step-by-step:
node scripts/generate-mprocs-config.mjs

# 2. Agent status JSON (doctor may warn on main checkout)
node scripts/agent-status.mjs --json

# 3. Path filter unit smoke
node -e "import { classifyChangedStacks } from './scripts/lib/path-filter.mjs'; console.log(classifyChangedStacks(['next-forge/apps/app/page.tsx']));"

# 4. Task registry round-trip
node scripts/lib/agent-task-registry-check.mjs --title "smoke test task" --session-id "00000000-0000-0000-0000-000000000001" --force
node scripts/lib/agent-task-registry-close.mjs --session-id "00000000-0000-0000-0000-000000000001"

# 5. Pre-commit checks (staged-aware; no staged files = fast pass)
yarn pre-commit:check
```

## Worktree-specific

```powershell
cd ..\Monorepo_ModMe-dev\dev-agent-cursor-<task>
yarn worktree:doctor -Json
yarn agent:status --json
```

## Playwright (optional future)

A full browser smoke against `FORGE_APP_PORT` / `VIBE_WEB_PORT` is not required for orchestration CI. Add Playwright under `e2e/worktree-smoke/` when forge app routes stabilize.

## CI

See `.github/workflows/ci.yml` job `worktree-smoke` (paths-filtered, `continue-on-error: true`).

## Related

- [`docs/agent-terminal-orchestration.md`](../../docs/agent-terminal-orchestration.md)
- [`docs/multi-agent-worktrees.md`](../../docs/multi-agent-worktrees.md)
