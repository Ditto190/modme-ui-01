---
name: "DevOps Autofix"
description: "Autonomous CI fix lane (Duo Fix CI/CD Flow)"
labels:
  - ci-cd
  - devops-autofix
  - needs-triage
  - agent:devops
---

## GitHub system-of-record

**github_sor:** https://github.com/Ditto190/modme-ui-01/issues/NNN

## Stack

stack:forge | stack:generative | stack:orchestration | stack:root

## Failure details

| Field | Value |
|-------|-------|
| Pipeline | |
| Failing job | |
| Beads ID | modme- |

## Error log excerpt

```
(paste)
```

## Verify commands (must pass before close)

```bash
yarn verify:forge
# or yarn verify:generative
# or yarn pre-commit:check
```

## Autonomous fix

**self_heal:** Yes

Max 2 agent rounds — then `status:agent-escalated` on GitHub SoR.

Duo: **Fix CI/CD Pipeline Flow** (requires Premium/Ultimate).
