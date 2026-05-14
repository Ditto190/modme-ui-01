# Agent & Skill Builder Utilities Guide

**Purpose**: Comprehensive guide to utilities for generating agents, skills, prompts, instructions, and collections for GitHub Copilot.

---

## 📂 Repository Structure Overview

### **agent-library** (`modme-ui-01-test-worktree/agent-library`)

The "awesome-copilot" repository containing **production-ready** agents, prompts, skills, instructions, and collections.

```
agent-library/
├── agents/              # *.agent.md files (Custom Agents)
├── prompts/             # *.prompt.md files (Reusable prompts)
├── instructions/        # *.instructions.md files (Coding standards)
├── skills/              # Skill folders (Self-contained capabilities)
├── collections/         # *.collection.yml + *.md (Grouped resources)
├── docs/               # Documentation (README.agents.md, etc.)
└── .schemas/           # JSON schemas for validation
```

### **agent-generator** (`modme-ui-01-test-worktree/agent-generator`)

The **development workspace** containing tools, downloaded skills, scripts, and generators.

```
agent-generator/
├── src/
│   ├── skills/          # Downloaded skills from awesome-copilot
│   │   └── skill-creator/  # 🔧 Skill creation utilities
│   │       ├── SKILL.md    # Guide for creating skills
│   │       └── scripts/
│   │           ├── init_skill.py     # 🆕 Initialize new skills
│   │           ├── package_skill.py  # 📦 Package skills as .skill files
│   │           └── quick_validate.py # ✅ Validate skill structure
│   ├── mcp-registry/    # MCP integration tools
│   │   ├── schema-crawler.ts        # JSON Schema → Zod + TypeScript
│   │   ├── molecule-generator.ts    # Generate semantic wrappers
│   │   └── registry-fetcher.ts      # Fetch MCP registries
│   ├── scripts/         # Generation scripts
│   │   ├── generate-agent-schemas.ts  # Agent tool schema generator
│   │   └── generate.ts                # General generation script
│   └── tools/           # Tool definitions
│       └── agent-tools.json  # JSON Schema definitions for agent tools
├── output/             # Generated files
│   └── schemas/        # Generated Zod schemas
└── package.json        # npm scripts
```

---

## 🛠️ Key Utilities & Their Purpose

### 1. **Skill Creator** (`src/skills/skill-creator/`)

**Purpose**: Create and validate GitHub Copilot Skills (self-contained folders with instructions and bundled resources).

#### **Tools Available:**

##### 🆕 **init_skill.py** - Initialize New Skills

```bash
# Initialize a new skill
python agent-generator/src/skills/skill-creator/scripts/init_skill.py \
    my-new-skill --path agent-library/skills
```

**What it creates:**

- `my-new-skill/SKILL.md` with YAML frontmatter and Markdown instructions
- `my-new-skill/scripts/` (optional executable code)
- `my-new-skill/references/` (optional documentation)
- `my-new-skill/assets/` (optional files for output)

##### ✅ **quick_validate.py** - Validate Skill Structure

```bash
# Validate a skill folder
python agent-generator/src/skills/skill-creator/scripts/quick_validate.py \
    agent-library/skills/my-skill
```

**Checks:**

- SKILL.md exists
- YAML frontmatter has required fields (name, description)
- Frontmatter is valid YAML
- Folder structure is correct

##### 📦 **package_skill.py** - Package Skills

```bash
# Package a skill into a distributable .skill file (zip)
python agent-generator/src/skills/skill-creator/scripts/package_skill.py \
    agent-library/skills/my-skill ./dist
```

**Output**: `my-skill.skill` (zip archive) ready for distribution.

---

### 2. **Schema Crawler** (`src/mcp-registry/schema-crawler.ts`)

**Purpose**: Generate Zod validation schemas + TypeScript types from JSON Schema definitions.

**Usage:**

```bash
# Generate Zod schemas for agent tools
npm run generate:agent-schemas
```

**Input**: `src/tools/agent-tools.json` (JSON Schema definitions)
**Output**: TypeScript files in `output/schemas/agent-tools/`:

- `upsert_ui_element.schema.ts` - Zod schema + validators
- `remove_ui_element.schema.ts`
- `clear_canvas.schema.ts`
- `setThemeColor.schema.ts`
- `index.ts` - Barrel exports
- `registry.ts` - Tool registry

**Generated per tool:**

- TypeScript interfaces
- Zod schemas (input + output)
- Validators (throwing + safe versions)
- Tool definitions

---

### 3. **MCP Integration Tools** (`src/mcp-registry/`)

#### **molecule-generator.ts** - Semantic Wrappers

**Purpose**: Generate high-level semantic wrappers for MCP tools.

**Planned usage:**

```typescript
// Instead of calling upsert_ui_element directly
await createStatCard({ title: "Revenue", value: 1234 });
```

#### **registry-fetcher.ts** - MCP Registry Fetching

**Purpose**: Fetch and index MCP registry data.

---

### 4. **NPM Scripts** (`package.json`)

```bash
# Schema generation
npm run generate:agent-schemas    # Generate Zod schemas for agent tools

# Documentation
npm run docs:all                  # Generate all docs + diagrams
npm run docs:sync                 # Sync JSON ↔ Markdown
npm run docs:md-to-json           # Markdown → JSON
npm run docs:json-to-md           # JSON → Markdown

# Validation
npm run validate:toolsets         # Validate toolset JSON schemas

# Testing (schema-crawler)
cd agent-generator
npm run test:schema-crawler       # Test schema generation
```

---

## 📋 File Format Reference

### Custom Agents (`*.agent.md`)

**Location**: `agent-library/agents/`

**Format:**

```markdown
---
description: "Expert assistant for web accessibility"
model: GPT-4.1
tools: ["changes", "codebase", "edit/editFiles", "search"]
---

# Accessibility Expert

You are a world-class expert in web accessibility...

## Your Expertise

- Standards & Policy
- Semantics & ARIA
  ...
```

**Key Sections:**

- **Frontmatter**: `description`, `model`, `tools` (YAML)
- **Body**: Markdown instructions defining agent behavior, expertise, approach

**Purpose**: Custom agents specialize GitHub Copilot for specific workflows and tools.

---

### Prompts (`*.prompt.md`)

**Location**: `agent-library/prompts/`

**Format:**

```markdown
---
agent: "agent"
description: "Suggest relevant GitHub Copilot Custom Agents files"
tools: ["edit", "search", "runCommands", "fetch"]
---

# Suggest Awesome GitHub Copilot Custom Agents

Analyze current repository context and suggest relevant Custom Agents...

## Process

1. **Fetch Available Custom Agents**
2. **Scan Local Custom Agents**
3. **Present Options**
   ...
```

**Key Features:**

- **Frontmatter**: `agent`, `description`, `tools`
- **Body**: Step-by-step process for executing the prompt
- **Reusable**: Can be invoked via `/` command in Copilot Chat

**Purpose**: Task-specific prompts for code generation, documentation, problem-solving.

---

### Instructions (`*.instructions.md`)

**Location**: `agent-library/instructions/`

**Format:**

```markdown
---
applyTo: "**"
---

# Next.js Best Practices for LLMs (2025)

_Last updated: July 2025_

## 1. Project Structure & Organization

- **Use the `app/` directory**
- **Top-level folders:**
  - `app/` — Routing, layouts, pages
  - `lib/` — Shared utilities
    ...
```

**Key Features:**

- **Frontmatter**: `applyTo` (glob pattern for file matching)
- **Body**: Comprehensive coding standards, best practices, patterns
- **Auto-applied**: Based on file patterns (e.g., `**/*.tsx` for React files)

**Purpose**: Provide contextual guidance for coding standards, frameworks, best practices.

---

### Skills (`SKILL.md` + resources)

**Location**: `agent-library/skills/` (production) or `agent-generator/src/skills/` (development)

**Structure:**

```
my-skill/
├── SKILL.md            # Required: instructions with YAML frontmatter
├── scripts/            # Optional: executable code (Python/Bash/etc.)
│   └── process.py
├── references/         # Optional: documentation (loaded as needed)
│   └── api_docs.md
└── assets/             # Optional: files for output (templates, icons)
    └── template.html
```

**SKILL.md Format:**

```markdown
---
name: my-skill
description: Complete and informative explanation
---

# My Skill

## Overview

...

## Usage Instructions

...
```

**Purpose**: Self-contained folders with instructions and bundled resources for specialized tasks.

---

### Collections (`*.collection.yml` + `*.md`)

**Location**: `agent-library/collections/`

**YAML Format** (`awesome-copilot.collection.yml`):

```yaml
id: awesome-copilot
name: Awesome Copilot
description: "Meta prompts that help you discover..."
tags: [github-copilot, discovery, meta]
items:
  - path: prompts/suggest-awesome-github-copilot-agents.prompt.md
    kind: prompt
  - path: agents/meta-agentic-project-scaffold.agent.md
    kind: agent
display:
  ordering: alpha
  show_badge: true
  featured: true
```

**Markdown Format** (`awesome-copilot.md`):

```markdown
# Awesome Copilot

Meta prompts that help you discover and generate...

## Items in this Collection

| Name                                                                      | Type   | Description             |
| ------------------------------------------------------------------------- | ------ | ----------------------- |
| [Suggest Agents](prompts/suggest-awesome-github-copilot-agents.prompt.md) | Prompt | Suggest relevant agents |

...
```

**Purpose**: Curated groups of related prompts, instructions, agents organized around themes.

---

## 🚀 Common Workflows

### Workflow 1: Create a New Skill

```bash
# 1. Initialize skill structure
python agent-generator/src/skills/skill-creator/scripts/init_skill.py \
    data-analysis --path agent-library/skills

# 2. Edit the generated SKILL.md
# - Add overview, capabilities, usage instructions
# - Add resources (scripts, references, assets) as needed

# 3. Validate the skill
python agent-generator/src/skills/skill-creator/scripts/quick_validate.py \
    agent-library/skills/data-analysis

# 4. Package for distribution (optional)
python agent-generator/src/skills/skill-creator/scripts/package_skill.py \
    agent-library/skills/data-analysis ./dist
```

---

### Workflow 2: Create a New Agent

**Manual Process** (no generator yet):

1. **Create file**: `agent-library/agents/my-agent.agent.md`
2. **Add frontmatter**:
   ```yaml
   ---
   description: "Expert agent for ..."
   model: GPT-4.1
   tools: ["changes", "codebase", "search"]
   ---
   ```
3. **Write instructions**: Define agent's role, expertise, approach, guidelines
4. **Test**: Use the agent in VS Code Copilot Chat
5. **Document**: Add to `agent-library/docs/README.agents.md` table

**Reference**: Check existing agents for examples (`agent-library/agents/accessibility.agent.md`)

---

### Workflow 3: Create a New Prompt

**Manual Process**:

1. **Create file**: `agent-library/prompts/my-prompt.prompt.md`
2. **Add frontmatter**:
   ```yaml
   ---
   agent: "agent"
   description: "Do something specific"
   tools: ["edit", "search"]
   ---
   ```
3. **Write process**: Step-by-step instructions
4. **Test**: Use via `/` command in Copilot Chat
5. **Document**: Add to `agent-library/docs/README.prompts.md`

---

### Workflow 4: Generate Zod Schemas for Agent Tools

```bash
# 1. Define JSON Schema in src/tools/agent-tools.json
# Example structure:
{
  "upsert_ui_element": {
    "inputSchema": { ... },
    "outputSchema": { ... }
  }
}

# 2. Generate Zod schemas
npm run generate:agent-schemas

# 3. Output files created in output/schemas/agent-tools/
# - TypeScript interfaces
# - Zod schemas
# - Validators
# - Registry

# 4. Import and use in your code
import { validateupsert_ui_elementInput } from '@/schemas/agent-tools';
```

---

### Workflow 5: Create a Collection

**Manual Process**:

1. **Create YAML**: `agent-library/collections/my-collection.collection.yml`

   ```yaml
   id: my-collection
   name: My Collection
   description: "Grouped resources"
   tags: [tag1, tag2]
   items:
     - path: prompts/my-prompt.prompt.md
       kind: prompt
   display:
     ordering: alpha
     featured: true
   ```

2. **Create Markdown**: `agent-library/collections/my-collection.md`
   - Overview
   - Items table with links

3. **Sync**: Run `npm run docs:sync` to sync JSON ↔ Markdown

---

## 📊 Tool Selection Matrix

| Task                 | Tool                        | Location                                            |
| -------------------- | --------------------------- | --------------------------------------------------- |
| Create new skill     | `init_skill.py`             | `agent-generator/src/skills/skill-creator/scripts/` |
| Validate skill       | `quick_validate.py`         | `agent-generator/src/skills/skill-creator/scripts/` |
| Package skill        | `package_skill.py`          | `agent-generator/src/skills/skill-creator/scripts/` |
| Generate Zod schemas | `schema-crawler.ts`         | `agent-generator/src/mcp-registry/`                 |
| Create agent         | Manual                      | `agent-library/agents/*.agent.md`                   |
| Create prompt        | Manual                      | `agent-library/prompts/*.prompt.md`                 |
| Create instruction   | Manual                      | `agent-library/instructions/*.instructions.md`      |
| Create collection    | Manual                      | `agent-library/collections/*.collection.yml + .md`  |
| Generate docs        | `npm run docs:all`          | `agent-generator/`                                  |
| Validate toolsets    | `npm run validate:toolsets` | `agent-generator/`                                  |

---

## 🔗 Key Documentation Files

| File                                                                                                       | Purpose                     |
| ---------------------------------------------------------------------------------------------------------- | --------------------------- |
| [agent-library/README.md](../agent-library/README.md)                                                      | Main repository overview    |
| [agent-library/docs/README.agents.md](../agent-library/docs/README.agents.md)                              | Custom agents documentation |
| [agent-library/docs/README.prompts.md](../agent-library/docs/README.prompts.md)                            | Prompts documentation       |
| [agent-library/docs/README.instructions.md](../agent-library/docs/README.instructions.md)                  | Instructions documentation  |
| [agent-library/docs/README.skills.md](../agent-library/docs/README.skills.md)                              | Skills documentation        |
| [agent-library/docs/README.collections.md](../agent-library/docs/README.collections.md)                    | Collections documentation   |
| [agent-generator/SCHEMA_CRAWLER_README.md](./SCHEMA_CRAWLER_README.md)                                     | Schema crawler guide        |
| [agent-generator/src/mcp-registry/INTEGRATION_QUICKSTART.md](./src/mcp-registry/INTEGRATION_QUICKSTART.md) | MCP integration phases      |
| [agent-generator/src/skills/skill-creator/SKILL.md](./src/skills/skill-creator/SKILL.md)                   | Skill creation guide        |

---

## 🎯 Quick Reference: What to Use When

**Want to...**

1. ✅ **Create a new skill with scripts/resources** → Use `init_skill.py`
2. ✅ **Validate skill structure** → Use `quick_validate.py`
3. ✅ **Package skill for distribution** → Use `package_skill.py`
4. ✅ **Generate Zod validation schemas** → Use `schema-crawler.ts` (via `npm run generate:agent-schemas`)
5. ✅ **Create a custom agent** → Manually create `*.agent.md` file
6. ✅ **Create a prompt** → Manually create `*.prompt.md` file
7. ✅ **Create coding standards** → Manually create `*.instructions.md` file
8. ✅ **Group related resources** → Manually create `*.collection.yml` + `*.md` files
9. ✅ **Generate documentation** → Use `npm run docs:all`
10. ✅ **Sync JSON ↔ Markdown** → Use `npm run docs:sync`

---

## 🚨 Important Notes

### Current Limitations

- **No agent generator**: Agents must be created manually (reference existing examples)
- **No prompt generator**: Prompts must be created manually
- **No instruction generator**: Instructions must be created manually
- **No collection generator**: Collections must be created manually
- **Skill creator is the only automated generator** for file structure
- **Schema crawler** is the only generator for validation schemas

### Future Enhancements

- Agent generator script
- Prompt template generator
- Instruction template generator
- Collection bundle generator
- Automated testing for agents/prompts

---

## 5. 🔍 Collection Generator from Keywords

### Purpose

Dynamically generate GitHub Copilot collections by searching for keywords across all agents, prompts, instructions, and skills. This tool automates the creation of curated collections based on topics, technologies, or workflows.

### Location

```
agent-library/
├── scripts/
│   └── generate_collection_from_keywords.py  # 🔍 Main generator script
├── prompts/
│   └── generate-collection-from-keywords.prompt.md  # 💬 Interactive prompt
└── COLLECTION_GENERATOR_README.md  # 📚 Complete documentation
```

### Quick Start

**Command-Line Usage:**

```bash
# Basic collection generation
python agent-library/scripts/generate_collection_from_keywords.py "testing automation"

# Custom output name
python agent-library/scripts/generate_collection_from_keywords.py \
    "react nextjs typescript" --output react-frontend

# Control size and types
python agent-library/scripts/generate_collection_from_keywords.py \
    "security authentication" \
    --max-items 25 \
    --include-skills
```

**Interactive Prompt Usage:**

```
@workspace /generate-collection-from-keywords

What keywords should I search for to create your collection?
```

### Features

| Feature                | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| **Keyword Search**     | Case-insensitive search across all assets                           |
| **Relevance Scoring**  | Title matches (10x), description matches (5x), content matches (1x) |
| **Multi-Type Support** | Agents, prompts, instructions, and skills                           |
| **Auto-Tagging**       | Extracts and consolidates tags from matched items                   |
| **Structured Output**  | Generates `.collection.yml`, `.md`, and `.metadata.json`            |

### Command-Line Options

| Option                   | Type   | Default  | Description                            |
| ------------------------ | ------ | -------- | -------------------------------------- |
| `keywords`               | string | required | Space-separated keywords to search for |
| `--max-items`            | int    | 15       | Maximum items to include               |
| `--output`               | string | auto     | Custom collection ID                   |
| `--include-agents`       | flag   | true     | Include agent files                    |
| `--include-prompts`      | flag   | true     | Include prompt files                   |
| `--include-instructions` | flag   | true     | Include instruction files              |
| `--include-skills`       | flag   | false    | Include skill files                    |
| `--agent-library-root`   | path   | auto     | Path to agent-library directory        |

### Examples

**Example 1: Testing Collection**

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "testing tdd unit integration" --max-items 30 --include-skills
```

Output:

- `collections/testing-tdd-unit.collection.yml`
- `collections/testing-tdd-unit.md`
- `collections/testing-tdd-unit.metadata.json`

**Example 2: Frontend Development**

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "react nextjs typescript tailwind" --max-items 35 --output frontend-stack
```

**Example 3: DevOps Automation**

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "cicd docker kubernetes terraform" --max-items 40 --include-skills
```

### Output Structure

**Collection YAML** (`.collection.yml`):

```yaml
id: testing-tdd-unit
name: Testing Tdd Unit
description: Collection focused on testing, tdd, unit...
tags: [testing, tdd, unit, automation, jest, pytest]
items:
  - path: agents/test-automation-engineer.agent.md
    kind: agent
  - path: prompts/generate-unit-tests.prompt.md
    kind: prompt
display:
  ordering: manual
  show_badge: true
  featured: false
```

**Collection Markdown** (`.md`):

```markdown
# Testing Tdd Unit

Collection focused on testing, tdd, unit...

**Tags**: testing, tdd, unit, automation

## Collection Details
  
- **Generated**: 2026-02-07T10:30:00
- **Keywords**: testing, tdd, unit
- **Total Matches**: 45
- **Selected Items**: 15

## Items in this Collection

### Agents

- [test-automation-engineer.agent.md](agents/...)

### Prompts

- [generate-unit-tests.prompt.md](prompts/...)

## Usage

Usage instructions...
```

### How It Works

**Search Algorithm:**

1. **Parse Files**: Read all matching files and extract YAML frontmatter
2. **Keyword Matching**: Case-insensitive search in content, titles, descriptions
3. **Relevance Scoring**:
   - Content match: 1 point per keyword occurrence
   - Title match: 10 points per keyword
   - Description match: 5 points per keyword
4. **Ranking**: Sort by relevance score (highest first)
5. **Selection**: Take top N items (based on `--max-items`)

**Collection Generation:**

1. Generate collection ID from keywords (kebab-case)
2. Extract and consolidate tags from matched items
3. Build YAML structure with items, metadata, display settings
4. Generate Markdown documentation
5. Save metadata JSON with generation details

### Best Practices

**Choosing Keywords:**

✅ **Good**:

- Specific technologies: `react`, `typescript`, `docker`
- Clear tasks: `testing`, `authentication`, `deployment`
- Combined concepts: `api rest graphql`, `cicd automation`

❌ **Avoid**:

- Generic terms: `development`, `programming`
- Single broad keywords without context
- Misspellings (searches are exact)

**Collection Sizes:**

| Type          | Recommended Size |
| ------------- | ---------------- |
| Focused       | 10-15 items      |
| General Topic | 20-30 items      |
| Comprehensive | 40-100 items     |

### Testing

```bash
# Run test script
python agent-library/scripts/test_collection_generator.py

# Expected output:
# 🧪 Testing Dynamic Collection Generator
# ✅ All tests passed!
```

### Integration

**Using Generated Collections:**

1. **In GitHub Copilot**:

   ```bash
   cp agent-library/collections/my-collection.* .github/copilot/collections/
   ```

2. **Team Repository**:

   ```bash
   git add agent-library/collections/my-collection.*
   git commit -m "Add my-collection"
   git push
   ```

3. **Contribute to Awesome-Copilot**:
   ```bash
   gh repo fork github/awesome-copilot
   cp agent-library/collections/*.* awesome-copilot/collections/
   gh pr create
   ```

### Related Documentation

- **[COLLECTION_GENERATOR_README.md](../agent-library/COLLECTION_GENERATOR_README.md)** - Full documentation
- **[generate-collection-from-keywords.prompt.md](../agent-library/prompts/generate-collection-from-keywords.prompt.md)** - Interactive prompt

---

## 📚 Additional Resources

- **Agent Skills Documentation**: [agent-library/docs/README.skills.md](../agent-library/docs/README.skills.md)
- **Skill Format Specification**: https://agentskills.io/specification
- **GitHub Copilot Customizations**: https://aka.ms/awesome-github-copilot
- **MCP Protocol**: https://developer.microsoft.com/blog/announcing-awesome-copilot-mcp-server

---

**Last Updated**: February 7, 2026
