# Skills & Agent Ecosystem - How Everything Relates

> **Answer**: "How do all these skill/agent creators work together?"

**Date**: February 7, 2026
**Status**: Reference Guide

---

## 🎯 TL;DR - The Four Systems

You have **four complementary systems** that work together:

| System                         | Type               | Purpose                                      | Location                                  |
| ------------------------------ | ------------------ | -------------------------------------------- | ----------------------------------------- |
| **1. Anthropic Skills**        | Pre-built Content  | Professional skills (xlsx, pdf, mcp-builder) | `agent-generator/src/skills/`             |
| **2. Agent Library Generator** | Python Creator     | Generate custom agents/prompts/skills        | `agent/tools/agent_library_generator.py`  |
| **3. Agent-Generator**         | TypeScript Scanner | Scan & consolidate all skills                | `agent-generator/src/scripts/generate.ts` |
| **4. Skills-Ref Library**      | Python Validator   | Validate SKILL.md format                     | `agent/skills_ref/`                       |

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SKILLS & AGENTS ECOSYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  ANTHROPIC       │        │   AGENT LIBRARY  │        │  AGENT-GENERATOR │
│  SKILLS          │        │   GENERATOR      │        │  (TypeScript)    │
│  (Downloaded)    │        │   (Python)       │        │                  │
├──────────────────┤        ├──────────────────┤        ├──────────────────┤
│ 11 pre-built     │        │ Creates NEW:     │        │ Scans ALL:       │
│ skills:          │───────▶│ • Agents         │───────▶│ • SKILL.md files │
│ • xlsx           │        │ • Prompts        │        │ • From any folder│
│ • pdf            │   ┌───▶│ • Skills         │◀───┐   │                  │
│ • mcp-builder    │   │    │                  │    │   │ Generates:       │
│ • pptx           │   │    │ Output:          │    │   │ • agent_prompt.md│
│ • web-artifacts  │   │    │ .github/agents/  │    │   │ • tools_schema   │
│ • ... (6 more)   │   │    │ .github/prompts/ │    │   │                  │
└──────────────────┘   │    │ .github/skills/  │    │   └──────────────────┘
                       │    └──────────────────┘    │            │
                       │                            │            │
                       │    ┌──────────────────┐    │            │
                       │    │  SKILLS-REF      │    │            │
                       └────│  LIBRARY         │────┘            │
                            │  (Python)        │                 │
                            ├──────────────────┤                 ▼
                            │ Validates:       │        ┌──────────────────┐
                            │ • SKILL.md       │        │  AGENT RUNTIME   │
                            │ • Frontmatter    │        │  (Python ADK)    │
                            │ • Format         │        ├──────────────────┤
                            │                  │        │ Uses generated:  │
                            │ CLI:             │        │ • Agent prompts  │
                            │ python -m        │        │ • Tool schemas   │
                            │ skills_ref.cli   │        │ • Skill library  │
                            └──────────────────┘        └──────────────────┘
```

---

## 🔍 Detailed Breakdown

### 1. Anthropic Skills (Pre-Built Content)

**What**: Professional skills downloaded from Anthropic's repository
**Location**: `agent-generator/src/skills/`
**Count**: 11 skills (xlsx, pdf, pptx, docx, mcp-builder, theme-factory, web-artifacts-builder, algorithmic-art, brand-guidelines, internal-comms, weather)
**Purpose**: Ready-to-use professional skills

**Key Files**:

- `agent-generator/src/skills/xlsx/SKILL.md` - Excel manipulation
- `agent-generator/src/skills/pdf/SKILL.md` - PDF operations
- `agent-generator/src/skills/mcp-builder/SKILL.md` - Build MCP servers
- `agent-generator/src/skills/web-artifacts-builder/SKILL.md` - React/Tailwind projects

**How to Use**:

```powershell
# View downloaded skills
ls agent-generator/src/skills/

# Already available for scanning by agent-generator
cd agent-generator
npm run generate  # Includes all Anthropic skills in output
```

**Source**: Downloaded via `scripts/knowledge-management/fetch-anthropic-skills.js`

---

### 2. Agent Library Generator (Python Creator)

**What**: Python tool to PROGRAMMATICALLY CREATE new agents, prompts, and skills
**Location**: `agent/tools/agent_library_generator.py`
**Purpose**: Generate custom resources for YOUR specific use cases
**Output**: `.github/agents/`, `.github/prompts/`, `.github/skills/`

**Capabilities**:

- Create 50+ agents with templates
- Generate prompts for different task types
- Build skills with instructions and examples
- Integrate with MCP toolsets

**Example Usage**:

```python
# Create custom agent
from agent.tools.agent_library_generator import AgentTemplate

agent = AgentTemplate(
    name="ModMe GenUI Specialist",
    id="modme-genui-specialist",
    description="Expert in ModMe GenUI workbench",
    agent_type="specialist",
    primary_tools=["upsert_ui_element", "remove_ui_element"],
    tags=["genui", "ui"]
)

# Write to file
Path(".github/agents/modme-genui-specialist.agent.md").write_text(
    agent.to_markdown()
)
```

**CLI Usage**:

```powershell
# Generate 50 agents + 50 prompts + 50 skills
python scripts/generate_agent_library.py --agents 50 --prompts 50 --skills 50

# Demo (creates 3 sample items)
python scripts/demo_agent_generation.py
```

**Output Structure**:

```
.github/
├── agents/
│   ├── react-frontend-specialist.agent.md
│   ├── nextjs-fullstack-specialist.agent.md
│   └── ... (50+ agents)
├── prompts/
│   ├── code-gen-guide.prompt.md
│   ├── testing-guide.prompt.md
│   └── ... (50+ prompts)
└── skills/
    ├── component-gen/SKILL.md
    ├── test-automation/SKILL.md
    └── ... (50+ skills)
```

---

### 3. Agent-Generator (TypeScript Scanner)

**What**: Scans SKILL.md files and generates consolidated agent prompts
**Location**: `agent-generator/src/scripts/generate.ts`
**Purpose**: Aggregate ALL skills into one agent prompt
**Output**: `agent-generator/output/agent_prompt.md`, `tools_schema.json`

**What It Does**:

1. Scans `agent-generator/src/skills/` for SKILL.md files
2. Extracts descriptions and instructions
3. Generates XML format: `<available_skills>...</available_skills>`
4. Creates tool schemas from TypeScript interfaces

**Example Output** (`agent_prompt.md`):

```markdown
# AI Agent System Prompt

You are a helpful AI assistant equipped with specific skills and tools.

<available_skills>
<skill>
<name>xlsx</name>
<description> - Comprehensive spreadsheet creation, editing, and analysis...
</description>
<instructions> # Xlsx Skill

      ## Capabilities
      - Create Excel files with formulas...
    </instructions>

  </skill>

  <skill>
    <name>mcp-builder</name>
    <description>
      - Create high-quality Model Context Protocol servers...
    </description>
    <instructions>
      # MCP Builder
      ...
    </instructions>
  </skill>

  <!-- ... all other skills ... -->

</available_skills>
```

**Usage**:

```powershell
cd agent-generator
npm run generate

# Output files:
# - output/agent_prompt.md (full prompt with all skills)
# - output/tools_schema.json (JSON Schema for tools)
```

**Scope**: Scans ONLY `agent-generator/src/skills/` (includes Anthropic skills)

---

### 4. Skills-Ref Library (Python Validator)

**What**: Validation library for SKILL.md format
**Location**: `agent/skills_ref/`
**Purpose**: Ensure skills follow the Agent Skills specification
**Source**: Ported from https://github.com/agentskills/agentskills

**Capabilities**:

- Validate SKILL.md frontmatter (YAML)
- Check naming conventions
- Parse skill metadata
- Generate XML prompts from validated skills

**CLI Usage**:

```powershell
# Validate a skill
python -m agent.skills_ref.cli validate .github/skills/component-gen

# Read properties
python -m agent.skills_ref.cli read-properties .github/skills/component-gen

# Generate prompt XML
python -m agent.skills_ref.cli to-prompt .github/skills/*
```

**What It Validates**:

- ✅ Name: lowercase-with-hyphens, max 64 chars
- ✅ Description: non-empty, max 1024 chars
- ✅ Frontmatter: valid YAML
- ✅ Directory name matches skill name
- ✅ Required fields present

---

## 🔄 How They Work Together

### Complete Workflow

```
STEP 1: Get Base Skills
┌─────────────────────────────────────┐
│ Download Anthropic Skills           │
│ scripts/fetch-anthropic-skills.js   │
│ Output: agent-generator/src/skills/ │
└─────────────────────────────────────┘
            ↓

STEP 2: Create Custom Skills (Optional)
┌─────────────────────────────────────┐
│ Generate Custom Resources           │
│ python scripts/                     │
│   generate_agent_library.py         │
│ Output: .github/agents/prompts/     │
│         skills/                     │
└─────────────────────────────────────┘
            ↓

STEP 3: Validate Skills
┌─────────────────────────────────────┐
│ Validate with Skills-Ref            │
│ python -m agent.skills_ref.cli      │
│   validate <skill-dir>              │
└─────────────────────────────────────┘
            ↓

STEP 4: Scan & Consolidate
┌─────────────────────────────────────┐
│ Run Agent-Generator Scanner         │
│ cd agent-generator && npm run       │
│   generate                          │
│ Output: output/agent_prompt.md      │
└─────────────────────────────────────┘
            ↓

STEP 5: Use in Agent Runtime
┌─────────────────────────────────────┐
│ Load into Agent Runtime             │
│ agent_instructions = Path(          │
│   "agent-generator/output/          │
│   agent_prompt.md"                  │
│ ).read_text()                       │
└─────────────────────────────────────┘
```

---

## 🎯 Use Cases

### Use Case 1: Start with Anthropic Skills

**Scenario**: Use professional pre-built skills without creating your own

```powershell
# Skills are already downloaded
ls agent-generator/src/skills/
# xlsx, pdf, mcp-builder, pptx, web-artifacts-builder, etc.

# Generate agent prompt from them
cd agent-generator
npm run generate

# Use output in your agent
# agent-generator/output/agent_prompt.md now includes all 11 Anthropic skills
```

**Result**: Agent has 11 professional skills ready to use

---

### Use Case 2: Create Custom Skills + Use Anthropic Skills

**Scenario**: Add your own domain-specific skills alongside Anthropic's

```powershell
# 1. Generate custom skills for your domain
python scripts/generate_agent_library.py --skills 20

# 2. Your skills are now in .github/skills/
ls .github/skills/
# component-gen, test-automation, data-fetch, etc.

# 3. Copy or symlink to agent-generator
cp -r .github/skills/* agent-generator/src/skills/

# 4. Scan all skills (Anthropic + yours)
cd agent-generator
npm run generate

# 5. Output includes ALL skills
```

**Result**: Agent has 11 Anthropic skills + 20 custom skills = 31 total

---

### Use Case 3: Create Domain-Specific Agents

**Scenario**: Build specialized agents for specific tasks

```powershell
# 1. Generate agents with specific tools
python scripts/generate_agent_library.py --agents 30

# 2. Agents are in .github/agents/
ls .github/agents/
# react-frontend-specialist.agent.md
# nextjs-fullstack-specialist.agent.md
# modme-genui-specialist.agent.md (if you created it)

# 3. Use agents directly in GitHub Copilot
# @modme-genui-specialist help me create a dashboard
```

**Result**: 30 specialized agents ready to use in Copilot Chat

---

### Use Case 4: Multi-Repo Skill Discovery

**Scenario**: Scan skills from multiple repositories

```powershell
# Create custom scanner
# agent-generator/src/scripts/scan-multi-repo.ts

const SKILL_LOCATIONS = [
  'agent-generator/src/skills/',           # Anthropic skills
  '.github/skills/',                       # Generated skills
  '../foam-knowledgebase/.github/skills/', # Other repo
  '../chuk-tool-processor/skills/'         # Another repo
];

# Scan all locations and generate unified prompt
```

**Result**: Agent prompt includes skills from all repositories

---

## 📋 Current Inventory

### What You Have Now

| Location                      | Type               | Count     | Source                  |
| ----------------------------- | ------------------ | --------- | ----------------------- |
| `agent-generator/src/skills/` | Anthropic Skills   | 13        | Downloaded              |
| `.github/agents/`             | Generated Agents   | 30+       | Agent Library Generator |
| `.github/prompts/`            | Generated Prompts  | 27+       | Agent Library Generator |
| `.github/skills/`             | Generated Skills   | 10+       | Agent Library Generator |
| `agent/skills_ref/`           | Validation Library | 7 modules | Skills-Ref Port         |

**Total Resources**: ~80 items across all categories

---

## 🤔 Summary: Three "Creators"

You were right to identify "three creators" - here's how they differ:

### 1. **Agent Library Generator** = CREATOR (Python)

- **Purpose**: Creates NEW agents, prompts, skills from templates
- **Input**: Your specifications (count, categories, tools)
- **Output**: Files in `.github/`
- **Use When**: You need custom resources for your specific domain

### 2. **Agent-Generator** = SCANNER (TypeScript)

- **Purpose**: Scans EXISTING skills and consolidates them
- **Input**: SKILL.md files from any location
- **Output**: Single agent_prompt.md with all skills
- **Use When**: You want to aggregate skills into agent instructions

### 3. **Anthropic Skills** = CONTENT (Pre-Built)

- **Purpose**: Provides professional, ready-to-use skills
- **Input**: Downloaded from GitHub (already done)
- **Output**: SKILL.md files in `agent-generator/src/skills/`
- **Use When**: You need proven, professional skills (xlsx, pdf, mcp-builder)

### 4. **Skills-Ref** = VALIDATOR (Python Library)

- **Purpose**: Validates skills follow the spec
- **Input**: SKILL.md files
- **Output**: Validation reports
- **Use When**: You want to ensure quality/compliance

---

## 🎬 Quick Start Guide

### Path 1: Use Anthropic Skills Only

```powershell
# Already downloaded, just scan them
cd agent-generator
npm run generate

# Use output
cat output/agent_prompt.md
```

---

### Path 2: Create Custom + Use Anthropic

```powershell
# 1. Generate custom resources
python scripts/demo_agent_generation.py

# 2. Scan everything
cd agent-generator
npm run generate

# 3. Validate (optional)
python -m agent.skills_ref.cli validate .github/demo/canvas-state-mgmt
```

---

### Path 3: Scale to 200+ Items

```powershell
# 1. Generate large library
python scripts/generate_agent_library.py --agents 60 --prompts 60 --skills 60

# 2. Copy skills to scanner
cp -r .github/skills/* agent-generator/src/skills/

# 3. Scan all (Anthropic + generated)
cd agent-generator
npm run generate

# 4. Result: agent_prompt.md with 70+ skills
```

---

## 🔗 Integration Points

### They Share Common Formats

All systems use the **same SKILL.md format**:

```yaml
---
name: my-skill
description: Brief description
category: tools
version: 1.0.0
tags:
  - tag1
  - tag2
---
# My Skill

## Instructions
...
```

This means:

- ✅ Anthropic skills can be scanned by Agent-Generator
- ✅ Generated skills can be validated by Skills-Ref
- ✅ All skills can be used in Agent Runtime
- ✅ Skills from any repo can be aggregated

---

## 📚 Documentation Map

| Document                                   | Purpose                                           |
| ------------------------------------------ | ------------------------------------------------- |
| **AGENT_CREATION_IMPLEMENTATION_GUIDE.md** | How to create agents/skills (Python + TypeScript) |
| **DYNAMIC_AGENT_LIBRARY_GUIDE.md**         | Agent Library Generator usage                     |
| **SKILLS_DOWNLOAD_SUMMARY.md**             | Anthropic skills download report (this file)      |
| **SCHEMA_CRAWLER_README.md**               | JSON Schema → Zod conversion                      |
| **AGENT_SKILLS_IMPLEMENTATION.md**         | Skills-Ref library documentation                  |

---

## 🎯 Decision Tree: Which Tool to Use?

```
Do you need to...

┌─ Create NEW agents/prompts/skills?
│  → Use: Agent Library Generator (Python)
│  → Command: python scripts/generate_agent_library.py
│
┌─ Use professional pre-built skills?
│  → Use: Anthropic Skills (already downloaded)
│  → Location: agent-generator/src/skills/
│
┌─ Aggregate all skills into one prompt?
│  → Use: Agent-Generator (TypeScript)
│  → Command: cd agent-generator && npm run generate
│
┌─ Validate skill format?
│  → Use: Skills-Ref Library
│  → Command: python -m agent.skills_ref.cli validate <skill-dir>
│
└─ Convert JSON Schema to Zod?
   → Use: Schema Crawler
   → Script: agent-generator/src/mcp-registry/schema-crawler.ts
```

---

## 🏁 Conclusion

You have a **comprehensive ecosystem** with:

1. **11 professional skills** from Anthropic (xlsx, pdf, mcp-builder, etc.)
2. **Python generator** for creating custom agents/prompts/skills (agent_library_generator.py)
3. **TypeScript scanner** for consolidating all skills (agent-generator)
4. **Validation library** for ensuring quality (skills_ref)

They work together:

- Anthropic provides professional content
- Python generator creates custom content
- TypeScript scanner aggregates everything
- Validator ensures quality

**Result**: A flexible, scalable system for building AI agents with 80+ resources and growing!

---

**Version**: 1.0.0
**Last Updated**: February 7, 2026
**Status**: ✅ All Systems Operational
