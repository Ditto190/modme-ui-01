# DevContainer Testing Guide

> **Complete step-by-step guide to test multi-worktree devcontainer setup**

**Status**: Ready to Test
**Estimated Time**: 20-30 minutes per worktree
**Prerequisites**: Docker Desktop/Colima, VS Code with Dev Containers extension

---

## What We're Testing

✅ DevContainer builds and initializes correctly
✅ Node dependencies install
✅ Python agent sets up
✅ Ports forward correctly (3000, 8000, 8001)
✅ Services start and respond
✅ Works in main worktree AND feature worktrees

---

## Test 1: Main Worktree (feature/genui-workbench-refactor)

### Step 1.1: Navigate to Main Worktree

```bash
cd C:\Users\dylan\modme-ui-01
git status
# Should show: On branch feature/genui-workbench-refactor
# Should show: nothing to commit, working tree clean
```

### Step 1.2: Open in VS Code

```bash
code .
```

**Expected**: VS Code opens with main repo files visible

### Step 1.3: Trigger DevContainer Build

In VS Code:
- Look for notification: "Folder contains a Dev Container configuration file"
- Click: "Reopen in Container"

Or use Command Palette:
- Press: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
- Type: "Dev Containers: Reopen in Container"
- Press: Enter

**Expected**: VS Code shows "Building image..." then starts building

### Step 1.4: Watch the Build

In VS Code, open Terminal and watch output:

```
🚀 Starting post-create setup for ModMe GenUI Workspace (Multi-Worktree Mode)

🔍 Detecting git context...
   ✓ Workspace: modme-ui-01
   ✓ Branch: feature/genui-workbench-refactor
   ✓ Commit: fc3ea20

📋 Verifying prerequisites...
   Node.js: v22.9.0
   npm: 10.8.3
   Python: 3.12.x
   Git: 2.x.x

📦 Checking UV package manager...
   ℹ️  UV not found, will use pip fallback

📦 Installing Node.js dependencies...
   ✓ Dependencies installed

🐍 Setting up Python agent environment...
   Creating virtual environment...
   Using pip for Python dependencies...
   ✓ Python agent configured

📁 Setting up data directories...
   ✓ Data structure created

⚙️  Configuring environment...
   ✓ .env created from .env.example
   ⚠️  Remember to update .env with your API keys!

🌿 Configuring git...
   ✓ Git context ready for worktree development

════════════════════════════════════════════════════════
✨ DevContainer setup complete!
════════════════════════════════════════════════════════
```

**Expected**: Setup completes with ✓ checkmarks. Takes 3-5 minutes first time (longer on subsequent builds due to npm/pip installing).

### Step 1.5: Verify Terminal Environment

In VS Code terminal (inside container), run:

```bash
node --version
# Expected: v22.9.0

npm --version
# Expected: 10.x.x

python3 --version
# Expected: 3.12.x

git branch --show-current
# Expected: feature/genui-workbench-refactor
```

### Step 1.6: Start Services

```bash
npm run dev
```

**Expected Output**:
```
● Building...
  ⚡ Compiled successfully

● Listening on http://localhost:3000
```

And in another terminal window:
```bash
# Check Python agent (opens new terminal in VS Code)
# Ctrl + Shift + ` to open new terminal

curl http://localhost:8000/health
# Expected: Some response indicating agent is running
# (May be JSON with status, or error message - just confirms it's listening)
```

### Step 1.7: Verify Ports

In VS Code:
- Open Command Palette
- Type: "Dev Containers: Open in Browser"
- Should open http://localhost:3000

**Expected**: Next.js UI loads (or shows dev loading screen)

Check ports forwarded:
- Ports view in VS Code (usually shown in bottom panel)
- Should see:
  - 3000 (Next.js UI)
  - 8000 (Python ADK Agent)
  - 8001 (ChromaDB)

### Step 1.8: Verify File Changes Visible

In VS Code editor:
- Open a source file (e.g., `src/app/page.tsx`)
- Make a small change (add comment)
- File should show as modified
- Changes are reflected in local filesystem too

### Step 1.9: Verify Git Works

In devcontainer terminal:

```bash
git status
# Expected: Shows modified files

git log --oneline -3
# Expected: Shows recent commits

git branch -a
# Expected: Shows all branches including remotes
```

### Step 1.10: Cleanup

Press `Ctrl+C` to stop `npm run dev`

```bash
# Stop services
exit
# Or just close VS Code terminal

# Optional: stop devcontainer
Dev Containers: Reopen Folder Locally
# (This closes devcontainer without deleting it)
```

---

## Test 2: Feature Worktree (relaxed-hugle)

### Step 2.1: Navigate to Feature Worktree

```bash
cd C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle
git status
# Should show: On branch relaxed-hugle
# Should show: nothing to commit, working tree clean
```

### Step 2.2: Open in VS Code

```bash
code .
```

**Expected**: VS Code opens with relaxed-hugle worktree files

### Step 2.3: Trigger DevContainer Build

Same as Test 1.3 - "Reopen in Container"

**Key Point**: This uses the **SAME** `.devcontainer/` config from the repo root!

### Step 2.4: Watch Setup and Verify Branch Detection

Look for this in post-create output:

```
🔍 Detecting git context...
   ✓ Workspace: relaxed-hugle
   ✓ Branch: relaxed-hugle  ← Different from main worktree!
   ✓ Commit: ff95b47
```

**Expected**: Branch shows as `relaxed-hugle`, not `feature/genui-workbench-refactor`

This proves the devcontainer is **branch-aware**!

### Step 2.5: Repeat Steps 1.5 - 1.10

Run same verification commands as main worktree:

```bash
node --version          # v22.9.0
npm --version           # 10.x.x
python3 --version       # 3.12.x
git branch --show-current  # relaxed-hugle
npm run dev             # Starts UI + Agent
```

**Expected**: Everything works identically to main worktree, but in isolated branch

### Step 2.6: Verify File Isolation

Key test - file changes don't affect other worktrees:

```bash
# In relaxed-hugle devcontainer terminal
echo "# test comment" >> src/app/page.tsx
git status
# Expected: src/app/page.tsx shows as modified

# In MAIN worktree (different VS Code window)
# Look at src/app/page.tsx
# Expected: Does NOT show the comment we just added
# (File is isolated to relaxed-hugle worktree)
```

### Step 2.7: Cleanup

Same as Test 1.10

```bash
exit  # or Ctrl+C to stop npm run dev
```

---

## Test 3: Simultaneous Development

**Advanced Test**: Can we run both worktrees' devcontainers at the same time?

### Step 3.1: Setup

- Main worktree devcontainer: RUNNING with `npm run dev`
- Feature worktree devcontainer: RUNNING with `npm run dev`

This means 2 VS Code windows, 2 devcontainers, but same Git repo

### Step 3.2: Verify No Port Conflicts

Main worktree terminal:
```bash
npm run dev
# Listening on :3000 and :8000
```

Feature worktree terminal:
```bash
npm run dev
# Should listen on :3000 and :8000 (or find next available ports)
# Both work because they're in separate containers
```

### Step 3.3: Verify Isolation

In main worktree:
```bash
git log --oneline | head -1
# fc3ea20  (most recent devcontainer commit)
```

In feature worktree:
```bash
git log --oneline | head -1
# ff95b47  (older commit on relaxed-hugle)
```

**Expected**: Each worktree sees its own branch history!

### Step 3.4: Make Changes in Both

Main worktree:
```bash
echo "# main change" >> src/app/page.tsx
git add .
git commit -m "feat: main worktree change"
```

Feature worktree:
```bash
echo "# feature change" >> src/app/page.tsx
git add .
git commit -m "feat: feature worktree change"
```

```bash
# In main worktree
git log --oneline | head -1
# Should show your main change

# In feature worktree
git log --oneline | head -1
# Should show your feature change

# Each branch has separate commits - perfect isolation!
```

---

## Troubleshooting

### Issue: "Docker daemon not running"

**Solution**:
```bash
# Windows: Start Docker Desktop
# macOS: Start Docker.app
# Linux: sudo systemctl start docker
```

### Issue: DevContainer build hangs

**Solution**:
```bash
# Cancel the build (Ctrl+C)
# Rebuild: Dev Containers: Rebuild Container
# Or rebuild from command line:
docker system prune -a  # Remove old images
# Then reopen in container
```

### Issue: npm install times out

**Solution**:
```bash
# Inside container
npm cache clean --force
npm install --legacy-peer-deps

# Or increase timeout
npm install --fetch-timeout=600000
```

### Issue: Python venv not found

**Solution**:
```bash
# Inside container
cd agent
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

### Issue: Ports not forwarding

**Solution**:
```bash
# Restart devcontainer
Dev Containers: Reopen in Container

# Or check if ports are taken locally
netstat -ano | findstr :3000  # Windows
lsof -i :3000  # macOS/Linux

# Kill conflicting processes or use different ports
npm run dev -- --port 3001
```

### Issue: Changes from main worktree visible in feature

**This should NOT happen** - if it does:

```bash
# Git worktree may be corrupted
git worktree repair

# Or recreate worktree
git worktree remove C:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle
git worktree add ..relaxed-hugle -b relaxed-hugle
```

---

## Success Criteria

### ✅ Test 1 (Main Worktree) Passes When:

- [ ] DevContainer builds and post-create.sh completes
- [ ] Branch detected correctly: `feature/genui-workbench-refactor`
- [ ] `npm run dev` starts UI on :3000
- [ ] Python agent accessible on :8000
- [ ] Git commands work inside container
- [ ] File changes visible in local filesystem

### ✅ Test 2 (Feature Worktree) Passes When:

- [ ] DevContainer builds using same config
- [ ] Branch detected correctly: `relaxed-hugle`
- [ ] `npm run dev` starts UI on :3000
- [ ] Python agent accessible on :8000
- [ ] File changes DO NOT affect main worktree
- [ ] Git shows separate branch history

### ✅ Test 3 (Simultaneous) Passes When:

- [ ] Both worktrees run devcontainers simultaneously
- [ ] Ports forward correctly for both
- [ ] Changes are isolated per worktree
- [ ] Commits appear in correct branches
- [ ] No conflicts or cross-contamination

---

## Next Steps After Testing

If all tests pass ✅:

1. **Document Test Results**
   ```bash
   echo "## Test Results - $(date)
   - Main worktree: ✅ PASSED
   - Feature worktree: ✅ PASSED
   - Simultaneous: ✅ PASSED
   " >> DEVCONTAINER_TESTING_LOG.md
   ```

2. **Push Test Documentation**
   ```bash
   git add .
   git commit -m "docs: Record successful devcontainer tests"
   git push origin feature/genui-workbench-refactor
   ```

3. **Ready for Production Use**
   - DevContainer is production-ready
   - Can be used for all future feature work
   - Other team members can use same config
   - Scale to multiple AI agents if needed

4. **Optional: Test Additional Worktrees**
   ```bash
   # Create new feature worktree
   git worktree add ../feature-universal-workbench -b feature/universal-workbench-integration

   # Test devcontainer setup there too
   cd ../feature-universal-workbench
   code .
   # Reopen in Container → Run same tests
   ```

---

## Documentation to Share

Once testing is complete, share these with team:

1. **[.devcontainer/README.md](.devcontainer/README.md)** - How to use devcontainer
2. **[DEVCONTAINER_WORKTREE_STRATEGY.md](./DEVCONTAINER_WORKTREE_STRATEGY.md)** - Full technical guide
3. **[MIGRATION_IMPLEMENTATION_PLAN.md](./MIGRATION_IMPLEMENTATION_PLAN.md)** - Future Turborepo roadmap
4. **[This testing guide](./DEVCONTAINER_TESTING_GUIDE.md)** - How to validate setup

---

## Estimated Timeline

| Step | Time | Notes |
|------|------|-------|
| Test 1 Setup | 5 min | First build slower |
| Test 1 Run | 10 min | Install deps, test services |
| Test 2 Setup | 2 min | Second build faster (cached) |
| Test 2 Run | 10 min | Test isolation, file changes |
| Test 3 Simultaneous | 5 min | Run both at once |
| Cleanup & Commit | 3 min | Document results |
| **TOTAL** | **~35 min** | |

---

**Ready to test?** Start with Test 1 - the main worktree. Let me know results! 🚀
