# ModMe GenUI Workspace

A **Generative UI (GenUI) R&D laboratory** combining Next.js 16, React 19, and Python ADK for building dynamic, AI-generated interfaces.

[![DevContainer](https://img.shields.io/badge/DevContainer-Ready-blue?logo=docker)](https://github.com/Ditto190/modme-ui-01/tree/main/.devcontainer)
[![CI](https://github.com/Ditto190/modme-ui-01/workflows/CI/badge.svg)](https://github.com/Ditto190/modme-ui-01/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quick Start

### Option 1: GitHub Codespaces (Recommended)
1. Click **Code** → **Codespaces** → **Create codespace**
2. Wait for setup to complete (~3-5 minutes)
3. Run `npm run dev` to start both servers
4. Access UI at forwarded port 3000

### Option 2: DevContainer (Local)
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Clone and open in VS Code
4. Click **Reopen in Container** when prompted
5. Run `npm run dev` after setup completes

### Option 3: Local Setup
```bash
# Quick setup script
./scripts/setup.sh  # Linux/macOS
# or
.\scripts\setup.ps1  # Windows

# Start development servers
npm run dev
```

## 📋 Prerequisites

- Node.js 22.9.0+ (required; earlier versions may cause EBADENGINE warnings and compatibility issues)
  - We recommend using [nvm](https://github.com/nvm-sh/nvm) (Unix/macOS) or [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows) to manage Node.js versions
- Python 3.12+
- Google Makersuite API Key (for the ADK agent) (see https://makersuite.google.com/app/apikey)
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
```

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

For detailed information, see:
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development workflow and guidelines
- [Architecture Overview](.copilot/knowledge/architecture.md) - System architecture *(new in this workspace; may not exist on older branches)*
- [GenUI Development](.copilot/instructions/genui-development.md) - GenUI patterns and practices *(new in this workspace; may not exist on older branches)*
- [ADK Documentation](https://google.github.io/adk-docs/) - Google ADK features
- [CopilotKit Documentation](https://docs.copilotkit.ai) - Explore CopilotKit's capabilities
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API

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