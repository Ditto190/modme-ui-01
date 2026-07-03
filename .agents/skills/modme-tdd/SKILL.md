---
name: modme-tdd
description: TDD red/green/refactor workflow for next-forge using preflight profiles and awesome-copilot TDD agents. Use when implementing features test-first or when an issue is labeled tdd.
---

# ModMe TDD Workflow

Test-first development for **next-forge** using manifest-driven preflight profiles and agent-library TDD agents.

## Phases

| Phase | Preflight | Agent | Goal |
|-------|-----------|-------|------|
| Red | `yarn preflight:tdd-red --test <path>` | `agent-library/agents/tdd-red.agent.md` | Failing test describes desired behavior |
| Green | `yarn preflight:tdd-green --test <path>` | `agent-library/agents/tdd-green.agent.md` | Minimal code to pass scoped test + lint |
| Refactor | `yarn preflight:tdd-refactor --test <path>` | `agent-library/agents/tdd-refactor.agent.md` | Full lint + scoped test + boundaries |

## Commands

```powershell
# Red — profile expects scoped test failure (passes when test fails)
node scripts/preflight.mjs --profile tdd-red --test next-forge/packages/database/skill-loader.test.ts --report

# Green — lint + scoped test must pass
yarn preflight:tdd-green --test next-forge/packages/database/skill-loader.test.ts

# Refactor — lint + test + turbo boundaries
yarn preflight:tdd-refactor --test next-forge/packages/database/skill-loader.test.ts
```

`--test` accepts a path relative to repo root. Profiles are defined in `scripts/preflight.manifest.json`.

## Agent instructions

| Agent | Path |
|-------|------|
| TDD Red | `agent-library/agents/tdd-red.agent.md` |
| TDD Green | `agent-library/agents/tdd-green.agent.md` |
| TDD Refactor | `agent-library/agents/tdd-refactor.agent.md` |

Collection index: `agent-library/collections/testing-automation.md`

### Red phase checklist

1. Read GitHub issue / branch context (`feature/*issue*`)
2. Write one failing test (vitest in next-forge or root `scripts/__tests__`)
3. Run `preflight:tdd-red --test <path>` — exits 0 when test fails for the right reason
4. Commit test only

### Green phase checklist

1. Implement minimal production code
2. `yarn preflight:tdd-green --test <path>` — must pass
3. No scope creep beyond the failing test

### Refactor phase checklist

1. Improve structure without changing behavior
2. `yarn preflight:tdd-refactor --test <path>`
3. Optional: `yarn quality:route` for `bugbot` readonly review

## GitHub issue bootstrap

Issues labeled `tdd` trigger `.github/workflows/tdd-issue-bootstrap.md` (gh-aw) which posts a red-phase checklist comment.

## Quality loop integration

After any phase, write report for orchestrator:

```powershell
yarn preflight:tdd-green --test <path> --report
yarn quality:route --from docs/devops/reports/preflight-latest.json
```

## Boundaries

- next-forge only via `scripts/lib/run-forge.mjs` / Bun — never merge GenerativeUI workspaces
- Feature work in Git worktrees per `docs/multi-agent-worktrees.md`

## Related

- `.agents/skills/modme-preflight/SKILL.md`
- `.agents/skills/modme-quality-orchestrator/SKILL.md`
- `docs/devops/quality-loop.md`
