# Setup & Installation Summary

> **What's been configured and how to use it**

**Date**: January 6, 2026  
**Status**: ✅ Complete

---

## 📦 What We've Set Up

### 1. Installation Scripts

| Script                    | Platform         | Purpose                                        |
| ------------------------- | ---------------- | ---------------------------------------------- |
| `scripts/install-all.sh`  | Unix/macOS/Linux | Complete installation with prerequisites check |
| `scripts/install-all.bat` | Windows          | Windows-equivalent installation script         |
| `scripts/quick-start.sh`  | Unix/macOS/Linux | One-command setup + start                      |
| `scripts/setup-agent.sh`  | Unix/macOS/Linux | Python agent-only setup                        |
| `scripts/setup-agent.bat` | Windows          | Python agent-only setup (Windows)              |

### 2. NPM Scripts

Added to `package.json`:

```bash
npm run install:all     # Complete installation (Node.js + Python)
npm run install:agent   # Python agent only
npm run quick-start     # Install + configure + start
```

### 3. Documentation

| File                    | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `INSTALLATION_GUIDE.md` | Complete installation guide (500+ lines) |
| `SETUP_SUMMARY.md`      | This file - quick reference              |
| `README.md`             | Updated with new installation options    |

---

## 🚀 Usage Guide

### First-Time Setup

**Easiest Way** (One Command):

```bash
# Clone repository
git clone https://github.com/Ditto190/modme-ui-01.git
cd modme-ui-01

# Run quick start
./scripts/quick-start.sh  # Unix/macOS
```

**What happens**:

1. ✅ Checks Node.js, Python, npm, uv versions
2. ✅ Installs Node.js dependencies (if missing)
3. ✅ Sets up Python virtual environment (if missing)
4. ✅ Creates `.env` from template (if missing)
5. ✅ Starts both servers (UI + Agent)

---

### Complete Installation (More Control)

```bash
# 1. Check prerequisites only
./scripts/install-all.sh --check-only

# 2. Full installation
./scripts/install-all.sh

# 3. Configure environment
nano .env  # Add GOOGLE_API_KEY

# 4. Start development
npm run dev
```

**Flags**:

- `--check-only` - Only verify prerequisites, don't install
- `--force` - Force reinstall (removes node_modules and .venv)
- `--skip-validation` - Skip validation steps (faster)

---

### Manual Installation (Step-by-Step)

If scripts don't work or you need manual control:

```bash
# 1. Install Node.js dependencies
npm install

# 2. Setup Python agent
cd agent
uv sync
cd ..

# 3. Configure environment
cp .env.example .env
nano .env  # Add GOOGLE_API_KEY

# 4. Validate
npm run validate:toolsets
npm run lint

# 5. Start
npm run dev
```

---

## ✅ Verification Steps

After installation, verify everything works:

### 1. Prerequisites Check

```bash
./scripts/install-all.sh --check-only
```

**Expected output**:

```
✅ Node.js v22.9.0 (✓ >= 22.9.0)
✅ npm 10.8.3
✅ Python 3.12.12 (✓ >= 3.12)
✅ uv 0.9.22
✅ git 2.52.0
✅ All prerequisites satisfied!
```

### 2. Dependencies Installed

```bash
# Check Node.js modules
ls -la node_modules/@copilotkit  # Should exist

# Check Python venv
ls -la agent/.venv  # Should exist

# Check Python packages
cd agent
source .venv/bin/activate
python -c "import google.adk; print('✅ ADK installed')"
```

### 3. Services Start

```bash
npm run dev
```

**Expected**:

```
[ui]    ready - started server on 0.0.0.0:3000
[agent] INFO:     Uvicorn running on http://0.0.0.0:8000
[vtcode] VT Code MCP server running on port 8080
```

### 4. Health Checks

```bash
# In another terminal
curl http://localhost:3000  # Should return HTML
curl http://localhost:8000/health  # Should return {"status":"healthy"}
curl http://localhost:8000/ready   # Should return {"status":"ready"}
```

### 5. Browser Test

1. Open http://localhost:3000
2. Should see "GenUI Workbench"
3. Click CopilotKit sidebar
4. Try: "Generate a sales dashboard"
5. Should see StatCards render

---

## 🐛 Common Issues & Solutions

### Issue: `node: command not found`

**Solution**:

```bash
# Install Node.js 22.9.0 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install 22.9.0
nvm use 22.9.0
```

### Issue: `uv: command not found`

**Solution**:

```bash
pip install uv
# OR
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Issue: `EBADENGINE` during npm install

**Cause**: Node.js < 22.9.0

**Solution**:

```bash
nvm install 22.9.0
nvm use 22.9.0
rm -rf node_modules
npm install
```

### Issue: Port 3000/8000 already in use

**Solution**:

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# OR use different ports
export PORT=3001
export AGENT_PORT=8001
npm run dev
```

### Issue: Python agent fails to start

**Solution**:

```bash
# Reinstall agent dependencies
cd agent
rm -rf .venv
cd ..
./scripts/install-all.sh --force
```

---

## 📚 What's Configured

### Environment Variables

File: `.env` (created from `.env.example`)

**Required**:

```env
GOOGLE_API_KEY=your_key_here  # Get from aistudio.google.com/app/apikey
```

**Optional**:

```env
NODE_ENV=development
PORT=3000
AGENT_PORT=8000
VTCODE_PORT=8080
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

### Dependencies Installed

**Node.js** (via npm):

- Next.js 16.1.1
- React 19.2.1
- CopilotKit 1.50.0
- AG-UI Client 0.0.42
- Development tools (ESLint, Prettier, TypeScript)

**Python** (via uv):

- google-adk
- google-genai
- ag-ui-adk
- FastAPI
- uvicorn
- semantic-router
- pydantic

### Services Running

When you run `npm run dev`:

| Service      | Port | URL                   | Purpose                       |
| ------------ | ---- | --------------------- | ----------------------------- |
| Next.js UI   | 3000 | http://localhost:3000 | Frontend interface            |
| Python Agent | 8000 | http://localhost:8000 | ADK agent backend             |
| VT Code MCP  | 8080 | http://localhost:8080 | Code editing tools (optional) |

---

## 🔧 Development Workflow

### Daily Development

```bash
# Start services
npm run dev

# Edit code (hot-reloads automatically)
# - Frontend: src/app/, src/components/
# - Agent: agent/main.py, agent/tools/
# - Toolsets: agent/toolsets.json

# Run checks before committing
npm run check  # Lint + format
npm run validate:toolsets  # Validate toolset JSON
```

### Working with Scripts

```bash
# Run any script
npm run <script-name>

# List all available scripts
npm run

# Common scripts:
npm run dev              # Start all services
npm run dev:ui           # UI only
npm run dev:agent        # Agent only
npm run build            # Build production
npm run lint             # Check code quality
npm run lint:fix         # Auto-fix issues
npm run validate:toolsets # Validate toolsets
npm run docs:all         # Generate docs
```

---

## 🚀 Next Steps

After successful installation:

1. ✅ **Configure API Key**: Add `GOOGLE_API_KEY` to `.env`
2. ✅ **Read Architecture**: [.github/copilot-instructions.md](.github/copilot-instructions.md)
3. ✅ **Explore Components**: [src/components/registry/](src/components/registry/)
4. ✅ **Try Agent Tools**: [agent/main.py](agent/main.py)
5. ✅ **Read Migration Plan**: [MIGRATION_IMPLEMENTATION_PLAN.md](MIGRATION_IMPLEMENTATION_PLAN.md)
6. ✅ **Experiment**: http://localhost:3000

---

## 📖 Additional Documentation

- **[INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)** - Complete installation guide
- **[README.md](README.md)** - Project overview
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - AI agent guide
- **[MIGRATION_IMPLEMENTATION_PLAN.md](MIGRATION_IMPLEMENTATION_PLAN.md)** - Monorepo migration plan
- **[PORTING_GUIDE.md](PORTING_GUIDE.md)** - Component porting guide
- **[docs/REFACTORING_PATTERNS.md](docs/REFACTORING_PATTERNS.md)** - Code patterns

---

## 🎯 Summary

**What We Achieved**:

- ✅ Comprehensive installation scripts (Unix + Windows)
- ✅ One-command quick start
- ✅ Automatic dependency management
- ✅ Prerequisites validation
- ✅ Health checks
- ✅ Complete documentation

**What You Can Do Now**:

1. Run `./scripts/quick-start.sh` to get started instantly
2. Run `./scripts/install-all.sh --check-only` to verify prerequisites
3. Run `npm run dev` to start development
4. Read [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) for detailed instructions

**Next Phase** (per MIGRATION_IMPLEMENTATION_PLAN.md):

- Phase 1: Foundation Bootstrap (Week 1) - Fork ts-fullstack
- Phase 2: Python Integration (Week 2) - Port agent to monorepo
- Phase 3: TypeScript Tools Migration (Week 3) - Port components

---

**Questions?** See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) or create an issue.

URL For setup

YOUR GENUI WORKBENCH URL:
https://urban-giggle-v9rg679gv4j25ww-3000.github.dev

👆 CLICK THIS LINK to access your GenUI Workbench!
