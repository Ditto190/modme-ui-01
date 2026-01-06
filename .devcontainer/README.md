# DevContainer Setup for ModMe GenUI (Multi-Worktree Mode)

> **Single devcontainer supporting parallel human + AI development across multiple git worktrees**

---

## Quick Start

### Option 1: Open Main Worktree in DevContainer

```bash
# From main worktree
cd C:\Users\dylan\modme-ui-01

# Open in VS Code
code .

# When prompted: Click "Reopen in Container"
# Or use Command Palette: Dev Containers: Reopen in Container

# Wait for devcontainer to build and post-create.sh to run
# Then start development:
npm run dev
```

### Option 2: Open Feature Worktree in DevContainer

```bash
# From feature worktree (e.g., relaxed-hugle)
cd C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle

# Open in VS Code
code .

# When prompted: Click "Reopen in Container"
# Same setup runs automatically - devcontainer is branch-agnostic!

npm run dev
```

---

## How It Works

### Single Configuration, Multiple Worktrees

```
.devcontainer/
├── devcontainer.json       (shared config)
├── post-create.sh          (shared setup script)
├── Dockerfile              (shared base image)
└── README.md               (this file)

Applied to any branch/worktree:
├─ C:\Users\dylan\modme-ui-01/                       ← main
├─ C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle/    ← feature 1
├─ (future) feature-universal-workbench/             ← feature 2
└─ (future) feature-turborepo-migration/             ← feature 3
```

Each worktree gets an **identical environment**:
- ✅ Same Node.js 22.9.0
- ✅ Same Python 3.12
- ✅ Same npm dependencies (fresh install)
- ✅ Same Python venv (fresh setup)
- ✅ Same ports forwarded (3000, 8000, 8001)

### Worktree Detection

The `post-create.sh` script automatically detects your current context:

```bash
# When you reopen in container, it prints:
# 🔍 Detecting git context...
#    ✓ Workspace: relaxed-hugle
#    ✓ Branch: relaxed-hugle
#    ✓ Commit: ff95b47
```

No configuration needed - just reopen and go!

---

## Workflow: Parallel Development

### Scenario: Human + AI Agent Working Simultaneously

**Setup**:
```bash
# Human: Main worktree (feature/genui-workbench-refactor)
cd C:\Users\dylan\modme-ui-01
code .
# → Reopen in Container → devcontainer builds → npm run dev starts

# AI Agent: Feature worktree (feature/universal-workbench-integration)
cd C:\Users\dylan\.claude-worktrees\modme-ui-01\universal-workbench
code .
# → Reopen in Container → same devcontainer setup runs → npm run dev starts
```

**Result**:
- Two VS Code windows open
- Each with its own devcontainer
- Working on different branches simultaneously
- No conflicts (git worktrees isolate file changes)

---

## Creating New Worktrees

### For Claude Code Agent Sessions

When Claude Code needs to work on a feature:

```bash
# From main repo
cd C:\Users\dylan\modme-ui-01

# Create isolated worktree for feature
git worktree add ../<feature-name> -b feature/<feature-name>

# Navigate to new worktree
cd ../<feature-name>

# Open in VS Code
code .

# Reopen in Container (same devcontainer setup)
```

### Example: Creating UniversalWorkbench Integration Worktree

```bash
# In main worktree
git worktree add ../feature-universal-workbench -b feature/universal-workbench-integration

# Navigate and open
cd ../feature-universal-workbench
code .

# Reopen in Container → devcontainer automatically detects and sets up
# → Ready to work!
```

### Example: Creating Turborepo Migration Worktree

```bash
git worktree add ../feature-turborepo-migration -b feature/turborepo-migration
cd ../feature-turborepo-migration
code .

# Reopen in Container → same automatic setup
```

---

## Managing Multiple Worktrees

### List All Worktrees

```bash
git worktree list

# Output:
# C:\Users\dylan\modme-ui-01              50d3c83 [feature/genui-workbench-refactor]
# C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle  ff95b47 [relaxed-hugle]
```

### Clean Up After Feature is Merged

```bash
# After feature is merged back to main
git worktree remove C:\Users\dylan\.claude-worktrees\modme-ui-01\feature-universal-workbench

# Optionally prune remote-tracking branches
git fetch --prune
```

### Repair Orphaned Worktrees (if devcontainer crashes)

```bash
# If a worktree becomes orphaned
git worktree repair

# Then remove if needed
git worktree remove <path>
```

---

## Troubleshooting

### Port Already in Use

If ports 3000, 8000, or 8001 are already in use:

```bash
# Option 1: Stop the other dev server
npm run dev  # This should automatically find next available ports

# Option 2: Check what's running
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### DevContainer Build Fails

```bash
# Rebuild from scratch
Dev Containers: Rebuild Container

# Or manually
docker system prune  # Remove unused images
# Then reopen in container
```

### Python Dependencies Not Installing

```bash
# Check if Python is found
python3 --version

# Manually install in container terminal
cd agent
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

---

## Best Practices

### 1. Commit Work Before Closing DevContainer

```bash
# Before closing VS Code
git add .
git commit -m "..."
git push origin <branch>

# Then safe to remove worktree
git worktree remove ../<feature-name>
```

### 2. Use Descriptive Commit Messages

```bash
git commit -m "feat: Universal Workbench integration

- Port components from GenerativeUI_monorepo
- Update component registry

Work developed in feature/universal-workbench-integration worktree.
Ready for human review.

🤖 Generated with Claude Code"
```

### 3. Keep Main Worktree Clean

- Main worktree = source of truth for remotes
- Use feature worktrees for experimental work
- Don't delete main worktree!

---

## Quick Reference

```bash
# Start development
npm run dev                    # UI + Agent
npm run dev:ui                 # Next.js only
npm run dev:agent              # Python ADK only

# Git worktrees
git worktree list              # Show all worktrees
git worktree add PATH -b BRANCH # Create new worktree
git worktree remove PATH        # Remove worktree

# Code quality
npm run lint                   # Check issues
npm run lint:fix               # Fix automatically
npm run format                 # Format code
```

---

## Documentation

- **[DEVCONTAINER_WORKTREE_STRATEGY.md](../DEVCONTAINER_WORKTREE_STRATEGY.md)** - Full implementation guide
- **[MIGRATION_IMPLEMENTATION_PLAN.md](../MIGRATION_IMPLEMENTATION_PLAN.md)** - Turborepo roadmap
- **[PORTING_GUIDE.md](../PORTING_GUIDE.md)** - Component portability
- **[CLAUDE.md](../CLAUDE.md)** - Project conventions

---

**Status**: ✅ Production Ready  
**Last Updated**: January 7, 2026
