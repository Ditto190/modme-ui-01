# DevContainer Worktree Strategy

> **How multiple git worktrees share a single DevContainer configuration**

**Date**: 2026-01-07  
**Repository**: modme-ui-01  
**Status**: Active

---

## Overview

This repository supports **multiple concurrent git worktrees** that all share the same `.devcontainer/` configuration. This enables:

- **Parallel development**: Human and AI agents can work on different branches simultaneously
- **Isolated file systems**: Each worktree has its own working directory
- **Shared tooling**: All worktrees use the same DevContainer, Node.js, Python, and extensions
- **Clean git history**: Separate branches per feature/agent, easy merges

---

## Current Worktrees

| Worktree          | Branch                             | Path                                                         | Purpose                    |
| ----------------- | ---------------------------------- | ------------------------------------------------------------ | -------------------------- |
| **main**          | `feature/genui-workbench-refactor` | `C:\Users\dylan\modme-ui-01`                                 | Primary development        |
| **relaxed-hugle** | `relaxed-hugle`                    | `C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle` | Claude Code AI development |

---

## How It Works

### 1. DevContainer Configuration

The `.devcontainer/devcontainer.json` mounts the **worktree root**, not a specific path. When you open any worktree in VS Code and click "Reopen in Container", the DevContainer:

1. Builds from the same `Dockerfile`
2. Runs the same `post-create.sh`
3. Installs the same extensions
4. Forwards the same ports (3000, 8000, 8001)

### 2. Worktree Detection in post-create.sh

The `post-create.sh` script automatically detects if it's running in a worktree:

```bash
# Detect if running in a worktree
if [ -f ".git" ]; then
    echo "[post-create] Running in git worktree"
    WORKTREE_MODE=true
else
    WORKTREE_MODE=false
fi
```

### 3. Shared vs Isolated Resources

| Resource              | Shared? | Notes                                             |
| --------------------- | ------- | ------------------------------------------------- |
| **Dockerfile**        | ✅ Yes  | Same container image                              |
| **devcontainer.json** | ✅ Yes  | Same extensions, ports, settings                  |
| **post-create.sh**    | ✅ Yes  | Same setup script                                 |
| **node_modules/**     | ❌ No   | Each worktree has its own                         |
| **agent/.venv/**      | ❌ No   | Each worktree has its own Python venv             |
| **.env**              | ❌ No   | Each worktree can have different env vars         |
| **Source code**       | ❌ No   | Each worktree has its own files (branch-specific) |

---

## Creating a New Worktree

### From Command Line

```bash
# Navigate to main repo
cd C:\Users\dylan\modme-ui-01

# Create worktree for a new feature
git worktree add ../my-feature-worktree -b feature/my-new-feature

# Or create worktree tracking existing remote branch
git worktree add ../existing-branch origin/some-branch

# List all worktrees
git worktree list
```

### From VS Code

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `Git: Create Worktree...`
3. Choose branch name and location
4. Open the new worktree folder
5. Click "Reopen in Container"

---

## Opening a Worktree in DevContainer

1. **Open the worktree folder** in VS Code:

   ```bash
   code C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle
   ```

2. **Click "Reopen in Container"** when prompted (or use Command Palette)

3. **Wait for build** (uses cached layers from other worktrees)

4. **Run development server**:

   ```bash
   npm run dev
   ```

Each worktree runs in its own container instance but with identical configuration.

---

## Best Practices

### 1. Naming Convention

Use descriptive names for worktrees:

```bash
# Good - descriptive
git worktree add ../feature-semantic-router -b feature/semantic-router

# Good - AI agent identifier
git worktree add ../claude-task-123 -b claude/task-123

# Avoid - unclear
git worktree add ../temp -b temp
```

### 2. Cleanup Old Worktrees

```bash
# Remove a worktree (keeps branch)
git worktree remove ../old-worktree

# Prune stale worktree references
git worktree prune

# Delete branch after merge
git branch -d feature/completed-feature
```

### 3. Avoid Port Conflicts

If running multiple worktrees simultaneously, modify `.env` in each:

```bash
# Worktree 1: .env
PORT=3000
AGENT_PORT=8000

# Worktree 2: .env
PORT=3001
AGENT_PORT=8001
```

### 4. Share Work Between Worktrees

```bash
# In worktree A: commit and push
git add .
git commit -m "feat: add new component"
git push origin my-branch

# In worktree B: pull changes
git fetch origin
git merge origin/my-branch
```

---

## Troubleshooting

### Issue: "Folder is locked" when creating worktree

**Cause**: Another process has the worktree folder open.

**Fix**: Close VS Code windows for that folder, then retry.

### Issue: DevContainer won't start in worktree

**Cause**: `.devcontainer/` may not be in the worktree if it was added after worktree creation.

**Fix**:

```bash
cd /path/to/worktree
git fetch origin
git merge origin/main  # Get latest .devcontainer/
```

### Issue: Different Node/Python versions across worktrees

**Cause**: Each DevContainer instance is independent.

**Fix**: All worktrees share the same `Dockerfile`, so rebuild the container:

```
Command Palette → "Rebuild Container"
```

### Issue: Merge conflicts between worktrees

**Cause**: Same files edited in multiple branches.

**Fix**: Standard git merge conflict resolution:

```bash
git checkout main
git merge feature-branch
# Resolve conflicts
git add .
git commit
```

---

## Integration with Claude Code Worktrees

Claude Code automatically creates worktrees in:

```
C:\Users\<user>\.claude-worktrees\<repo>\<worktree-name>\
```

These worktrees follow the same pattern and share the DevContainer config.

**Workflow**:

1. Claude Code creates worktree with unique branch
2. AI develops features in isolated branch
3. Human reviews via PR
4. Merge to main when ready
5. Prune worktree after merge

---

## Related Documentation

- [.devcontainer/README.md](.devcontainer/README.md) - DevContainer reference
- [.devcontainer/QUICKSTART.md](.devcontainer/QUICKSTART.md) - Quick setup guide
- [DEVCONTAINER_PREFLIGHT.md](DEVCONTAINER_PREFLIGHT.md) - Pre-transition checklist
- [MIGRATION_IMPLEMENTATION_PLAN.md](MIGRATION_IMPLEMENTATION_PLAN.md) - Full migration roadmap
- [PORTING_GUIDE.md](PORTING_GUIDE.md) - Component porting guide

---

## Summary

| Capability            | Status                    |
| --------------------- | ------------------------- |
| Multiple worktrees    | ✅ Supported              |
| Shared DevContainer   | ✅ Configured             |
| Isolated dependencies | ✅ Per-worktree           |
| Port customization    | ✅ Via .env               |
| AI agent worktrees    | ✅ Claude Code compatible |

**Key Insight**: Git worktrees + shared DevContainer = parallel, isolated development with consistent tooling.
