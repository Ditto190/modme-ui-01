---
description: Triage preflight CI failures — read artifact report, post PR comment with root cause and suggested fix
on:
  workflow_run:
    workflows: ["Preflight CI"]
    types: [completed]
permissions:
  contents: read
  pull-requests: write
  issues: write
  actions: read
engine: copilot
tools:
  cli-proxy: true
  github:
    mode: gh-proxy
    toolsets: [default, actions]
network:
  allowed:
    - defaults
safe-outputs:
  add-comment:
    max: 5
  add-labels:
    max: 10
timeout-minutes: 20
---

# Preflight Failure Triage (ModMe)

Triggered when **Preflight CI** (`preflight-ci.yml`) completes with **failure**. Download the `preflight-report` artifact and triage for the associated PR.

## Preconditions

- Workflow run conclusion is `failure`
- Artifact name: `preflight-report` (contains `preflight-latest.json` or equivalent JSON)
- Engine: `copilot` — repo secret `COPILOT_GITHUB_TOKEN` per ADR-0010

## Steps

1. Download artifact from the failed `workflow_run` using GitHub API / `gh` (do not re-run full preflight locally unless artifact missing).
2. Parse JSON per `docs/devops/preflight-report.schema.json`.
3. Identify PR from branch name on the workflow run head commit.
4. Post **one** PR comment (marker `<!-- preflight-failure-triage -->`) with:
   - Failed steps (`id`, `title`, `failureClass`, `logExcerpt`)
   - Root cause summary (1–3 sentences)
   - Suggested fix commands (e.g. `yarn fix:forge`, `yarn preflight:fast`, env setup skill)
   - Link to `docs/devops/quality-loop.md`
5. Apply labels via safe-output `add-labels` matching `scripts/apply-preflight-labels.mjs`:
   - `ci:failed`, `needs-triage`, `failure:*`, `stack:*`
6. If no PR exists, open or update an issue with the same summary.

## Routing hints (for humans / follow-up orchestrator)

| failureClass | Suggested agent |
|--------------|-----------------|
| `unit-test` | pr-test-analyzer, silent-failure-hunter |
| `lint` | yarn fix:forge, modme-preflight |
| `build` / `boundary` | ci-investigator |
| `env` | modme-dev-setup skill |

Local dispatch: `yarn quality:route --from <report> --pr <N>`

## Constraints

- Read-only on repo contents except safe-outputs
- Do not paste secret values from logs
- Dual monorepo: route forge vs GenerativeUI fixes separately — no cross-stack deps
- Windows contributors: gh-aw compile in WSL or CI only

If artifact is missing or run succeeded, call `noop` with one-line summary.
