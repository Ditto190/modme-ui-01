# Installation & Setup Guide

> **Complete guide for installing and configuring the ModMe GenUI Workbench**

**Version**: 1.0.0  
**Date**: January 6, 2026  
**Prerequisites**: Node.js 22.9.0+, Python 3.12+

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Installation](#step-by-step-installation)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)
6. [Development Workflow](#development-workflow)

---

## 🚀 Quick Start

For experienced developers with prerequisites installed:

```bash
# 1. Clone repository
git clone https://github.com/Ditto190/modme-ui-01.git
cd modme-ui-01

# 2. Copy environment file
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# 3. Install all dependencies (automated)
npm install  # Installs Node.js deps + Python agent via postinstall

# 4. Start development servers
npm run dev  # Starts Next.js (:3000) + Python agent (:8000)
```

**Expected result**:

- Next.js UI at http://localhost:3000
- Python agent at http://localhost:8000/health

---

## ✅ Prerequisites

### Required Software

| Software    | Minimum Version | Check Command       | Installation                                                             |
| ----------- | --------------- | ------------------- | ------------------------------------------------------------------------ |
| **Node.js** | 22.9.0+         | `node --version`    | [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org) |
| **Python**  | 3.12+           | `python3 --version` | [python.org](https://python.org) or system package manager               |
| **npm**     | 10.0+           | `npm --version`     | Included with Node.js                                                    |
| **uv**      | Latest          | `uv --version`      | `pip install uv` or [astral.sh/uv](https://astral.sh)                    |
| **Git**     | 2.0+            | `git --version`     | [git-scm.com](https://git-scm.com)                                       |

### Optional Tools

| Tool        | Purpose                      | Installation                                           |
| ----------- | ---------------------------- | ------------------------------------------------------ |
| **nvm**     | Node version management      | [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm) |
| **VT Code** | Component editing MCP server | `cargo install vtcode` or `npm install -g vtcode`      |
| **Docker**  | ChromaDB HTTP server         | [docker.com](https://docker.com)                       |

### API Keys Required

- **GOOGLE_API_KEY**: Google Gemini API key for agent LLM
  - Get from: https://aistudio.google.com/app/apikey
  - Used by: Python agent (`agent/main.py`)

### Verify Prerequisites

```bash
# Run all checks at once
./scripts/setup.sh --check-only
```

Or manually:

```bash
node --version   # Should be v22.9.0 or higher
python3 --version  # Should be 3.12+
npm --version    # Should be 10.0+
uv --version     # Should show version (any recent)
git --version    # Should be 2.0+
```

---

## 📦 Step-by-Step Installation

### Step 1: Clone Repository

```bash
# HTTPS
git clone https://github.com/Ditto190/modme-ui-01.git
cd modme-ui-01

# OR SSH (if you have GitHub SSH key configured)
git clone git@github.com:Ditto190/modme-ui-01.git
cd modme-ui-01

# Check current branch
git branch --show-current
# Should show: feature/genui-workbench-refactor
```

### Step 2: Install Node.js (if needed)

**If you have Node.js < 22.9.0**, upgrade using nvm:

```bash
# Install nvm (Unix/macOS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart shell or source profile
source ~/.bashrc  # or ~/.zshrc

# Install Node.js 22.9.0
nvm install 22.9.0
nvm use 22.9.0
nvm alias default 22.9.0

# Verify
node --version  # v22.9.0
```

**Windows**: Use [nvm-windows](https://github.com/coreybutler/nvm-windows)

```powershell
# In PowerShell (Admin)
nvm install 22.9.0
nvm use 22.9.0
```

### Step 3: Install Python & uv (if needed)

**Python 3.12+**:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.12 python3.12-venv python3-pip

# macOS (via Homebrew)
brew install python@3.12

# Windows: Download from python.org
# https://www.python.org/downloads/
```

**uv (Python package manager)**:

```bash
# Unix/macOS/Windows
pip install uv

# Or via curl (Unix/macOS)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Verify
uv --version
```

### Step 4: Configure Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit with your keys
nano .env  # or vim, code, etc.
```

**Minimum required**:

```env
# .env
GOOGLE_API_KEY=REPLACE_ME_GOOGLE_API_KEY

# Optional (for VT Code integration)
# VTCODE_MCP_PORT=8080

# Optional (for ChromaDB)
# CHROMA_HOST=localhost
# CHROMA_PORT=8001
```

**Get Google API Key**:

1. Visit https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy key and paste into `.env`

### Step 5: Install Node.js Dependencies

```bash
# From repository root
npm install
```

This installs:

- Next.js and React dependencies
- CopilotKit runtime
- Development tools (ESLint, Prettier, Ruff)
- Toolset management scripts
- **Automatically runs `postinstall` hook** which installs Python dependencies

**What happens**:

- Downloads ~846 npm packages to `node_modules/`
- Runs `npm run install:agent` (postinstall hook)
- Triggers `scripts/setup-agent.sh` to install Python dependencies

### Step 6: Install Python Dependencies

**Normally automatic** (via npm postinstall), but if needed manually:

```bash
# Unix/macOS
./scripts/setup-agent.sh

# Windows
scripts\setup-agent.bat
```

**What happens**:

- Creates virtual environment at `agent/.venv/`
- Installs Python packages via `uv sync`:
  - google-adk
  - google-genai
  - ag-ui-adk
  - FastAPI, uvicorn
  - semantic-router
  - pydantic

**Verify Python installation**:

```bash
cd agent
source .venv/bin/activate  # Unix/macOS
# OR: .venv\Scripts\activate  # Windows

python --version  # Should be 3.12+
python -c "import google.adk; print('✅ google-adk installed')"
```

### Step 7: Validate Installation

```bash
# Return to root
cd /workspaces/modme-ui-01

# Run validation checks
npm run validate:toolsets  # Validates JSON schemas
npm run lint               # Lints TypeScript + Python

# Should see:
# ✅ Toolsets validated successfully
# ✅ No linting errors
```

---

## ✅ Verification

### Health Checks

**Start services**:

```bash
npm run dev
```

**Expected output**:

```
[ui]    ready - started server on 0.0.0.0:3000, url: http://localhost:3000
[agent] INFO:     Uvicorn running on http://0.0.0.0:8000
[vtcode] VT Code MCP server running on port 8080
```

**Test endpoints**:

```bash
# In another terminal

# 1. UI health
curl http://localhost:3000
# Should return HTML

# 2. Agent health
curl http://localhost:8000/health
# Should return: {"status":"healthy",...}

# 3. Agent readiness
curl http://localhost:8000/ready
# Should return: {"status":"ready","dependencies":{...}}

# 4. VT Code (optional)
curl http://localhost:8080/health 2>/dev/null || echo "VT Code not running"
```

### Browser Check

1. Open http://localhost:3000
2. Should see "GenUI Workbench" page
3. Click CopilotKit sidebar (right side)
4. Try prompt: "Generate a sales KPI dashboard"
5. Should see agent generate StatCards

### Log Check

```bash
# Check for errors in logs
npm run dev 2>&1 | grep -i error

# Should be empty or only show expected warnings
```

---

## 🐛 Troubleshooting

### Issue: `node: command not found`

**Solution**: Install Node.js 22.9.0+ (see Step 2)

---

### Issue: `EBADENGINE` error during npm install

**Cause**: Node.js version < 22.9.0

**Solution**:

```bash
nvm install 22.9.0
nvm use 22.9.0
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: `uv: command not found`

**Solution**:

```bash
pip install uv
# OR
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

### Issue: Python agent fails to start

**Symptoms**:

```
ModuleNotFoundError: No module named 'google.adk'
```

**Solution**:

```bash
# Reinstall Python dependencies
cd agent
rm -rf .venv
cd ..
./scripts/setup-agent.sh

# Verify
cd agent
source .venv/bin/activate
python -c "import google.adk"
```

---

### Issue: Port 3000 or 8000 already in use

**Solution**:

```bash
# Find process using port
lsof -i :3000  # Unix/macOS
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # Unix/macOS
taskkill /PID <PID> /F  # Windows

# OR change ports
export PORT=3001
export AGENT_PORT=8001
npm run dev
```

---

### Issue: `GOOGLE_API_KEY` not found

**Symptoms**:

```
Error: GOOGLE_API_KEY environment variable not set
```

**Solution**:

1. Check `.env` file exists: `ls -la .env`
2. Check `.env` has key: `grep GOOGLE_API_KEY .env`
3. Ensure no extra spaces: `GOOGLE_API_KEY=your_key` (no spaces around `=`)
4. Restart services: `npm run dev`

---

### Issue: TypeScript errors in VS Code

**Solution**:

```bash
# Reload TypeScript server
# In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"

# OR reinstall dependencies
rm -rf node_modules
npm install
```

---

### Issue: Ruff linting errors

**Solution**:

```bash
# Auto-fix
npm run lint:fix

# OR manually format Python
cd agent
source .venv/bin/activate
ruff format .
ruff check --fix .
```

---

## 🔧 Development Workflow

### Daily Development

```bash
# 1. Start all services
npm run dev

# 2. Open browser to http://localhost:3000

# 3. Edit code:
#    - Frontend: src/app/, src/components/
#    - Agent: agent/main.py, agent/tools/
#    - Toolsets: agent/toolsets.json

# 4. Changes hot-reload automatically

# 5. Run tests (optional)
npm run validate:toolsets  # After toolset changes
npm run lint               # Before committing
```

### Code Quality

```bash
# Lint all code
npm run lint

# Auto-fix issues
npm run lint:fix

# Format all code
npm run format

# Full check (lint + format)
npm run check
```

### Working with Toolsets

```bash
# Validate toolset JSON
npm run validate:toolsets

# Test alias resolution
npm run test:aliases

# Generate documentation
npm run docs:all

# Search toolsets
npm run search:toolset
```

### Debugging

```bash
# Debug mode (verbose logs)
npm run dev:debug

# Run only UI
npm run dev:ui

# Run only agent
npm run dev:agent

# Run only VT Code
npm run dev:vtcode
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ... edit code ...

# Commit
git add .
git commit -m "feat: add new feature"

# Push
git push origin feature/my-feature

# Create PR via GitHub UI
```

---

## 🚢 Production Deployment

### Build Production Bundle

```bash
# Build Next.js app
npm run build

# Test production build
npm run start

# Should serve at http://localhost:3000
```

### Environment Variables for Production

```env
# .env.production
NODE_ENV=production
GOOGLE_API_KEY=your_production_key
AGENT_URL=https://your-agent.example.com
```

### Deploy to Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### Deploy Python Agent

**Option 1: Docker**

```dockerfile
# agent/Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t modme-agent ./agent
docker run -p 8000:8000 --env-file .env modme-agent
```

**Option 2: Cloud Run / Railway / Render**

- See deployment platform docs for Python FastAPI apps

---

## 📚 Next Steps

After successful installation:

1. ✅ **Read Architecture Docs**: [.github/copilot-instructions.md](.github/copilot-instructions.md)
2. ✅ **Explore Components**: [src/components/registry/](src/components/registry/)
3. ✅ **Try Agent Tools**: [agent/main.py](agent/main.py)
4. ✅ **Read Migration Plan**: [MIGRATION_IMPLEMENTATION_PLAN.md](MIGRATION_IMPLEMENTATION_PLAN.md)
5. ✅ **Experiment with GenUI**: http://localhost:3000

---

## 🆘 Support

**Issues**: https://github.com/Ditto190/modme-ui-01/issues  
**Docs**: [.github/copilot-instructions.md](.github/copilot-instructions.md)  
**Architecture**: [docs/REFACTORING_PATTERNS.md](docs/REFACTORING_PATTERNS.md)

---

**Version**: 1.0.0 | **Last Updated**: January 6, 2026
