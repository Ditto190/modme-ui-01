---
description: Weekly health check for agentic workflows — compilation, MCP config, and recent run failures
on:
  schedule: weekly
permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
engine: copilot
tools:
  cli-proxy: true
  github:
    mode: gh-proxy
    toolsets: [default, actions]
steps:
  - name: build-inventory
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: |
      set -euo pipefail
      mkdir -p /tmp/gh-aw/agent
      gh aw compile --validate > /tmp/gh-aw/agent/compile-validate.txt 2>&1 || true
      ls .github/workflows/*.md 2>/dev/null > /tmp/gh-aw/agent/workflow-list.txt || true
      gh run list --limit 30 --json conclusion,name,workflowName,displayTitle,createdAt,url \
        > /tmp/gh-aw/agent/recent-runs.json 2>/dev/null || echo '[]' > /tmp/gh-aw/agent/recent-runs.json
safe-outputs:
  create-issue:
    max: 5
    labels: ["workflow-health", "automation"]
  add-comment:
    max: 10
  update-issue:
    max: 3
timeout-minutes: 25
---

# Workflow Health (ModMe)

Read **`.github/aw/runbooks/workflow-health.md`** for investigation and remediation procedures.

## Pre-computed data (authoritative)

- `/tmp/gh-aw/agent/workflow-list.txt` — executable `.md` workflows (exclude `shared/`)
- `/tmp/gh-aw/agent/compile-validate.txt` — output of `gh aw compile --validate`
- `/tmp/gh-aw/agent/recent-runs.json` — last 30 workflow runs (all types)

Do **not** re-run full discovery or `gh aw compile --validate` unless a specific fix requires it.

## ModMe scope

- Agentic workflows: `.github/workflows/*.md` with matching `.lock.yml`
- Standard Actions YAML (e.g. `ci.yml`, `inbox-ingest.yml`) — note failures in the report but do not expect lock files
- Debug fixes: load `.github/aw/debug-agentic-workflow.md` when proposing configuration changes

## Output

Create or update **one** tracking issue titled `Workflow Health Dashboard` with:

- Compilation status per agentic workflow
- Missing `.lock.yml` files
- Failed runs from `recent-runs.json` in the past 7 days
- P0/P1 recommendations with links to the runbook sections

If everything is healthy, call `noop` with a one-line summary.
