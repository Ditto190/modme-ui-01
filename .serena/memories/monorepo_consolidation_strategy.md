# Monorepo Consolidation & Cleanup Strategy

## Current Repository Landscape

### Repository 1: modme-ui-01
**Remote**: https://github.com/ditto190/modme-ui-01.git
**Locations**:
1. **Main**: C:\Users\dylan\modme-ui-01
   - Branch: feature/genui-workbench-refactor
   - Commit: 50d3c83 (Merge PR #9)
   - Status: CLEAN (no uncommitted changes)

2. **Worktree**: C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle
   - Branch: relaxed-hugle
   - Commit: 6a37480 (Agent Skills system)
   - **6 commits ahead** of main branch
   - Status: HAS CHANGES (staged + untracked files)
   - **THIS IS THE ACTIVE DEVELOPMENT ENVIRONMENT**

### Repository 2: GenerativeUI_monorepo
**Remote**: https://github.com/Ditto190/GenerativeUI_monorepo.git
**Locations**:
1. **Main**: C:\Users\dylan\Monorepo_ModMe\GenerativeUI_monorepo
   - Branch: main
   - Commit: 34d2d61
   - Status: CLEAN

2. **Worktree**: C:\Users\dylan\.claude-worktrees\GenerativeUI_monorepo\ecstatic-montalcini
   - Branch: ecstatic-montalcini
   - Commit: 89f1669 (Merged PR #1)
   - Status: HAS UNTRACKED FILES (CLAUDE.md, .claude/)

## Key Issues Before Devcontainer Migration

1. **Diverged Work**: relaxed-hugle is 6 commits ahead and needs integration
2. **Multiple Locations**: Confusion about primary development environment
3. **Untracked Changes**: Need to decide if changes are valuable or cleanup
4. **Separate Repos**: Two completely different projects need separate devcontainer configs
5. **Incomplete Commits**: Changes in relaxed-hugle are staged but not committed

## Decision Points

### modme-ui-01
- **Is relaxed-hugle the new mainline?** If yes, should merge or rebase onto feature/genui-workbench-refactor
- **Keep main copy (C:\Users\dylan\modme-ui-01)?** Yes, as source of truth for CI/remote
- **Retire worktree?** Only after consolidating changes

### GenerativeUI_monorepo
- **Is ecstatic-montalcini being developed?** Check untracked files
- **Keep main copy?** Yes, for CI/remote
- **Purpose of this repo?** Is it related to modme-ui-01 or separate project?

## Devcontainer Implications

Both repos need their own devcontainer configs since they're separate GitHub projects with different dependencies and purposes.
