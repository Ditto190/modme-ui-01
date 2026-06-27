---
name: "CI/CD Failure"
description: "Pipeline or pre-push failure (GitHub SoR link required)"
labels:
  - ci-cd
  - needs-triage
---

## GitHub system-of-record

**github_sor:** https://github.com/Ditto190/modme-ui-01/issues/NNN

## Stack

- [ ] stack:forge
- [ ] stack:generative
- [ ] stack:orchestration
- [ ] stack:root

## Pipeline

| Field | Value |
|-------|-------|
| Pipeline | |
| Failing job | |
| Beads ID | modme- |

## Error log excerpt

```
(paste)
```

## Self-heal

- [ ] Yes — route to devops-ci-champion
- [ ] No

See [.cursor/bugbot/DEVOPS-AUTOFIX.md](https://github.com/Ditto190/modme-ui-01/blob/dev/.cursor/bugbot/DEVOPS-AUTOFIX.md).
