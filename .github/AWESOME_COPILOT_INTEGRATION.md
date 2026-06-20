# Awesome GitHub Copilot Integration Guide

This document describes the integration of **Awesome GitHub Copilot** agents, skills, and collections into the ModMe UI repository.

## What is Awesome GitHub Copilot?

A comprehensive community collection of:
- **Agents** - Specialized Copilot extensions for specific workflows
- **Prompts** - Task-specific prompts for code generation
- **Instructions** - Coding standards and best practices
- **Skills** - Self-contained, reusable components with bundled resources
- **Collections** - Curated theme-based groupings

**Repository**: https://github.com/github/awesome-copilot

## Integrated Collections

### 1. Frontend Web Development (`frontend-web-dev`)
**Tags**: frontend, web, react, typescript, javascript, css, html

Essential resources for modern frontend development:

| Resource | Location | Description |
|----------|----------|-------------|
| **Expert React Frontend Engineer** | `.github/agents/expert-react-frontend-engineer.agent.md` | React 19.2 specialist with hooks, Server Components, and performance |
| **ReactJS Instructions** | `.github/instructions/reactjs.instructions.md` | React coding standards and best practices |
| **Next.js Instructions** | `.github/instructions/nextjs.instructions.md` | Next.js best practices for LLMs |
| **Next.js + Tailwind Instructions** | `.github/instructions/nextjs-tailwind.instructions.md` | Next.js with Tailwind CSS standards |
| **Playwright Test Generation** | `.github/prompts/playwright-generate-test.prompt.md` | Generate Playwright tests using MCP |

### 2. Awesome Copilot Meta Collection (`awesome-copilot`)
**Tags**: github-copilot, discovery, meta, prompt-engineering, agents

Tools for discovering and generating Copilot resources:

| Resource | Location | Description |
|----------|----------|-------------|
| **Suggest Awesome Agents** | `.github/prompts/suggest-awesome-github-copilot-agents.prompt.md` | Auto-recommend relevant agents based on context |
| **Meta Agentic Project Scaffold** | `.github/agents/meta-agentic-project-scaffold.agent.md` | Create and manage project workflows |

## Available Agents in Your Repository

### Expert React Frontend Engineer
**Use When**: Building or reviewing React components

```bash
# In VS Code Copilot Chat:
@expert-react-frontend-engineer
```

**Specialization**:
- React 19.2 hooks and patterns
- Server Components and Actions
- TypeScript strict mode
- Performance optimization
- Accessibility standards

### Copilot Starter Agent
**Use When**: General Copilot assistance

Located at: `.github/agents/copilot-starter.md`

### ModMe UI Agent
**Use When**: ModMe-specific guidance

Located at: `.github/agents/Modme_UI_agent.agent.md`

## How to Use These Resources

### Method 1: Direct Installation (VS Code)

Each resource has install buttons in the markdown files. Click to install:

```
📌 Look for: [Install in VS Code] badge
```

### Method 2: Manual Import

Copy resource files to your local `.github/` directory:

```bash
# Agents
cp .github/agents/expert-react-frontend-engineer.agent.md ~/your-editor-config/

# Instructions
cp .github/instructions/reactjs.instructions.md ~/your-editor-config/

# Prompts
cp .github/prompts/suggest-awesome-github-copilot-agents.prompt.md ~/your-editor-config/
```

### Method 3: Use MCP Server (Recommended)

The Awesome Copilot MCP Server provides dynamic discovery:

```bash
# Docker required
docker run -i --rm ghcr.io/microsoft/mcp-dotnet-samples/awesome-copilot:latest
```

Configure in VS Code `settings.json`:

```json
{
  "github.copilot.advanced": {
    "mcp_awesome_copilot": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/microsoft/mcp-dotnet-samples/awesome-copilot:latest"
      ]
    }
  }
}
```

## Using the Suggest Agents Prompt

This prompt recommends relevant agents based on your project context:

```bash
# In Copilot Chat:
@suggest-awesome-github-copilot-agents
```

**Features**:
- ✅ Analyzes your repository structure
- ✅ Queries MCP awesome-copilot collections
- ✅ Recommends agents matched to your tech stack
- ✅ Avoids suggesting duplicate agents
- ✅ Provides installation instructions

## Integrating with ModMe UI Tools

### 1. Connect with GenUI Components

Use the **Expert React Frontend Engineer** agent when:
- Building new UI components
- Reviewing component patterns
- Optimizing component performance

```bash
# Prompt example:
@expert-react-frontend-engineer
Create a StatCard component following React 19 best practices and the nextjs-tailwind standards
```

### 2. Connect with Agent Skills

Agent Skills in `agent-library/skills/`:
- `webapp-testing` - Testing helpers for web apps
- `azure-role-selector` - Azure RBAC UI
- `snowflake-semanticview` - Data semantics

Copy relevant skills to your agent tools:

```bash
cp -r agent-library/skills/webapp-testing agent/skills/
npm run detect:changes  # Auto-register in toolsets.json
```

### 3. Wire into Agent Toolsets

Update your `agent/main.py` or `agent/toolsets.json`:

```python
# Example: Add React Frontend Engineer tools
ALLOWED_AGENTS = {
    "expert-react-frontend-engineer",
    "modme-ui-agent",
    "copilot-starter"
}
```

## Syncing with Awesome Copilot Updates

To keep resources synchronized with the upstream repo:

```bash
# Update agent-library clone
cd agent-library
git pull origin main

# Re-run validation
npm run collection:validate
npm run skill:validate

# Copy new or updated resources
cp agents/*.agent.md ../.github/agents/
cp collections/*.md ../.github/collections/
```

## Available Skills (From agent-library)

### webapp-testing
**Description**: Self-contained testing helpers for web applications

**Files**: 
- `SKILL.md` - Instructions
- `test-helper.js` - JavaScript test utilities

**Usage**:
```bash
cp -r agent-library/skills/webapp-testing agent/skills/
```

### azure-role-selector
**Description**: Azure RBAC role selection UI component

**Usage**: For Azure-integrated ModMe features

### snowflake-semanticview
**Description**: Semantic view generation for Snowflake

**Usage**: Data analysis features

## Quick Reference

| Task | Command/File |
|------|--------------|
| List agents | `ls .github/agents/*.agent.md` |
| List instructions | `ls .github/instructions/*.instructions.md` |
| List prompts | `ls .github/prompts/*.prompt.md` |
| View React standards | `.github/instructions/reactjs.instructions.md` |
| View Next.js standards | `.github/instructions/nextjs.instructions.md` |
| Suggest agents for project | Use `suggest-awesome-github-copilot-agents.prompt.md` |
| Frontend collection | `.github/collections/frontend-web-dev.md` |
| Awesome Copilot meta | `.github/collections/awesome-copilot.md` |

## Troubleshooting

### Agent not appearing in Copilot Chat

1. Check file exists: `.github/agents/<name>.agent.md`
2. Verify frontmatter format (YAML)
3. Restart VS Code Copilot extension
4. Check MCP server is running (if using MCP method)

### Prompts not suggesting agents

1. Ensure prompt file is in `.github/prompts/`
2. Verify MCP collections are accessible
3. Check prompt has correct `agent: 'agent'` field

### Instructions not applying

1. Verify `.applyTo` field matches your file patterns
2. Check file extensions (.tsx, .ts, .jsx, .js)
3. Reload VS Code window

## Resources

- **Awesome Copilot GitHub**: https://github.com/github/awesome-copilot
- **Copilot Docs**: https://docs.github.com/copilot
- **MCP Specification**: https://spec.modelcontextprotocol.io/
- **Agent Skills Spec**: https://agentskills.io/specification

---

**Last Updated**: 2026-01-08  
**Awesome Copilot Version**: Latest (from main branch)  
**Integration Status**: ✅ Active
