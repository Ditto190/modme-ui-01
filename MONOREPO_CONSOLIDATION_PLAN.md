# Monorepo Consolidation Plan Before Devcontainer Migration

## Current State Analysis

### Repository Structure
```
📦 Two Separate GitHub Repositories + Git Worktrees
│
├─ 🟢 modme-ui-01 (ACTIVE PROJECT)
│  ├─ C:\Users\dylan\modme-ui-01 (main copy)
│  │  └─ feature/genui-workbench-refactor @ 50d3c83 ✓ CLEAN
│  │
│  └─ C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle (worktree)
│     └─ relaxed-hugle @ 6a37480 ⚠️ 6 COMMITS AHEAD + STAGED CHANGES
│
└─ 🔵 GenerativeUI_monorepo (SECONDARY PROJECT)
   ├─ C:\Users\dylan\Monorepo_ModMe\GenerativeUI_monorepo (main copy)
   │  └─ main @ 34d2d61 ✓ CLEAN
   │
   └─ C:\Users\dylan\.claude-worktrees\GenerativeUI_monorepo\ecstatic-montalcini (worktree)
      └─ ecstatic-montalcini @ 89f1669 ⚠️ UNTRACKED FILES
```

## Critical Issues to Resolve

### Issue 1: relaxed-hugle Worktree Has Uncommitted Work
**Status**: 6 commits ahead + staged changes + untracked files
**Impact**: Cannot safely move to devcontainer until committed
**Risk**: Work could be lost if worktree is deleted

**Staged Changes**:
- `.gitignore`
- `.vscode/tasks.json`
- `CLAUDE.md`
- `TOKEN_QUICK_REF.md`
- `scripts/TOKEN_MANAGEMENT.md`
- `scripts/audit-tokens.py`
- `scripts/toolset-management/README.md`
- `workspace.code-workspace`

**Untracked Files** (100+):
- `.claude/`, `.copilot/`, `.specify/` directories
- Documentation files (DEVCONTAINER_*.md)
- Test files and scripts
- Backup files (PATH_backup_*.txt)

### Issue 2: Which Branch is Primary?
**Questions**:
- Is `feature/genui-workbench-refactor` the main integration branch? ✅
- Or should `relaxed-hugle` be the new main?
- Should we push relaxed-hugle commits to GitHub for backup?

### Issue 3: GenerativeUI_monorepo Purpose
**Questions**:
- Is this a separate R&D project or related to modme-ui-01?
- Does ecstatic-montalcini have valuable work?
- Should both devcontainers coexist or focus on modme-ui-01?

## Recommended Consolidation Strategy

### Phase 1: Clarify Intent (5 min)
**For modme-ui-01**:
```
Decision Tree:
├─ Keep relaxed-hugle as active development?
│  ├─ YES → Commit changes, push branch, update main
│  └─ NO → Merge/rebase onto feature/genui-workbench-refactor
│
└─ What to do with committed work?
   ├─ Push to GitHub for visibility
   └─ Create PR against feature/genui-workbench-refactor
```

**For GenerativeUI_monorepo**:
```
Decision Tree:
├─ Is ecstatic-montalcini an active branch?
│  ├─ YES → Commit untracked files, decide on integration
│  └─ NO → Can retire this worktree
│
└─ Overall purpose of this repo?
   ├─ Keep separate devcontainer config
   └─ Or consolidate with modme-ui-01?
```

### Phase 2: Commit All Work (10-15 min)
**In relaxed-hugle**:
```bash
# Stage remaining changes
git add .

# Create comprehensive commit
git commit -m "docs: Add token management, devcontainer readiness docs, and toolset cleanup

- Add CLAUDE.md with comprehensive project documentation
- Add TOKEN_QUICK_REF.md and TOKEN_MANAGEMENT.md for API key handling
- Add audit-tokens.py for token usage tracking
- Update .gitignore for new directories and patterns
- Add workspace-level configuration updates
- Add devcontainer preflight and readiness checklists
- Add shell integration and MCP blocking server fixes
- Document devcontainer transition path

This work enables smooth migration to devcontainer-based development.

🤖 Generated with Claude Code"

# Push branch to GitHub for safety
git push origin relaxed-hugle
```

### Phase 3: Integrate Work (10-20 min)
**Choose One Path**:

#### Path A: Keep relaxed-hugle as Feature Branch
```bash
# In main copy (C:\Users\dylan\modme-ui-01)
git fetch origin
git checkout feature/genui-workbench-refactor
git pull origin

# Create PR preparation
git merge --no-ff origin/relaxed-hugle

# Push and create PR on GitHub
git push origin feature/genui-workbench-refactor
# → Create PR: "Integrate Agent Skills & Devcontainer Readiness"
```

#### Path B: Rebase relaxed-hugle onto Main Branch
```bash
# In worktree
git fetch origin
git rebase origin/feature/genui-workbench-refactor

# Force push (only if you own the branch)
git push --force-with-lease origin relaxed-hugle

# Then merge to main in main copy
git checkout feature/genui-workbench-refactor
git merge relaxed-hugle
git push origin feature/genui-workbench-refactor
```

### Phase 4: Clean Up Worktrees (2 min)

**If consolidating onto main branch**:
```bash
# In main copy (C:\Users\dylan\modme-ui-01)
git worktree remove C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle

# Prune local references
git fetch --prune
git branch --prune-for-worktree
```

**Optional: Keep Worktree for Parallel Work**:
```bash
# Update worktree reference
git worktree repair
# (No deletion - useful for feature branches)
```

### Phase 5: Set Up Devcontainer (5-10 min)
```bash
# In clean main copy
cd C:\Users\dylan\modme-ui-01

# Copy devcontainer config (or update if exists)
mkdir -p .devcontainer

# Update devcontainer.json with current setup
# Update Dockerfile with verified dependencies
# Run validation
npm run validate:devcontainer

# Test devcontainer
docker build -f .devcontainer/Dockerfile -t modme-ui-01-dev:latest .
```

## Recommended Decision: Keep Both Repos, Focus on modme-ui-01

### Why:
1. **modme-ui-01** is your primary project (6 commits of active work)
2. **GenerativeUI_monorepo** appears to be research/template (last update: 7 days ago)
3. Different GitHub repos = different devcontainer configs needed
4. No value in forcing consolidation if they serve different purposes

### Action Plan:
1. ✅ **Commit all work in relaxed-hugle** (mandatory)
2. ✅ **Push to GitHub** (safety + visibility)
3. ✅ **Decide: merge or keep as feature branch**
4. ⚠️ **Only then retire worktree** (if consolidating)
5. ✅ **Clean up untracked files** (or commit if valuable)
6. ✅ **Set up devcontainer for modme-ui-01** (primary)
7. ⚠️ **Optional: Set up devcontainer for GenerativeUI_monorepo** (secondary)

## Timeline

| Step | Est. Time | Blocking | Notes |
|------|-----------|----------|-------|
| Clarify decisions (you) | 5 min | ⏸️ WAIT | Decision point |
| Commit work | 5 min | ✅ | In relaxed-hugle |
| Push to GitHub | 2 min | ✅ | Safety backup |
| Merge/rebase | 10 min | ✅ | Integrate work |
| Retire worktree | 2 min | ✅ | Cleanup |
| Clean untracked files | 5 min | ✅ | Remove clutter |
| Setup devcontainer | 10 min | ✅ | Validation & test |
| **TOTAL** | **~40 min** | | Ready for containerization |

## Next Steps

**Answer these questions to proceed**:
1. Should `relaxed-hugle` commits be merged into `feature/genui-workbench-refactor`?
2. Is `GenerativeUI_monorepo` still active development or archived?
3. Do you want to keep worktrees for parallel feature development, or prefer single main copy?

