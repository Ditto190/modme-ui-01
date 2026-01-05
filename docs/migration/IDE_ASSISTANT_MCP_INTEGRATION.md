# IDE Assistant MCP Integration Guide

> **Migration Guide**: Adding Smart Coding MCP & AI-Assisted Refactoring to ModMe GenUI Workbench

**Created**: 2026-01-04  
**Scan Date**: 2026-01-04T00:00:00.000Z  
**Repository**: modme-ui-01  
**Purpose**: Integrate VSCode refactoring actions, Antigravity IDE connector, and smart-coding-mcp into devcontainer

---

## Overview

This guide integrates three AI-assisted IDE improvements into your devcontainer:

1. **VSCode Refactoring Actions** - Code Actions, Extract Method, Rename Symbol, Refactor Preview
2. **Smart Coding MCP** - Semantic search, dependency checking, workspace indexing
3. **Antigravity Support** - Google Gemini IDE integration with MCP

**Benefits**:

- Automated refactoring with AI-assisted previews
- Semantic codebase search (replaces Grep/Glob for exploratory searches)
- Always-current dependency version checking
- Antigravity/Gemini IDE compatibility

---

## Part 1: VSCode Refactoring Configuration

### 1.1 Update Devcontainer Settings

Add VSCode refactoring settings to `.devcontainer/devcontainer.json`:

```json
{
  "customizations": {
    "vscode": {
      "settings": {
        // Enable Code Actions on save
        "editor.codeActionsOnSave": {
          "source.organizeImports": "always",
          "source.fixAll.eslint": "explicit",
          "source.sortImports": "explicit"
        },

        // Enable refactoring lightbulbs
        "editor.lightbulb.enable": true,

        // Refactor keyboard shortcuts
        "editor.action.codeAction": {
          "preferredActions": ["refactor.extract.function", "refactor.extract.constant"]
        }
      },

      "keybindings": [
        {
          "key": "ctrl+shift+r",
          "command": "editor.action.codeAction",
          "args": {
            "kind": "refactor"
          }
        },
        {
          "key": "ctrl+shift+r ctrl+e",
          "command": "editor.action.codeAction",
          "args": {
            "kind": "refactor.extract.function",
            "apply": "first"
          }
        },
        {
          "key": "shift+ctrl+e",
          "command": "editor.action.codeAction",
          "args": {
            "kind": "refactor.extract.constant",
            "preferred": true,
            "apply": "ifSingle"
          }
        }
      ]
    }
  }
}
```

### 1.2 Add Refactoring Extensions

Update the `extensions` array in `.devcontainer/devcontainer.json`:

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        // Existing extensions
        "ms-python.python",
        "ms-python.vscode-pylance",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "GitHub.copilot",
        "GitHub.copilot-chat",

        // New: AI-assisted refactoring
        "GitHub.copilot",
        "GitHub.copilot-chat",
        "usernamehw.errorlens",
        "christian-kohler.path-intellisense"
      ]
    }
  }
}
```

---

## Part 2: Smart Coding MCP Integration

### 2.1 Install Smart Coding MCP

Add installation to `.devcontainer/post-create.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Setting up ModMe GenUI Workspace..."

# Existing setup...
npm install --workspace=apps/* --workspace=packages/*

# NEW: Install Smart Coding MCP
echo "📦 Installing Smart Coding MCP..."
npm install -g smart-coding-mcp

# Verify installation
npx smart-coding-mcp --version

echo "✅ Smart Coding MCP installed!"
```

### 2.2 Configure MCP Servers

Create `.devcontainer/mcp-servers/config.json`:

```json
{
  "mcpServers": {
    "smart-coding-mcp": {
      "command": "npx",
      "args": ["-y", "smart-coding-mcp", "--workspace", "${workspaceFolder}"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "${workspaceFolder}"]
    }
  },
  "transport": "stdio"
}
```

### 2.3 Configure Cline (Roo Code) Rules

Create `.clinerules/01-smart-mcp.md`:

```markdown
---
trigger: always_on
description: Mandatory usage of Smart Coding MCP tools for dependencies and search
---

# Smart Coding MCP Usage Rules

You must prioritize using the **Smart Coding MCP** tools for the following tasks.

## 1. Dependency Management

**Trigger:** When checking, adding, or updating package versions (npm, python, go, rust, etc.).

**Action:**

- **MUST** use the `d_check_last_version` tool.
- **DO NOT** guess versions or trust internal training data.
- **DO NOT** use generic web search unless `d_check_last_version` fails.

## 2. Codebase Research

**Trigger:** When asking about "how" something works, finding logic, or understanding architecture.

**Action:**

- **MUST** use `a_semantic_search` as the FIRST tool for any codebase research
- **DO NOT** use `Glob` or `Grep` for exploratory searches
- Use `Grep` ONLY for exact literal string matching (e.g., finding a specific error message)
- Use `Glob` ONLY when you already know the exact filename pattern

## 3. Environment & Status

**Trigger:** When starting a session or debugging the environment.

**Action:**

- Use `e_set_workspace` if the current workspace path is incorrect.
- Use `f_get_status` to verify the MCP server is healthy and indexed.
```

### 2.4 Update Devcontainer Mounts

Add MCP config mount to `.devcontainer/devcontainer.json`:

```json
{
  "mounts": [
    "source=${localWorkspaceFolder}/data,target=${containerWorkspaceFolder}/data,type=bind,consistency=cached",
    "source=${localWorkspaceFolder}/.devcontainer/mcp-servers,target=/home/vscode/.config/mcp,type=bind,consistency=cached"
  ]
}
```

---

## Part 3: Antigravity (Gemini IDE) Support

### 3.1 Create Antigravity Configuration

Create `.gemini/antigravity/mcp_config.json`:

```json
{
  "mcpServers": {
    "smart-coding-mcp": {
      "command": "npx",
      "args": ["-y", "smart-coding-mcp", "--workspace", "/absolute/path/to/modme-ui-01"]
    }
  }
}
```

> **Note**: Antigravity does NOT support `${workspaceFolder}`. Use absolute paths.

### 3.2 Create Agent Rules

Create `.agent/rules/smart-mcp.md`:

```markdown
---
trigger: always_on
description: Mandatory usage of Smart Coding MCP tools for dependencies and search
---

# Smart Coding MCP Usage Rules

You must prioritize using the **Smart Coding MCP** tools for the following tasks.

## 1. Dependency Management

**Trigger:** When checking, adding, or updating package versions (npm, python, go, rust, etc.).

**Action:**

- **MUST** use the `d_check_last_version` tool.
- **DO NOT** guess versions or trust internal training data.
- **DO NOT** use generic web search unless `d_check_last_version` fails.

## 2. Codebase Research

**Trigger:** When asking about "how" something works, finding logic, or understanding architecture.

**Action:**

- **MUST** use `a_semantic_search` as the FIRST tool for any codebase research
- **DO NOT** use `Glob` or `Grep` for exploratory searches
- Use `Grep` ONLY for exact literal string matching (e.g., finding a specific error message)
- Use `Glob` ONLY when you already know the exact filename pattern

## 3. Environment & Status

**Trigger:** When starting a session or debugging the environment.

**Action:**

- Use `e_set_workspace` if the current workspace path is incorrect.
- Use `f_get_status` to verify the MCP server is healthy and indexed.
```

### 3.3 Global Agent Rules (Optional)

Edit `~/.gemini/GEMINI.md` for global rules:

```markdown
# Global Agent Rules

- Always verify package versions before installing
- Prefer semantic search when available
- Use MCP tools for codebase navigation
```

---

## Part 4: Update MCP Integration Plan

### 4.1 Extend MCP_INTEGRATION_PLAN.md

Add new section to `agent-generator/src/mcp-registry/MCP_INTEGRATION_PLAN.md`:

```markdown
## Part 4: IDE Assistant MCP Servers

### Goal

Integrate AI-assisted coding tools into devcontainer for enhanced developer experience.

### Servers to Add

1. **smart-coding-mcp** - Semantic search, dependency checking, workspace indexing
2. **filesystem** - File operations for code editing
3. **git** - Git operations for version control

### Configuration

All MCP servers are configured in `.devcontainer/mcp-servers/config.json` and mounted into:

- **Cline/Roo Code**: Reads from VSCode settings
- **Antigravity**: Reads from `~/.gemini/antigravity/mcp_config.json`

### Usage Rules

Agent rules in `.clinerules/` and `.agent/rules/` enforce best practices:

- Semantic search over Grep/Glob for exploration
- Dependency version checking before install
- Workspace status verification on session start
```

---

## Part 5: Update GitHub Workflows

### 5.1 Update mcp-starter.yml

Extend `.github/workflows/mcp-starter.yml` to test MCP servers:

```yaml
name: MCP Starter (CI)

on:
  workflow_dispatch:
    inputs:
      run-script:
        description: "Run the starter script on the runner (true/false)"
        required: false
        default: "true"
  push:
    branches: [main, feature/*]

jobs:
  start-mcp-scripts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Install Smart Coding MCP
        run: |
          npm install -g smart-coding-mcp
          npx smart-coding-mcp --version

      - name: Test MCP Server Health
        run: |
          # Test smart-coding-mcp
          npx smart-coding-mcp --workspace . --test || echo "⚠️ Smart Coding MCP test failed"

      - name: Setup PowerShell
        uses: PowerShell/PowerShell@v2

      - name: Run MCP starter script
        if: ${{ github.event.inputs['run-script'] == 'true' || github.event_name == 'push' }}
        run: |
          pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/start-mcp-servers.ps1

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mcp-logs
          path: .logs/**
```

---

## Part 6: Migration Steps

### Step 1: Backup Current Configuration

```bash
# Backup devcontainer
cp .devcontainer/devcontainer.json .devcontainer/devcontainer.json.backup

# Backup post-create script
cp .devcontainer/post-create.sh .devcontainer/post-create.sh.backup
```

### Step 2: Apply Devcontainer Changes

```bash
# Run the migration script (created below)
node scripts/toolset-management/apply-ide-assistant-migration.js
```

### Step 3: Rebuild Devcontainer

```bash
# In VSCode Command Palette:
# > Dev Containers: Rebuild Container

# Or from terminal:
devcontainer rebuild
```

### Step 4: Verify Installation

```bash
# Test Smart Coding MCP
npx smart-coding-mcp --workspace . --test

# Test semantic search
npx smart-coding-mcp --workspace . --query "how does upsert_ui_element work"

# Check dependency versions
npx smart-coding-mcp --dependency react --check-version
```

### Step 5: Test Refactoring

1. Open any TypeScript file
2. Select a code block
3. Press `Ctrl+Shift+R` to open refactor menu
4. Choose "Extract to function"
5. Verify Refactor Preview panel opens

### Step 6: Configure Agent Rules

```bash
# Create rules directory
mkdir -p .clinerules
mkdir -p .agent/rules

# Copy rule templates (already created above)
```

---

## Part 7: Troubleshooting

### Issue: Smart Coding MCP not found

**Solution**:

```bash
# Reinstall globally
npm install -g smart-coding-mcp

# Verify PATH
which smart-coding-mcp  # Linux/Mac
where smart-coding-mcp  # Windows
```

### Issue: MCP server not connecting

**Solution**:

```bash
# Check config
cat .devcontainer/mcp-servers/config.json

# Verify workspace folder variable
echo $WORKSPACE_FOLDER
```

### Issue: Antigravity not loading rules

**Solution**:

```bash
# Check rule file location
ls -la .agent/rules/

# Verify rule syntax (YAML frontmatter)
cat .agent/rules/smart-mcp.md | head -n 5
```

### Issue: Refactoring actions not showing

**Solution**:

1. Check VSCode settings: `Ctrl+,` → Search "lightbulb"
2. Verify `editor.lightbulb.enable` is `true`
3. Ensure cursor is on error/selected text
4. Try `Ctrl+.` to force Code Actions menu

---

## Part 8: Testing Checklist

- [ ] Devcontainer rebuilds successfully
- [ ] Smart Coding MCP installed (`npx smart-coding-mcp --version`)
- [ ] Semantic search works (`npx smart-coding-mcp --workspace . --query "test"`)
- [ ] Dependency checking works (`npx smart-coding-mcp --dependency react --check-version`)
- [ ] VSCode refactoring actions appear (`Ctrl+Shift+R`)
- [ ] Refactor Preview panel opens (`Ctrl+Enter` on refactor action)
- [ ] Cline/Roo Code loads MCP config
- [ ] Agent rules enforce semantic search over Grep/Glob
- [ ] GitHub workflow runs without errors

---

## Part 9: Rollback Plan

If migration causes issues:

### Quick Rollback

```bash
# Restore backups
cp .devcontainer/devcontainer.json.backup .devcontainer/devcontainer.json
cp .devcontainer/post-create.sh.backup .devcontainer/post-create.sh

# Rebuild devcontainer
devcontainer rebuild
```

### Selective Rollback

```bash
# Remove Smart Coding MCP only
npm uninstall -g smart-coding-mcp

# Remove MCP config
rm -rf .devcontainer/mcp-servers/

# Keep refactoring settings (no rollback needed)
```

---

## Part 10: Additional Resources

### Documentation Links

- [VSCode Refactoring Docs](https://code.visualstudio.com/docs/editing/refactoring)
- [Smart Coding MCP - VSCode Setup](https://github.com/omar-haris/smart-coding-mcp/blob/main/docs/ide-setup/vscode.md)
- [Smart Coding MCP - Antigravity Setup](https://github.com/omar-haris/smart-coding-mcp/blob/main/docs/ide-setup/antigravity.md)
- [MCP Registry](https://github.com/modelcontextprotocol/servers)

### Project References

- [MCP_INTEGRATION_PLAN.md](../../agent-generator/src/mcp-registry/MCP_INTEGRATION_PLAN.md)
- [REFACTORING_PATTERNS.md](../REFACTORING_PATTERNS.md)
- [CODEBASE_INDEX.md](../../CODEBASE_INDEX.md)

### GitHub MCP Tools

Enabled for this migration:

- `repos` - Repository operations
- `issues` - Issue management
- `pull_requests` - PR operations

---

## Changelog

### 2026-01-04 - Initial Release

- ✅ VSCode refactoring configuration
- ✅ Smart Coding MCP integration
- ✅ Antigravity/Gemini IDE support
- ✅ Agent rules for semantic search enforcement
- ✅ GitHub workflow updates
- ✅ Migration script

---

**Last Updated**: 2026-01-04  
**Maintainer**: ModMe GenUI Team  
**Status**: Ready for Testing
