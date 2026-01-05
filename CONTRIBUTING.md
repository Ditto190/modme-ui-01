# Contributing to ModMe GenUI Workspace

Thank you for your interest in contributing! This guide will help you get started with the development environment and issue reporting.

## Table of Contents

- [Issue Templates & Reporting](#issue-templates--reporting)
- [Automatic Labeling](#automatic-labeling)
- [Development Environment Setup](#development-environment-setup)
- [Using DevContainer](#using-devcontainer)
- [Local Development](#local-development)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Issue Templates & Reporting

We use structured issue templates to ensure we can help you quickly and effectively. Please choose the appropriate template when creating an issue:

### 🐛 Bug Report

Use for reporting bugs or unexpected behavior in the system.

**When to use:**

- Component not rendering correctly
- State sync issues between Python agent and React UI
- Build or runtime errors
- Performance problems

**What to include:**

- Clear reproduction steps
- Expected vs actual behavior
- Error logs or screenshots
- Environment details (OS, Node.js, Python versions)

[**→ Create Bug Report**](../../issues/new?template=bug-report.yml)

---

### ✨ Feature Request

Propose new features or enhancements.

**When to use:**

- New component types for the registry
- Agent tool improvements
- UI/UX enhancements
- Performance optimizations
- Documentation additions

**What to include:**

- Problem statement (what gap does this fill?)
- Proposed solution with examples
- Use cases
- Implementation considerations

[**→ Create Feature Request**](../../issues/new?template=feature-request.yml)

---

### 🛠️ Toolset Management Issue

For issues related to the GitHub MCP-style toolset lifecycle automation.

**When to use:**

- Registering new toolsets
- Requesting toolset deprecation
- Alias resolution problems
- Validation failures
- Migration guide issues

**What to include:**

- Toolset ID affected
- Current vs expected behavior
- Breaking changes (for deprecations)
- Migration path (for deprecations)

[**→ Create Toolset Issue**](../../issues/new?template=toolset-management.yml)

📚 **Related**: [Toolset Management Guide](docs/TOOLSET_MANAGEMENT.md)

---

### ❓ Question

Ask questions about using or contributing to the project.

**When to use:**

- Setup or getting started questions
- Architecture or design questions
- How-to questions
- Contributing guidance

**Before asking:**

1. Check the [README](README.md)
2. Search [existing discussions](../../discussions)
3. Review relevant [documentation](docs/)

[**→ Ask Question**](../../issues/new?template=question.yml)

---

## Automatic Labeling

Issues are automatically labeled based on your template selections. Here's what labels mean:

### Component Labels

- `agent` - Python agent backend (agent/main.py)
- `frontend` - React UI (src/app/page.tsx)
- `state-sync` - State synchronization between agent and UI
- `component-registry` - UI component registry (StatCard, DataTable, etc.)
- `theme` - Theme system and styling
- `toolset` - Toolset management system
- `api` - CopilotKit API layer
- `documentation` - Documentation updates
- `build-system` - npm/uv/Docker build configuration

### Priority Labels

- `priority:critical` - Blocking issue requiring immediate attention
- `priority:high` - Significant impact, should be addressed soon
- `priority:medium` - Nice to have, moderate importance
- `priority:low` - Future enhancement, low urgency

### Status Labels

- `status:triage` - Awaiting maintainer review
- `status:needs-info` - More information needed from reporter
- `status:in-progress` - Being actively worked on
- `status:blocked` - Waiting on external dependency

### Toolset-Specific Labels

- `toolset:new` - New toolset registration
- `toolset:deprecation` - Toolset deprecation request
- `toolset:validation` - Validation failure
- `toolset:alias` - Alias resolution issue

---

## Issue Lifecycle

1. **Opened** → Auto-labeled with `status:triage` + component labels
2. **Triage** → Maintainer reviews within 48 hours
3. **Labeled** → Issue categorized with priority + status
4. **Assigned** → Contributor takes ownership
5. **In Progress** → Work begins, label updated to `status:in-progress`
6. **PR Created** → Linked to issue
7. **Resolved** → Issue closed when PR merged

---

## Development Environment Setup

### Prerequisites

- **Node.js**: 22.9.0 or higher (use [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows))
- **Python**: 3.12 or higher
- **Git**: Latest version
- **Optional**: Docker Desktop (for DevContainer)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Ditto190/modme-ui-01.git
cd modme-ui-01

# Run the setup script
./scripts/setup.sh  # Linux/macOS
# or
.\scripts\setup.ps1  # Windows PowerShell

# Start development servers
npm run dev
```

## Using DevContainer

DevContainers provide a consistent, portable development environment that works across different machines.

### Option 1: GitHub Codespaces (Easiest)

1. Go to the repository on GitHub
2. Click the **Code** button
3. Select **Codespaces** tab
4. Click **Create codespace on main**
5. Wait for the environment to build (3-5 minutes)
6. Start coding! All dependencies are pre-installed.

### Option 2: VS Code + Docker Desktop (Local)

#### Setup

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install [VS Code](https://code.visualstudio.com/)
3. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

#### Open in DevContainer

1. Clone the repository
2. Open the folder in VS Code
3. When prompted, click **Reopen in Container**
   - Or use Command Palette (Ctrl+Shift+P): `Dev Containers: Reopen in Container`
4. Wait for the container to build (5-10 minutes first time)
5. The `postCreateCommand` will automatically set up dependencies

#### DevContainer Features

- ✅ Pre-installed Node.js 22.9.0 with nvm
- ✅ Pre-installed Python 3.12 with uv
- ✅ All VS Code extensions configured
- ✅ Port forwarding for UI (3000) and Agent (8000)
- ✅ Automatic dependency installation
- ✅ Git configuration preserved

### Option 3: DevContainer CLI

```bash
# Install devcontainer CLI
npm install -g @devcontainers/cli

# Build and run
devcontainer up --workspace-folder .

# Execute commands in container
devcontainer exec --workspace-folder . npm run dev
```

## Local Development

If you prefer not to use DevContainers:

### Initial Setup

```bash
# Install Node.js 22.9.0 using nvm
nvm install 22.9.0
nvm use 22.9.0

# Install dependencies
./scripts/setup.sh  # or setup.ps1 on Windows

# Configure environment
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
```

### Development Commands

```bash
# Start both UI and Agent servers
npm run dev

# Start only UI server (localhost:3000)
npm run dev:ui

# Start only Agent server (localhost:8000)
npm run dev:agent

# Run linting
npm run lint

# Build for production
npm run build

# Run health check
./scripts/health-check.sh
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Follow the [GenUI Development Guidelines](.copilot/instructions/genui-development.md) for coding patterns.

### 3. Test Your Changes

```bash
# Run linting
npm run lint

# Type check TypeScript
npx tsc --noEmit

# Check Python code
cd agent
uv run flake8 .
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: your descriptive commit message"
```

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Standards

### TypeScript/React

- Use functional components with hooks
- Follow existing patterns in `src/components/`
- Use Tailwind CSS for styling
- Add TypeScript types for all props
- Keep components small and focused

### Python

- Follow PEP 8 style guide
- Use type hints
- Document functions with docstrings
- Keep tools focused and testable

### General

- Write self-documenting code
- Add comments for complex logic
- Update documentation when changing behavior
- Ensure privacy and security constraints are met

## Testing

### Manual Testing

1. Start the development servers: `npm run dev`
2. Access UI at <http://localhost:3000>
3. Test your changes in the browser
4. Check agent logs in the terminal

### Automated Testing

```bash
# Run TypeScript type checking
npx tsc --noEmit

# Run linting
npm run lint

# Python linting
cd agent && uv run flake8 .
```

## Submitting Changes

### Before Submitting

- ✅ Code passes all linting checks
- ✅ No TypeScript errors
- ✅ Python code follows style guidelines
- ✅ Changes are tested locally
- ✅ Documentation is updated
- ✅ No sensitive data (API keys, credentials) committed
- ✅ `.env` file is not committed

### Pull Request Guidelines

1. **Title**: Use conventional commit format
2. **Description**: Explain what and why
3. **Screenshots**: Include for UI changes
4. **Testing**: Describe how you tested
5. **Breaking Changes**: Clearly document if any

## Getting Help

- 📖 Read [Architecture Documentation](.copilot/knowledge/architecture.md)
- 💬 Ask in GitHub Discussions
- 🐛 Report bugs via GitHub Issues
- 📧 Contact maintainers

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [CopilotKit Documentation](https://docs.copilotkit.ai)

Thank you for contributing! 🎉
