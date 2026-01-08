# DevContainer + Git Worktree Strategy for modme-ui-01

> **How to set up devcontainer for parallel human/AI development with git worktrees**

**Status**: Ready for Implementation
**Timeline**: Immediate (blocks devcontainer migration)
**References**: MIGRATION_IMPLEMENTATION_PLAN.md, PORTING_GUIDE.md

---

## 🎯 Your Vision Decoded

You've created a **sophisticated development workflow**:

### Current State

```
modme-ui-01 (GitHub Repo)
├── Main worktree: C:\Users\dylan\modme-ui-01
│   └── branch: feature/genui-workbench-refactor
│   └── status: CLEAN
│
└── AI worktree: C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle
    └── branch: relaxed-hugle
    └── status: 6 commits ahead + uncommitted work
    └── purpose: Claude Code feature development
```

### Future State (Your Intent)

```
modme-ui-01 (GitHub Repo) + ONE Devcontainer
├── Main worktree: C:\Users\dylan\modme-ui-01
│   └── feature/genui-workbench-refactor (human lead)
│
├── AI Worktree #1: relaxed-hugle
│   └── Claude Code autonomous development
│
├── AI Worktree #2: feature/universal-workbench-integration
│   └── Another Claude Code agent integrating UniversalWorkbench
│
├── AI Worktree #3: feature/turborepo-migration
│   └── Yet another agent handling Turborepo monorepo migration
│
└── .devcontainer/ (shared)
    └── Works for ANY checked-out branch/worktree
```

**This is a true monorepo + worktree workflow** supporting parallel development streams.

---

## 📋 Immediate Issues Before Devcontainer

### Issue 1: relaxed-hugle Has Uncommitted Work (BLOCKING)

**Status**: 6 commits ahead + staged changes + 100+ untracked files
**Impact**: Cannot reliably set up devcontainer until committed
**Why**: Devcontainer rebuild could lose work; unclear what's intentional vs temporary

**Solution**:

```bash
# In C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle
git add .
git commit -m "feat: Agent Skills, token management, and devcontainer readiness

- Add CLAUDE.md with comprehensive project documentation
- Add TOKEN_QUICK_REF.md and TOKEN_MANAGEMENT.md for API key tracking
- Add audit-tokens.py for token usage analysis
- Document devcontainer readiness and transition steps
- Add shell integration and MCP blocking server fixes
- Add semantic-router core setup documentation

This work enables safe devcontainer-based development and provides foundation for
multi-worktree development workflow with isolated feature branches.

Work was developed autonomously by Claude Code agent on relaxed-hugle branch
and is ready for integration into feature/genui-workbench-refactor.

🤖 Generated with Claude Code"

# Push to GitHub as safety backup
git push origin relaxed-hugle
```

### Issue 2: Should relaxed-hugle Merge to Main Branch?

**MIGRATION_IMPLEMENTATION_PLAN Context**: This plan outlines eventual migration to Turborepo structure
**Your Choice**: Keep as separate feature branch or merge?

**Recommendation**: Keep as feature branch initially, then integrate

- Allows parallel work while migration plan is executed
- Clear history of when UniversalWorkbench integration happened
- Can be rebased onto Turborepo structure later

**Steps** (after commit):

```bash
# In main worktree (C:\Users\dylan\modme-ui-01)
git fetch origin
git checkout feature/genui-workbench-refactor
git log -1 origin/relaxed-hugle  # See what's being merged

# Option A: Merge (preserves history)
git merge --no-ff origin/relaxed-hugle -m "Integrate Agent Skills & devcontainer readiness from relaxed-hugle"

# Option B: Rebase (linear history)
git rebase origin/relaxed-hugle
```

---

## 🏗️ Devcontainer for Worktree Workflow

### Design Principle: Workspace-Agnostic

The devcontainer **must work identically** whether you open:

- `C:\Users\dylan\modme-ui-01` (main)
- `C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle` (worktree)
- Future worktrees (feature/turborepo-migration, etc.)

**This means**:

- Devcontainer config lives in `.devcontainer/` (same for all worktrees)
- Scripts handle both mono-worktree and multi-worktree setups
- Port forwarding works regardless of physical location
- Dependencies install consistently

### Devcontainer Configuration

**Location**: `.devcontainer/devcontainer.json`

```json
{
  "name": "ModMe GenUI Workspace (Multi-Worktree)",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-22.04",

  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "22.9.0",
      "nodeGypDependencies": true,
      "nvmVersion": "latest"
    },
    "ghcr.io/devcontainers/features/python:1": {
      "version": "3.12",
      "installTools": true
    },
    "ghcr.io/devcontainers/features/github-cli:1": {
      "version": "latest"
    },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {
      "version": "latest",
      "dockerComposeVersion": "v2"
    }
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "GitHub.copilot",
        "GitHub.copilot-chat",
        "GitHub.vscode-github-actions",
        "ms-azuretools.vscode-docker",
        "eamodio.gitlens",
        "usernamehw.errorlens",
        "christian-kohler.path-intellisense",
        "streetsidesoftware.code-spell-checker"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": "explicit"
        },
        "files.autoSave": "afterDelay",
        "files.autoSaveDelay": 1000,
        "python.defaultInterpreterPath": "${containerWorkspaceFolder}/agent/.venv/bin/python",
        "python.terminal.activateEnvironment": true,
        "python.linting.enabled": true,
        "python.linting.flake8Enabled": true,
        "python.formatting.provider": "black",
        "[python]": {
          "editor.defaultFormatter": "ms-python.python",
          "editor.formatOnSave": true
        },
        "[typescript]": {
          "editor.defaultFormatter": "esbenp.prettier-vscode"
        },
        "[typescriptreact]": {
          "editor.defaultFormatter": "esbenp.prettier-vscode"
        }
      }
    }
  },

  "forwardPorts": [3000, 8000, 8001],
  "portsAttributes": {
    "3000": {
      "label": "Next.js UI",
      "onAutoForward": "notify"
    },
    "8000": {
      "label": "Python ADK Agent",
      "onAutoForward": "notify"
    },
    "8001": {
      "label": "ChromaDB",
      "onAutoForward": "notify"
    }
  },

  "postCreateCommand": "bash .devcontainer/post-create.sh",

  "remoteEnv": {
    "NODE_ENV": "development",
    "PYTHONPATH": "${containerWorkspaceFolder}/agent"
  },

  "remoteUser": "vscode",

  "mounts": [
    "source=${localWorkspaceFolder}/data,target=${containerWorkspaceFolder}/data,type=bind,consistency=cached"
  ],

  "containerEnv": {
    "WORKSPACE_TYPE": "genui-devcontainer-multiworktree"
  }
}
```

### Enhanced post-create.sh

**Location**: `.devcontainer/post-create.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Starting ModMe GenUI Devcontainer Setup (Multi-Worktree Mode)"
echo "📍 Workspace: ${WORKSPACE_FOLDER:-$(pwd)}"
echo "🌿 Git Branch: $(git branch --show-current)"

# Determine working directory
cd "${WORKSPACE_FOLDER:-.}"

# ============================================================
# Section 1: Detect Worktree Context
# ============================================================
echo ""
echo "🔍 Detecting git context..."

MAIN_WORKTREE=$(git rev-parse --git-dir | sed 's|/.git.*||')
CURRENT_BRANCH=$(git branch --show-current)
COMMIT_HASH=$(git rev-parse --short HEAD)

echo "   ✓ Worktree root: $MAIN_WORKTREE"
echo "   ✓ Current branch: $CURRENT_BRANCH"
echo "   ✓ Commit: $COMMIT_HASH"

# ============================================================
# Section 2: Verify Prerequisites
# ============================================================
echo ""
echo "📋 Verifying prerequisites..."

echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"
echo "   Python: $(python3 --version)"
echo "   Git: $(git --version)"

# ============================================================
# Section 3: Install Node Dependencies
# ============================================================
echo ""
echo "📦 Installing Node.js dependencies..."

if [ -f "package.json" ]; then
    npm install
    echo "   ✓ Dependencies installed"
else
    echo "   ⚠️  No package.json found - skipping npm install"
fi

# ============================================================
# Section 4: Setup Python Agent
# ============================================================
echo ""
echo "🐍 Setting up Python agent environment..."

if [ -f "agent/pyproject.toml" ]; then
    cd agent

    # Create virtual environment
    if [ ! -d ".venv" ]; then
        echo "   Creating virtual environment..."
        python3 -m venv .venv
    fi

    # Activate and install
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -e .

    echo "   ✓ Python agent configured"
    cd ..
else
    echo "   ⚠️  No agent/pyproject.toml found - skipping Python setup"
fi

# ============================================================
# Section 5: Create Data Directory Structure
# ============================================================
echo ""
echo "📁 Setting up data directories..."

mkdir -p data/raw data/processed data/reports
echo "   ✓ Data structure created"

# ============================================================
# Section 6: Environment Configuration
# ============================================================
echo ""
echo "⚙️  Configuring environment..."

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo "   ✓ .env created from .env.example"
    echo "   ⚠️  Remember to update .env with API keys!"
fi

# ============================================================
# Section 7: Git Configuration for Worktrees
# ============================================================
echo ""
echo "🌿 Configuring git for worktree workflow..."

# Enable worktree-aware git commands
git config --local core.worktree "$(pwd)"
echo "   ✓ Worktree context configured"

# ============================================================
# Section 8: Validate Setup
# ============================================================
echo ""
echo "✅ Validating setup..."

# Check Node/npm
if ! npm list --depth=0 >/dev/null 2>&1; then
    echo "   ⚠️  npm dependencies may not be fully installed"
fi

# Check Python
if [ -f "agent/pyproject.toml" ] && [ ! -d "agent/.venv" ]; then
    echo "   ⚠️  Python agent .venv not found"
fi

# ============================================================
# Section 9: Summary
# ============================================================
echo ""
echo "════════════════════════════════════════════════════════"
echo "✨ Setup Complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Environment Summary:"
echo "   Branch: $CURRENT_BRANCH"
echo "   Worktree: $MAIN_WORKTREE"
echo "   Node: $(node --version)"
echo "   Python: $(python3 --version)"
echo ""
echo "🚀 Next Steps:"
echo "   1. Update .env with your GOOGLE_API_KEY"
echo "   2. Run: npm run dev          (start UI + agent)"
echo "   3. Or run individually:"
echo "      - npm run dev:ui          (Next.js on :3000)"
echo "      - npm run dev:agent       (Python on :8000)"
echo ""
echo "📖 Documentation:"
echo "   - MIGRATION_IMPLEMENTATION_PLAN.md (Turborepo migration roadmap)"
echo "   - PORTING_GUIDE.md (Component portability)"
echo "   - CLAUDE.md (Project structure)"
echo ""
echo "🌿 Worktree Tips:"
echo "   - List all worktrees: git worktree list"
echo "   - Create new: git worktree add ../feature-name -b feature/feature-name"
echo "   - Remove: git worktree remove ../feature-name"
echo ""
echo "Happy coding! 🎉"
```

---

## 🔄 Workflow: Human + AI Parallel Development

### Setup (One-Time)

```bash
# Main development environment (human)
cd C:\Users\dylan\modme-ui-01
# VS Code > Reopen in Container → devcontainer spins up

# For Claude Code sessions (AI)
# Each session creates its own worktree as needed
```

### AI Agent Workflow (Claude Code)

When Claude Code needs to work on a feature:

```bash
# Claude Code creates isolated worktree
git worktree add ../<feature-name> -b feature/<feature-name>
cd ../<feature-name>

# Opens same devcontainer
code .
# → Reopen in Container → Uses .devcontainer/devcontainer.json

# Work happens in isolation
npm run dev  # Both UI + agent start
# ... make changes
git add .
git commit -m "..."

# When ready
git push origin feature/<feature-name>
# → Create PR for human review

# Human merges PR
# Claude Code cleans up
git worktree remove ../<feature-name>
```

### Multiple Concurrent Agents

```
modme-ui-01/
├── Main worktree (Human: feature/genui-workbench-refactor)
│   └── Devcontainer: Open
│
├── .claude-worktrees/modme-ui-01/
│   ├── relaxed-hugle/ (Agent #1: Agent Skills)
│   │   └── Devcontainer: Open (can work simultaneously)
│   │
│   ├── feature-turborepo/ (Agent #2: Turborepo migration)
│   │   └── Devcontainer: Open (can work simultaneously)
│   │
│   └── feature-universal-workbench/ (Agent #3: UniversalWorkbench integration)
│       └── Devcontainer: Open (can work simultaneously)
```

**Each has own VS Code window with own devcontainer, but they all share**:

- Same `.devcontainer/` config
- Same `package.json` scripts
- Same Git repository
- Same GitHub remotes

---

## 📊 Devcontainer Setup Timeline

### Phase 1: Prepare (NOW) - 20 minutes

```bash
# In relaxed-hugle worktree
git add .
git commit -m "..."
git push origin relaxed-hugle
```

### Phase 2: Update Devcontainer Config - 15 minutes

- Update `.devcontainer/devcontainer.json` with multi-worktree awareness
- Update `.devcontainer/post-create.sh` with worktree detection
- Test in main worktree

### Phase 3: Test in Worktrees - 30 minutes

- Test main worktree: `C:\Users\dylan\modme-ui-01` → Reopen in Container
- Test relaxed-hugle: `C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle` → Reopen in Container
- Verify both work identically

### Phase 4: Document Workflow - 10 minutes

- Create `.devcontainer/README.md` with worktree workflow
- Add worktree examples to main README
- Document devcontainer + worktree best practices

**Total**: ~75 minutes to production-ready setup

---

## ✨ Next Steps (Aligned with MIGRATION_IMPLEMENTATION_PLAN)

### Immediate (Week 1)

1. ✅ Commit all work in relaxed-hugle
2. ✅ Finalize devcontainer config
3. ✅ Test in both main worktree and relaxed-hugle
4. ✅ Document worktree workflow

### Phase 1: Turborepo Migration (Week 2-3)

Per MIGRATION_IMPLEMENTATION_PLAN.md Phase 1:

- Bootstrap with ts-fullstack structure
- Copy AI workflows
- Configure environment
- First commit to new Turborepo

### Phase 2-5: Full Migration (Weeks 4-8)

Execute remaining phases from MIGRATION_IMPLEMENTATION_PLAN.md:

- Python integration
- TypeScript tools migration
- Workflows & collaboration setup
- React Aria + Codespaces configuration

### During Migration: Absorb UniversalWorkbench

Per PORTING_GUIDE.md:

- Create separate worktree: `feature/universal-workbench-integration`
- Claude Code agent integrates UniversalWorkbench components
- Port relevant parts into new Turborepo structure
- Clean up archived components in GenerativeUI_monorepo

---

## 🎯 Success Criteria

✅ **Devcontainer Setup**:

- [ ] `.devcontainer/devcontainer.json` handles multi-worktree workspace
- [ ] `post-create.sh` detects worktree context correctly
- [ ] Node/Python dependencies install consistently
- [ ] Ports 3000/8000/8001 forward correctly

✅ **Worktree Support**:

- [ ] Main worktree (feature/genui-workbench-refactor) works
- [ ] relaxed-hugle worktree works identically
- [ ] Can create new worktrees and they work with devcontainer
- [ ] Simultaneous devcontainers don't conflict

✅ **Documentation**:

- [ ] `.devcontainer/README.md` explains multi-worktree setup
- [ ] Workflow documented for human + AI collaboration
- [ ] Links to MIGRATION_IMPLEMENTATION_PLAN clear

---

## 🚨 Important Notes

### Git Worktree Gotchas

- **Don't delete main worktree** - it's the source of remotes
- **Use `git worktree list`** to see all worktrees
- **Cleaning up**: `git worktree remove <path>` then `git worktree prune`
- **Orphaned worktrees**: `git worktree repair` if devcontainer crashes

### Devcontainer + Worktrees

- Each worktree should have own `.vscode/settings.json` (optional)
- Shared `.devcontainer/` = consistent environment
- Python venv can be shared or per-worktree (current design: shared in root `agent/.venv`)
- Node modules are not shared (npm install per worktree, or use monorepo hoisting)

### Future: Turborepo + Worktrees

Once migrated to Turborepo:

- Use `turbo` for cross-package builds
- `turbo dev` works across all worktrees
- Workspaces enable shared `node_modules`
- No conflict with git worktrees - they're independent

---

## 📚 Related Documentation

- **[MIGRATION_IMPLEMENTATION_PLAN.md](./MIGRATION_IMPLEMENTATION_PLAN.md)** - Full migration to Turborepo
- **[PORTING_GUIDE.md](./PORTING_GUIDE.md)** - Portable components from modme-ui-01
- **[CLAUDE.md](./CLAUDE.md)** - Project structure and conventions
- **[TOKEN_QUICK_REF.md](./TOKEN_QUICK_REF.md)** - API key management

---

This strategy enables your vision: **a true monorepo + worktree development environment supporting parallel human and AI development, with a single unified devcontainer configuration.**

Ready to implement?
