# DevContainer Pre-Flight Checklist

> **Quick verification before switching to DevContainer**

**Date**: 2026-01-06  
**Repository**: modme-ui-01  
**Estimated Time**: 5 minutes

---

## 🔍 Prerequisites Check

### System Requirements

```powershell
# Run these commands in PowerShell to verify:

# 1. Check Docker Desktop
docker --version
# ✅ Expected: Docker version 20.10+
# ❌ If not found: https://www.docker.com/products/docker-desktop/

# 2. Check Docker is running
docker ps
# ✅ Expected: List of containers (or empty list)
# ❌ If error: Start Docker Desktop and wait 30 seconds

# 3. Check VS Code Dev Containers extension
code --list-extensions | findstr remote-containers
# ✅ Expected: ms-vscode-remote.remote-containers
# ❌ If not found: code --install-extension ms-vscode-remote.remote-containers

# 4. Check available disk space
Get-PSDrive C | Format-Table Name, Used, Free, @{Name="FreePct";Expression={[math]::Round($_.Free/$_.Free + $_.Used)*100}}
# ✅ Expected: >10 GB free space
# ❌ If <10 GB: Clean up disk or run 'docker system prune -a'
```

### Repository Status

```bash
# 5. Check git status
git status
# ✅ Expected: Clean working tree (or only untracked files)
# ⚠️  If uncommitted changes: Decide to commit or stash

# 6. Check current branch
git branch --show-current
# ℹ️  Note: You can switch from any branch

# 7. Stop local dev servers (if running)
# Press Ctrl+C in any terminal running 'npm run dev'
# ✅ Expected: No processes listening on ports 3000 or 8000
```

---

## 📋 Configuration Verification

### DevContainer Files

```powershell
# Verify all required files exist
@(
    ".devcontainer\devcontainer.json",
    ".devcontainer\Dockerfile",
    ".devcontainer\post-create.sh",
    ".devcontainer\README.md",
    ".devcontainer\QUICKSTART.md",
    ".dockerignore"
) | ForEach-Object {
    if (Test-Path $_) {
        Write-Host "✅ $_" -ForegroundColor Green
    } else {
        Write-Host "❌ $_ MISSING" -ForegroundColor Red
    }
}
```

**Expected result**: All files show ✅

### Environment Configuration

```powershell
# Check .env file status
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    # Check for GOOGLE_API_KEY
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "GOOGLE_API_KEY=.+") {
        Write-Host "✅ GOOGLE_API_KEY is set" -ForegroundColor Green
    } else {
        Write-Host "⚠️  GOOGLE_API_KEY not set (can configure after transition)" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  .env file will be created during post-create.sh" -ForegroundColor Cyan
}
```

---

## 🎯 Decision Points

### Question 1: Commit Uncommitted Changes?

- [ ] **Yes** → Commit now before transition
- [ ] **No** → Continue with uncommitted changes (they'll be in container)

```bash
# If Yes:
git add .
git commit -m "chore: prepare for DevContainer transition"
```

### Question 2: Create Backup Branch?

- [ ] **Yes** → Run `prepare-devcontainer.ps1` (creates automatically)
- [ ] **No** → Proceed manually (can always revert locally)

```bash
# If Yes (manual):
git branch backup/pre-devcontainer-$(date +%Y%m%d-%H%M%S)
```

### Question 3: Configure API Keys Now or Later?

- [ ] **Now** → Edit `.env` before transition
- [ ] **Later** → Configure in container after opening

```bash
# If Now:
cp .env.example .env
code .env  # Add GOOGLE_API_KEY
```

---

## 🚀 Transition Method

### Option A: Automated (Recommended)

```powershell
# Single command
.\scripts\prepare-devcontainer.ps1

# What it does:
# ✅ Verifies all prerequisites
# ✅ Checks git status
# ✅ Creates backup branch
# ✅ Validates files
# ✅ Opens in DevContainer
```

**Choose this if**: You want guided setup with safety checks.

### Option B: Manual

```
1. Ensure Docker Desktop is running
2. Save all open files in VS Code
3. Command Palette (Ctrl+Shift+P)
4. Type: "Reopen in Container"
5. Wait for build (5-10 minutes)
6. Run: npm run dev
```

**Choose this if**: You prefer direct control.

---

## ⏱️ Time Expectations

| Phase | Duration | What's Happening |
|-------|----------|------------------|
| **Prerequisites** | 2-5 minutes | Installing Docker/extension if needed |
| **Pre-flight checks** | 1-2 minutes | Running this checklist |
| **First build** | 5-10 minutes | Docker downloads, installs dependencies |
| **Post-create** | 2-3 minutes | npm install, Python setup, extensions |
| **Total (first time)** | **10-20 minutes** | ☕ Coffee break recommended |

**Subsequent rebuilds**: 1-2 minutes (Docker caches layers)

---

## 📊 Success Criteria

After transition completes, you should see:

### VS Code Indicators

- [ ] Bottom-left corner shows: **"Dev Container: GenUI Workbench"**
- [ ] Terminal prompt: `vscode@...:/workspaces/modme-ui-01$`
- [ ] **Ports** tab shows 3000 and 8000 forwarded

### Command Verification

```bash
# Run these in container terminal:

node --version    # → v22.9.0
python --version  # → 3.12+
npm run dev       # → Starts without errors
curl http://localhost:8000/health  # → {"status":"healthy"}
```

### Application Verification

- [ ] http://localhost:3000 loads GenUI Workbench
- [ ] GitHub Copilot Chat has MCP tools available
- [ ] No port conflicts or errors in terminal

---

## 🐛 Quick Troubleshooting

### If build fails:

```powershell
# 1. Check Docker logs
docker system events

# 2. Clean Docker cache
docker system prune -a

# 3. Retry build
# Command Palette → "Rebuild Container"
```

### If post-create.sh fails:

```bash
# Inside container terminal:
npm clean-install
cd agent && source .venv/bin/activate && uv sync
```

### If ports don't forward:

1. Check **Ports** tab in VS Code
2. Manually forward: Right-click → **Forward a Port**
3. Enter port number (3000 or 8000)

---

## 📚 Documentation Stack

After transition, reference these docs:

1. **[.devcontainer/QUICKSTART.md](.devcontainer/QUICKSTART.md)** - Fast commands reference
2. **[.devcontainer/README.md](.devcontainer/README.md)** - Complete reference (161 lines)
3. **[DEVCONTAINER_TRANSITION_SUMMARY.md](DEVCONTAINER_TRANSITION_SUMMARY.md)** - This summary
4. **[DEVCONTAINER_READINESS_CHECKLIST.md](DEVCONTAINER_READINESS_CHECKLIST.md)** - Comprehensive guide

---

## ✅ Pre-Flight Complete Checklist

Before you click "Reopen in Container", verify:

- [ ] Docker Desktop is installed and running
- [ ] VS Code Dev Containers extension is installed
- [ ] All 6 DevContainer files exist (.devcontainer/*, .dockerignore)
- [ ] Git status is clean (or you've decided to proceed with changes)
- [ ] Local dev servers are stopped (ports 3000, 8000 free)
- [ ] At least 10 GB disk space available
- [ ] You're ready to wait 10-20 minutes for first build
- [ ] You've saved all open files in VS Code

**If all boxes checked**: ✅ **READY TO PROCEED**

---

## 🎯 Next Steps

### If Ready Now:

```powershell
# Run automated transition
.\scripts\prepare-devcontainer.ps1
```

### If Not Ready:

1. Install missing prerequisites (Docker, VS Code extension)
2. Free up disk space if needed
3. Commit/stash uncommitted changes
4. Come back when ready (no rush!)

---

## 🆘 Emergency Contacts

### If Something Goes Wrong:

```
Option 1: Exit container
  Command Palette → "Reopen Folder Locally"

Option 2: Check logs
  Docker Desktop → Containers → modme-ui-01 → Logs

Option 3: Nuclear reset
  1. Reopen Folder Locally
  2. docker system prune -a --volumes
  3. Retry from scratch
```

### Documentation:

- [.devcontainer/README.md](.devcontainer/README.md) - Troubleshooting section
- [DEVCONTAINER_TRANSITION_SUMMARY.md](DEVCONTAINER_TRANSITION_SUMMARY.md) - Known issues

---

## 🎉 You're Ready!

Your repository is **fully prepared** for DevContainer. All checks passed, documentation is comprehensive, and automation is in place.

**Confidence level**: ✅ **HIGH**

**When you're ready**:
```powershell
.\scripts\prepare-devcontainer.ps1
```

**Or manually**:
```
Ctrl+Shift+P → "Reopen in Container"
```

---

**Good luck! 🚀**

*Remember: You can always revert to local with "Reopen Folder Locally"*
