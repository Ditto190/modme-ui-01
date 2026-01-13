# ModMe GenUI Workspace

A **Generative UI (GenUI) R&D laboratory** combining Next.js 16, React 19, and Python ADK for building dynamic, AI-generated interfaces.

[![DevContainer](https://img.shields.io/badge/DevContainer-Ready-blue?logo=docker)](https://github.com/Ditto190/modme-ui-01/tree/main/.devcontainer)
[![CI](https://github.com/Ditto190/modme-ui-01/workflows/CI/badge.svg)](https://github.com/Ditto190/modme-ui-01/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **🎯 Porting Ready**: This monorepo contains **highly portable components** designed for reuse. See [PORTING_GUIDE.md](PORTING_GUIDE.md) and [CODEBASE_INDEX.md](CODEBASE_INDEX.md) for complete component catalog and integration patterns.

## 🚀 Quick Start

### The Fastest Way (One Command)

```bash
# Clone repository
git clone https://github.com/Ditto190/modme-ui-01.git
cd modme-ui-01

# Run quick start (installs dependencies + starts servers)
./scripts/quick-start.sh  # Unix/macOS
# or
scripts\quick-start.bat  # Windows (coming soon)
```

**What it does**:

- ✅ Checks prerequisites
- ✅ Installs Node.js dependencies
- ✅ Sets up Python agent
- ✅ Configures environment
- ✅ Starts both servers (UI + Agent)

**Result**: UI at http://localhost:3000, Agent at http://localhost:8000

---

### Option 1: Complete Installation

For more control over the installation process:

```bash
# 1. Install all dependencies
./scripts/install-all.sh  # Unix/macOS
# or
scripts\install-all.bat  # Windows

# 2. Configure environment (add your GOOGLE_API_KEY)
nano .env  # or vim, code, etc.

# 3. Start development
npm run dev
```

**Available flags**:

- `--check-only` - Only verify prerequisites
- `--force` - Force reinstall all dependencies
- `--skip-validation` - Skip validation steps

See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) for detailed instructions.

---

### Option 2: GitHub Codespaces (Recommended for Cloud)

1. Click **Code** → **Codespaces** → **Create codespace**
2. Wait for setup to complete (~3-5 minutes)
3. Add `GOOGLE_API_KEY` to `.env` (or use Codespaces secrets)
4. Run `npm run dev` to start both servers
5. Access UI at forwarded port 3000

---

### Option 3: DevContainer (Local)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Clone and open in VS Code
4. Click **Reopen in Container** when prompted
5. Add `GOOGLE_API_KEY` to `.env`
6. Run `npm run dev` after setup completes

## 📋 Prerequisites

- Node.js 22.9.0+ (required; earlier versions may cause EBADENGINE warnings and compatibility issues)
  - We recommend using [nvm](https://github.com/nvm-sh/nvm) (Unix/macOS) or [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows) to manage Node.js versions
- Python 3.12+
- Google Makersuite API Key (for the ADK agent) (see <https://makersuite.google.com/app/apikey>)
- Any of the following package managers:
  - pnpm (recommended)
  - npm
  - yarn
  - bun

> **Note:** This repository ignores lock files (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb) to avoid conflicts between different package managers. Each developer should generate their own lock file using their preferred package manager. After that, make sure to delete it from the .gitignore.

## Getting Started

> **💡 Tip**: For the easiest setup, use **GitHub Codespaces** or **DevContainer** (see Quick Start above). Everything is pre-configured!

### Manual Setup

#### 1. Set up Node.js with nvm (Recommended)

If you're using nvm, install and activate the recommended Node.js version:

```bash
# Install Node.js 22.9.0
nvm install 22.9.0

# Use Node.js 22.9.0
nvm use 22.9.0

# Verify the version
node --version  # Should output v22.9.0
```

#### 2. Run Setup Script

```bash
# Automated setup (recommended)
./scripts/setup.sh  # Linux/macOS
# or
.\scripts\setup.ps1  # Windows PowerShell

# This will:
# - Check Node.js and Python versions
# - Install Node.js dependencies
# - Set up Python virtual environment
# - Install agent dependencies with uv (or pip)
# - Create .env from .env.example
```

#### 3. Manual Installation (Alternative)

Install dependencies manually if you prefer:

```bash
# Using pnpm (recommended)
pnpm install

# Using npm
npm install

# Using yarn
yarn install

# Using bun
bun install
```

**Install Python dependencies:**

```bash
# Using pnpm
pnpm install:agent

# Using npm
npm run install:agent

# Using yarn
yarn install:agent

# Using bun
bun run install:agent
```

#### 4. Set Up Your Google API Key

Create a `.env` file (or copy from `.env.example`):

```bash
cp .env.example .env
```

Then add your Google API key:

```bash
export GOOGLE_API_KEY="your-google-api-key-here"
# Or add to .env file: GOOGLE_API_KEY=your-google-api-key-here
```

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

#### 5. Start the Development Server

```bash
# Using pnpm
pnpm dev

# Using npm
npm run dev

# Using yarn
yarn dev

# Using bun
bun run dev
```

This will start both the UI and agent servers concurrently.

## 🐳 DevContainer Features

This workspace includes a full DevContainer setup for portable, consistent development:

### What's Included

- ✅ **Multi-runtime support**: Node.js 22.9.0+ and Python 3.12+
- ✅ **Package managers**: npm, nvm, uv (Python)
- ✅ **VS Code extensions**: Pre-installed and configured
- ✅ **Port forwarding**: Automatic for UI (3000) and Agent (8000)
- ✅ **Auto-setup**: Dependencies installed on container creation
- ✅ **GitHub CLI**: For managing issues, PRs, and workflows

### DevContainer Commands

```bash
# Health check your workspace
./scripts/health-check.sh

# Start development servers
./scripts/start-dev.sh

# Manual setup (if needed)
./scripts/setup.sh

# Set up VS Code shell integration
.\scripts\setup-shell-integration.ps1  # PowerShell
bash scripts/setup-shell-integration.sh  # Bash
```

### Shell Integration

VS Code shell integration provides enhanced terminal features:

- ✅ **Command decorations** - Visual indicators for success/failure
- ✅ **Command navigation** - `Ctrl/Cmd+Up/Down` to navigate between commands
- ✅ **IntelliSense** - File/folder suggestions in terminal
- ✅ **Recent commands** - `Ctrl+Alt+R` to search command history
- ✅ **Sticky scroll** - Commands stick at top when scrolling
- ✅ **Quick fixes** - Automatic suggestions for common errors

**Quick setup**: Run `.\scripts\setup-shell-integration.ps1` (PowerShell) or `bash scripts/setup-shell-integration.sh` (Bash)

**Documentation**: See [.config/README.md](.config/README.md) and [.config/QUICKSTART.md](.config/QUICKSTART.md)

### Workspace File

Open `workspace.code-workspace` in VS Code for a multi-root workspace with:

- Separate folders for Frontend, Agent, Scripts, and Prompts
- Pre-configured debugging for both Node.js and Python
- Integrated tasks for common operations

## Available Scripts

The following scripts can also be run using your preferred package manager:

- `dev` - Starts both UI and agent servers in development mode
- `dev:debug` - Starts development servers with debug logging enabled
- `dev:ui` - Starts only the Next.js UI server
- `dev:agent` - Starts only the ADK agent server
- `build` - Builds the Next.js application for production
- `start` - Starts the production server
- `lint` - Runs ESLint for code linting
- `install:agent` - Installs Python dependencies for the agent

## 📚 Documentation

### Core Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development workflow, issue templates, and guidelines
- **[Project_Overview.md](Project_Overview.md)** - Generative UI architecture and vision
- **[Architecture Overview](.copilot/knowledge/architecture.md)** - System architecture _(new in this workspace; may not exist on older branches)_
- **[GenUI Development](.copilot/instructions/genui-development.md)** - GenUI patterns and practices _(new in this workspace; may not exist on older branches)_

### Issue Management & Automation

- **[Issue Management System](docs/ISSUE_MANAGEMENT_SYSTEM.md)** - Complete issue system with templates and automation
- **[Knowledge Base Integration](docs/KNOWLEDGE_BASE_INTEGRATION.md)** - Semantic issue enrichment with KB Context Mapper
- **[KB Quick Reference](docs/KB_QUICK_REFERENCE.md)** - Quick start guide for knowledge base features

### Toolset Management

- **[Toolset Management](docs/TOOLSET_MANAGEMENT.md)** - GitHub MCP-style toolset lifecycle automation
- **[Toolset Quick Start](docs/TOOLSET_QUICKSTART.md)** - Quick start guide for toolsets
- **[TOOLSET_README.md](TOOLSET_README.md)** - Toolset system overview

### Code Quality & Patterns

- **[Refactoring Patterns](docs/REFACTORING_PATTERNS.md)** - Project-specific refactoring guides
- **[Schema Crawler](agent-generator/SCHEMA_CRAWLER_README.md)** - JSON Schema → Zod + TypeScript generator
- **[Markdown Automation](docs/MARKDOWN_AUTOMATION.md)** - Automated markdown linting and formatting
- **[Markdown Quick Reference](docs/MARKDOWN_QUICK_REFERENCE.md)** - Quick commands for markdown fixes

### External Resources

- **[ADK Documentation](https://google.github.io/adk-docs/)** - Google ADK features
- **[CopilotKit Documentation](https://docs.copilotkit.ai)** - CopilotKit capabilities
- **[Next.js Documentation](https://nextjs.org/docs)** - Next.js features and API

## 🤖 Issue Reporting & Management

This project uses an intelligent issue management system with:

- ✅ **Structured templates** for bugs, features, toolsets, and questions
- ✅ **Automatic labeling** based on issue content (component, priority, type)
- ✅ **Knowledge Base Context Mapper** - Automatically enriches issues with relevant files and documentation
- ✅ **Toolset lifecycle integration** for deprecation and validation workflows

**How it works**: When you open an issue, the Knowledge Base analyzes the content and automatically:

1. Detects relevant concepts (e.g., "StatCard", "Agent Tools", "State Sync")
2. Links to related files and documentation
3. Suggests appropriate labels
4. Posts a helpful context comment with all the information

**Learn more**: See [Issue Management System](docs/ISSUE_MANAGEMENT_SYSTEM.md) and [Knowledge Base Integration](docs/KNOWLEDGE_BASE_INTEGRATION.md)

## 🔒 Privacy & Security

This workspace follows a **local-first, privacy-focused** approach:

- Client data in `data/` directory never leaves your machine
- All API keys stored in `.env` (git-ignored)
- Agent processing happens locally or through configured endpoints
- Sandboxed execution for generated code

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- DevContainer setup instructions
- Development workflow
- Code standards and conventions
- Testing guidelines
- Pull request process

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Agent Connection Issues

If you see "I'm having trouble connecting to my tools", make sure:

1. The ADK agent is running on port 8000
2. Your Google API key is set correctly
3. Both servers started successfully

### Python Dependencies

If you encounter Python import errors:

```bash
cd agent
pip install -r requirements.txt
```
