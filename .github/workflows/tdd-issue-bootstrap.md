---
description: Bootstrap TDD red-phase checklist when an issue is labeled tdd
on:
  issues:
    types: [labeled]
permissions:
  contents: read
  issues: write
engine: copilot
tools:
  github:
    mode: gh-proxy
    toolsets: [default, issues]
network:
  allowed:
    - defaults
safe-outputs:
  add-comment:
    max: 2
timeout-minutes: 10
---

# TDD Issue Bootstrap (ModMe)

When label **`tdd`** is added to an issue, post a red-phase checklist comment linking TDD agents and preflight commands.

## Trigger filter

- Only act when the added label is exactly `tdd`
- Skip if a bot comment with marker `<!-- tdd-issue-bootstrap -->` already exists

## Comment body

Include:

1. Link to `.agents/skills/modme-tdd/SKILL.md`
2. Agent paths:
   - `agent-library/agents/tdd-red.agent.md`
   - `agent-library/agents/tdd-green.agent.md`
   - `agent-library/agents/tdd-refactor.agent.md`
3. Commands (replace `<test-path>` with issue-specific path once known):

```text
yarn preflight:tdd-red --test <test-path>
yarn preflight:tdd-green --test <test-path>
yarn preflight:tdd-refactor --test <test-path>
```

4. Reminder: feature work in Git worktree, PRs target `dev`
5. Quality loop: `docs/devops/quality-loop.md`

## Constraints

- Issue comment only — no code changes
- ADR-0010: copilot engine, no PAT in logs

If label is not `tdd`, `noop`.
