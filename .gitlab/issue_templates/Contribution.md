---
name: "Contribution"
description: "Contributor workflow for ModMe dual-monorepo"
labels:
  - documentation
---

## GitHub system-of-record

PRs and issues: https://github.com/Ditto190/modme-ui-01

## Worktree workflow

1. `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner cursor`
2. Work in `../Monorepo_ModMe-dev/...`
3. PR target branch: **dev**

## Verify before MR/PR

```powershell
yarn verify:forge        # next-forge/**
yarn verify:generative   # GenerativeUI_monorepo/**
yarn pre-commit:check
```

## Full guide

[CONTRIBUTION.md](https://github.com/Ditto190/modme-ui-01/blob/dev/.cursor/bugbot/CONTRIBUTION.md)
