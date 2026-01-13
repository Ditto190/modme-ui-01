# Bootstrap Integration Guide

> **Step-by-step guide for bootstrapping a new AI-powered monorepo from modme-ui-01 components**

**Created**: 2026-01-03  
**Strategy**: Hybrid Bootstrap (see [REPO_COMPARISON.md](./REPO_COMPARISON.md))  
**Components**: [COMPONENT_MANIFEST.json](./COMPONENT_MANIFEST.json)

---

## Overview

This guide walks through creating a new AI-powered development environment by:

1. **Forking** `AdaptiveWorX/ts-fullstack` as the primary base
2. **Integrating** AI automation from `Insajin/AutonomusCompany`
3. **Porting** modme-ui-01 exclusive components (Python ADK, ChromaDB, GenUI)
4. **Adding** collaboration patterns from `zyahav/monorepo-template`

---

## Prerequisites

### Required Tools

```bash
# Node.js 22+ (required by ts-fullstack)
nvm install 22
nvm use 22

# Python 3.12+ (for ADK agent)
pyenv install 3.12
pyenv local 3.12

# Turborepo (from ts-fullstack)
npm install -g turbo

# Biome (100x faster than ESLint)
npm install -g @biomejs/biome
```

### Required API Keys

| Key              | Purpose                    | Source                                                |
| ---------------- | -------------------------- | ----------------------------------------------------- |
| `GOOGLE_API_KEY` | Gemini models + embeddings | [AI Studio](https://makersuite.google.com/app/apikey) |
| `GITHUB_TOKEN`   | MCP GitHub operations      | [GitHub Settings](https://github.com/settings/tokens) |

---

## Phase 1: Foundation (Week 1)

### Step 1.1: Fork Primary Base

```bash
# Fork ts-fullstack
gh repo fork AdaptiveWorX/ts-fullstack --clone --remote
cd ts-fullstack

# Rename to your project
mv ts-fullstack your-project-name
cd your-project-name
```

### Step 1.2: Verify Turborepo Structure

```bash
# Expected structure
ls -la packages/
# Should show:
# - @adaptiveworx/agent (MCP-compatible agent package)
# - @adaptiveworx/ui (UI components)
# - @adaptiveworx/config (shared configs)

ls -la apps/
# Should show:
# - web (Next.js app)
# - docs (documentation)
```

### Step 1.3: Copy AI Workflows

```bash
# Clone AutonomusCompany for reference
git clone https://github.com/Insajin/AutonomusCompany.git /tmp/autonomous

# Copy Claude Code OAuth workflow
cp /tmp/autonomous/.github/workflows/claude-oauth.yml .github/workflows/

# Copy deployment workflows (select relevant platforms)
cp /tmp/autonomous/.github/workflows/deploy-*.yml .github/workflows/

# Copy semantic release config
cp /tmp/autonomous/.releaserc.js .
```

### Step 1.4: Configure Environment

```bash
# Create .env from modme-ui-01 patterns
cat > .env << 'EOF'
# API Keys
GOOGLE_API_KEY=your_key_here
GITHUB_TOKEN=your_token_here

# Development
NODE_ENV=development
PORT=3000
AGENT_PORT=8000
EOF
```

---

## Phase 2: Python Integration (Week 2)

### Step 2.1: Create Python Agent Package

```bash
# Create new package directory
mkdir -p packages/python-agent
cd packages/python-agent

# Initialize Python project
cat > pyproject.toml << 'EOF'
[project]
name = "python-agent"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "google-adk>=0.1.0",
    "ag-ui-adk>=0.1.0",
    "fastapi>=0.115.0",
    "uvicorn>=0.32.0",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[tool.ruff]
line-length = 100
target-version = "py312"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
EOF
```

### Step 2.2: Port Agent Code

```bash
# Copy from modme-ui-01
cp /path/to/modme-ui-01/agent/main.py packages/python-agent/src/
cp /path/to/modme-ui-01/agent/toolset_manager.py packages/python-agent/src/

# Copy toolset definitions
cp /path/to/modme-ui-01/agent/toolsets.json packages/python-agent/config/
cp /path/to/modme-ui-01/agent/toolset_aliases.json packages/python-agent/config/
cp /path/to/modme-ui-01/agent/toolset-schema.json packages/python-agent/config/
```

### Step 2.3: Update Turborepo Config

```bash
# Add Python package to turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "agent:dev": {
      "cache": false,
      "persistent": true
    }
  }
}
EOF
```

### Step 2.4: Create Agent Start Script

```bash
# packages/python-agent/scripts/start.sh
cat > packages/python-agent/scripts/start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
source .venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port ${AGENT_PORT:-8000} --reload
EOF
chmod +x packages/python-agent/scripts/start.sh
```

---

## Phase 3: TypeScript Tools (Week 3)

### Step 3.1: Port Schema Crawler

```bash
# Create codegen package
mkdir -p packages/codegen/src

# Copy schema crawler
cp /path/to/modme-ui-01/agent-generator/src/mcp-registry/schema-crawler.ts packages/codegen/src/

# Create package.json
cat > packages/codegen/package.json << 'EOF'
{
  "name": "@your-org/codegen",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
EOF
```

### Step 3.2: Port Knowledge Base System

```bash
# Create knowledge-management package
mkdir -p packages/knowledge-management/src

# Copy context mapper and components
cp /path/to/modme-ui-01/scripts/knowledge-management/*.js packages/knowledge-management/src/

# Copy documentation
cp /path/to/modme-ui-01/docs/KNOWLEDGE_*.md packages/knowledge-management/docs/
```

### Step 3.3: Port Component Registry

```bash
# Copy registry components to apps/web
cp -r /path/to/modme-ui-01/src/components/registry/* apps/web/components/registry/

# Copy types
cp /path/to/modme-ui-01/src/lib/types.ts apps/web/lib/
```

---

## Phase 4: Workflows & Collaboration (Week 4)

### Step 4.1: Port GitHub Actions

```bash
# Copy code indexing workflow
cp /path/to/modme-ui-01/.github/workflows/build-code-index.yml .github/workflows/

# Copy toolset validation
cp /path/to/modme-ui-01/.github/workflows/toolset-*.yml .github/workflows/

# Update paths in workflows for new structure
sed -i 's|agent/|packages/python-agent/|g' .github/workflows/*.yml
```

### Step 4.2: Add Git Worktrees

```bash
# Clone worktree scripts from zyahav/monorepo-template
cp /tmp/zyahav-template/scripts/worktree-*.sh scripts/

# Create worktree helper
cat > scripts/create-feature-worktree.sh << 'EOF'
#!/bin/bash
FEATURE_NAME=$1
BRANCH_NAME="feature/${FEATURE_NAME}"

# Create new branch and worktree
git worktree add "../${FEATURE_NAME}" -b "${BRANCH_NAME}"

echo "Created worktree at ../${FEATURE_NAME}"
echo "To enter: cd ../${FEATURE_NAME}"
echo "To remove: git worktree remove ../${FEATURE_NAME}"
EOF
chmod +x scripts/create-feature-worktree.sh
```

### Step 4.3: Configure VS Code Tasks

```bash
# Create .vscode/tasks.json
cat > .vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev",
      "type": "shell",
      "command": "turbo dev",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Start Agent",
      "type": "shell",
      "command": "cd packages/python-agent && ./scripts/start.sh",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Validate Toolsets",
      "type": "npm",
      "script": "validate:toolsets"
    }
  ]
}
EOF
```

---

## Phase 5: Documentation & Testing (Week 5)

### Step 5.1: Unify Documentation

```bash
# Create docs directory structure
mkdir -p docs/{guides,reference,migration}

# Copy critical docs from modme-ui-01
cp /path/to/modme-ui-01/docs/REFACTORING_PATTERNS.md docs/reference/
cp /path/to/modme-ui-01/docs/TOOLSET_*.md docs/reference/
cp /path/to/modme-ui-01/PORTING_GUIDE.md docs/migration/
cp /path/to/modme-ui-01/COMPONENT_MANIFEST.json docs/reference/
```

### Step 5.2: Create Unified README

```bash
# Update root README.md
cat > README.md << 'EOF'
# Your Project Name

> AI-powered monorepo with GenUI, MCP tools, and automated workflows

## Quick Start

```bash
# Install dependencies
npm install

# Start all services
turbo dev

# Or start individually
turbo dev --filter=web     # Next.js app
turbo agent:dev            # Python ADK agent
````

## Architecture

```
your-project/
├── apps/
│   ├── web/              # Next.js GenUI app
│   └── docs/             # Documentation site
├── packages/
│   ├── agent/            # MCP-compatible TypeScript agent
│   ├── python-agent/     # ADK Python agent
│   ├── codegen/          # Schema crawler & type generation
│   └── knowledge-management/  # Issue context mapping
└── .github/
    └── workflows/        # CI/CD + Claude Code integration
```

## Key Features

- 🎨 **GenUI Components**: StatCard, DataTable, ChartCard
- 🤖 **Dual Agents**: TypeScript (MCP) + Python (ADK)
- 🔧 **Toolset Management**: Validation, aliases, deprecation
- 📊 **ChromaDB Indexing**: Code search & RAG
- 🚀 **14 Deploy Platforms**: Vercel, Cloudflare, AWS, etc.
  EOF

````

### Step 5.3: Validate Integration

```bash
# Run full validation
turbo lint
turbo test
npm run validate:toolsets

# Check Python agent
cd packages/python-agent
source .venv/bin/activate
pytest

# Health check
curl http://localhost:8000/health
curl http://localhost:8000/ready
````

---

## Verification Checklist

### Phase 1 Complete ✅

- [ ] ts-fullstack forked and renamed
- [ ] AI workflows copied from AutonomusCompany
- [ ] Environment variables configured
- [ ] `turbo dev` starts successfully

### Phase 2 Complete ✅

- [ ] packages/python-agent/ created
- [ ] ADK agent ported and running
- [ ] `/health` endpoint responds
- [ ] `/ready` endpoint shows toolsets

### Phase 3 Complete ✅

- [ ] Schema crawler ported to packages/codegen/
- [ ] Knowledge base system ported
- [ ] Component registry ported to apps/web/
- [ ] Types aligned between Python and TypeScript

### Phase 4 Complete ✅

- [ ] GitHub Actions updated for new paths
- [ ] Git worktree scripts working
- [ ] VS Code tasks configured
- [ ] CI pipeline passing

### Phase 5 Complete ✅

- [ ] Documentation unified in docs/
- [ ] README updated for new structure
- [ ] All tests passing
- [ ] Health checks responding

---

## Troubleshooting

### Python Agent Not Starting

```bash
# Check virtual environment
cd packages/python-agent
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Verify dependencies
pip list | grep -E "(google-adk|fastapi)"
```

### Toolset Validation Failing

```bash
# Check JSON schemas
npm run validate:toolsets -- --verbose

# Common issues:
# - Missing required fields in toolsets.json
# - Circular alias references
# - Invalid toolset names (must be lowercase_with_underscores)
```

### Turborepo Cache Issues

```bash
# Clear Turborepo cache
turbo clean

# Rebuild all packages
turbo build --force
```

### Import Path Errors

```bash
# After moving files, update TypeScript paths in tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@your-org/*": ["packages/*/src"]
    }
  }
}
```

---

## Next Steps After Bootstrap

1. **Enable GitHub Toolsets**: Use MCP `enable_toolset` for repos, issues, PRs
2. **Configure ChromaDB**: Set up code indexing workflow
3. **Add React Spectrum**: `npm install @react-aria/hooks` for accessibility
4. **Create First Agent Tool**: Follow pattern in REFACTORING_PATTERNS.md

---

## Reference

- **REPO_COMPARISON.md**: Full analysis of candidate repos
- **COMPONENT_MANIFEST.json**: Component compatibility matrix
- **PORTING_GUIDE.md**: Original porting documentation
- **REFACTORING_PATTERNS.md**: Code patterns for agents and tools

---

_Generated from modme-ui-01 porting infrastructure_
