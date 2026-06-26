---
name: modme-quality-orchestrator
description: 'Route preflight CI failures and PR checks to Cursor subagents or WSL tmux agent-manager. Use when preflight fails, CI is red, or you need agent dispatch for unit-test, lint, build, env, or TDD workflows.'
---

# ModMe quality orchestrator

Hybrid dispatcher: reads **preflight report JSON** or **PR checks**, maps `failureClass` to agents.

Manifest: `scripts/quality-orchestrator.manifest.json`  
CLI: `scripts/quality-orchestrator.mjs`

## When to use

- After `yarn preflight --report` fails locally
- When Preflight CI artifact shows failures
- To choose Cursor subagents vs tmux WSL parallel runs
- Post-green PR with large diff → optional `bugbot` review

## Commands

```powershell
yarn quality:route --from docs/devops/reports/preflight-latest.json
yarn quality:route --pr 123 --runtime cursor
yarn quality:route --pr 123 --runtime tmux --dry-run   # WSL only
yarn quality:route --from docs/devops/reports/preflight-latest.json --pr 123 --apply-labels
yarn quality:route --json
```

## Routing table

| failureClass | Cursor (default) | tmux WSL |
|--------------|------------------|----------|
| `unit-test` | pr-test-analyzer + silent-failure-hunter | EMP_CI |
| `lint` | modme-preflight → yarn fix:forge | EMP_CI |
| `build` | ci-investigator | EMP_CI |
| `env` | modme-dev-setup skill | n/a |
| `guard` | modme-preflight | n/a |
| green pass | bugbot (optional) | EMP_REVIEW |

## Workflow

1. Run preflight with report: `yarn preflight:fast --report`
2. Route: `yarn quality:route --from docs/devops/reports/preflight-latest.json`
3. Follow printed Cursor prompt (agents + follow-up commands)
4. Re-run preflight until green
5. Optional labels: `--apply-labels` with `--pr`

## Labels

`scripts/apply-preflight-labels.mjs` / `scripts/lib/preflight-labels.mjs`:
- `ci:passed|ci:failed`, `failure:*`, `stack:forge|stack:generative`, `needs-triage`

## Skills roster

Install Tier B: `scripts/quality-skills-roster.json`  
Tier A (modme-preflight, modme-tdd, ci-watcher) already in repo.

## Gotchas

- **tmux runtime** requires WSL + vendored agent-manager under `.tools/agent-manager/`
- **gh-aw compile** on native Windows hangs — use WSL or CI (ADR-0010)
- Never cross-merge `next-forge/` and `GenerativeUI_monorepo/`

Related: `.agents/skills/modme-preflight/SKILL.md`, `.agents/skills/modme-tdd/SKILL.md`, `docs/devops/quality-loop.md`
