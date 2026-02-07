# Agent Creation & Skill Building - Complete Implementation Guide

> **Comprehensive guide to creating agents, prompts, and skills using the Dynamic Agent Library Generator + Agent-Generator integration**

**Date**: February 7, 2026
**Status**: Production Ready
**Components**: Python libraries + TypeScript generators + MCP tooling

---

## 🎯 System Overview

You have **two complementary systems** for agent creation:

### 1. **Dynamic Agent Library Generator** (Python)

- **Location**: `agent/tools/agent_library_generator.py`
- **Purpose**: Generate 200+ agents, prompts, and skills with MCP tool integration
- **Output**: `.github/agents/`, `.github/prompts/`, `.github/skills/`
- **Format**: GitHub Copilot-compatible agent.md, prompt.md, SKILL.md files

### 2. **Agent-Generator** (TypeScript)

- **Location**: `agent-generator/src/scripts/generate.ts`
- **Purpose**: Scan skills, generate type-safe schemas, create agent prompts
- **Output**: `agent-generator/output/agent_prompt.md`, `tools_schema.json`
- **Use**: Convert SKILL.md → agent instructions + tool schemas

---

## 🚀 Quick Start: Complete Workflow

### Step 1: Generate Agent Library (Python)

```powershell
# Generate 50 agents, 50 prompts, 50 skills
python scripts/generate_agent_library.py --agents 50 --prompts 50 --skills 50

# Output:
# ✓ .github/agents/react-frontend-specialist.agent.md
# ✓ .github/agents/nextjs-fullstack-specialist.agent.md
# ✓ .github/prompts/code-gen-guide.prompt.md
# ✓ .github/skills/component-gen/SKILL.md
# ... (150 total files)
```

### Step 2: Scan Skills & Generate Agent Prompts (TypeScript)

```powershell
# Scan all SKILL.md files and generate consolidated prompt
cd agent-generator
npm run generate

# Output:
# ✓ output/agent_prompt.md (full agent system prompt)
# ✓ output/tools_schema.json (JSON Schema for tools)
```

### Step 3: Use in Your Agent Runtime

```python
# agent/main.py
from pathlib import Path
from agent.skills_ref import to_prompt

# Load generated agent prompt
agent_prompt = Path("agent-generator/output/agent_prompt.md").read_text()

# Or generate dynamically from skills
skills_dirs = list(Path(".github/skills").iterdir())
dynamic_skills = to_prompt(skills_dirs)

workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    instruction=f"""
    You are the ModMe UI Workbench Assistant.

    {dynamic_skills}

    When a user asks for help, consult available skills and use the appropriate tools.
    """,
    tools=[...]  # Your tools here
)
```

---

## 📦 Component Breakdown

### A. Agent Files (`.github/agents/*.agent.md`)

**What They Are**: Specialized AI personas with specific expertise

**Structure**:

```yaml
---
type: agent
title: React Frontend Specialist
description: Expert in React development and best practices
agent_type: specialist
model: claude-opus-4.5
tools:
  - tools_react-frontend
  - mcp_github2_get_toolset_tools
tags:
  - react
  - frontend
---

# React Frontend Specialist

## Description
Expert specialist in React frontend development and best practices...

## Primary Tools
- `tools_react-frontend`
- `mcp_github2_get_toolset_tools`

## Example Usage
Help me build a React component with TypeScript...
```

**Categories Generated**:

- `react-frontend-specialist`
- `nextjs-fullstack-specialist`
- `data-engineering-specialist`
- `devops-infra-specialist`
- `security-specialist`
- `testing-specialist`
- `documentation-specialist`
- `ai-ml-specialist`
- `database-specialist`
- `api-design-specialist`
- `performance-specialist`
- `accessibility-specialist`

### B. Prompt Files (`.github/prompts/*.prompt.md`)

**What They Are**: Reusable conversation starters for Copilot Chat

**Structure**:

```yaml
---
type: prompt
title: Code Generation Guide
description: Guide for generating React components
prompt_type: code-gen
agent: agent
tools:
  - tools_react-frontend
tags:
  - code-gen
  - react
---
# Code Generation Guide

## Example Usage
```

Help me generate a TypeScript React component with props validation

```

```

**Types Generated**:

- `code-gen-guide`
- `analysis-guide`
- `testing-guide`
- `documentation-guide`
- `debugging-guide`
- `performance-guide`
- `security-guide`
- `refactoring-guide`
- `migration-guide`
- `architecture-guide`

### C. Skills (`.github/skills/*/SKILL.md`)

**What They Are**: Reusable capabilities that agents can use

**Structure**:

````yaml
---
name: component-gen
title: Component Generation Skill
description: Reusable skill for component generation tasks
category: ui
version: 1.0.0
tags:
  - component-gen
  - reusable
---

# Component Generation Skill

## Instructions
Use this skill to handle component generation operations.

1. Analyze component requirements
2. Generate TypeScript interface for props
3. Create React component with Zod validation
4. Add unit tests
5. Document usage

## Example
```typescript
// Generate StatCard component
const StatCard: React.FC<Props> = ({ title, value, trend }) => {
  // Implementation
}
````

## Resources

- See `src/components/registry/` for examples
- Check `agent/tools/code_tools.py` for code generation tools

````

**Categories Generated**:
- `component-gen` - UI component generation
- `test-automation` - Automated testing
- `data-fetch` - Data fetching patterns
- `api-integration` - API client setup
- `state-management` - State handling
- `performance-opt` - Performance optimization
- `accessibility` - A11y compliance
- `security-scan` - Security analysis
- `documentation-gen` - Doc generation
- `deployment-automation` - CI/CD automation

---

## 🛠️ Creating Custom Agents

### Method 1: Via Python Generator (Programmatic)

```python
# Create custom_agent_generator.py
from pathlib import Path
from agent.tools.agent_library_generator import AgentTemplate

# Define your custom agent
custom_agent = AgentTemplate(
    name="ModMe GenUI Specialist",
    id="modme-genui-specialist",
    description="Expert in ModMe GenUI workbench, dual-runtime architecture, and agent-driven UI generation.",
    agent_type="specialist",
    primary_tools=[
        "upsert_ui_element",
        "remove_ui_element",
        "clear_canvas",
        "setThemeColor",
        "analyze_component_props"
    ],
    secondary_tools=[
        "mcp_github2_get_toolset_tools",
        "edit_component",
        "run_build_check"
    ],
    example_prompt="Help me create a dashboard with StatCard and ChartCard components",
    model="claude-opus-4.5",
    tags=["genui", "ui-generation", "react", "nextjs", "agent-runtime"]
)

# Write to file
output_dir = Path(".github/agents")
output_dir.mkdir(parents=True, exist_ok=True)
agent_file = output_dir / "modme-genui-specialist.agent.md"
agent_file.write_text(custom_agent.to_markdown())

print(f"✅ Created: {agent_file}")
````

Run it:

```powershell
python custom_agent_generator.py
```

### Method 2: Manual Creation (Direct)

Create `.github/agents/my-custom-agent.agent.md`:

```yaml
---
type: agent
title: My Custom Agent
description: Brief description of what this agent does
agent_type: specialist
model: claude-opus-4.5
tools:
  - my_custom_tool
  - mcp_github2_get_toolset_tools
tags:
  - custom
  - specialist
---

# My Custom Agent

## Description
Detailed description of the agent's capabilities and expertise.

## Primary Tools
- `my_custom_tool` - Description of what this tool does
- `mcp_github2_get_toolset_tools` - Access MCP toolsets

## Example Usage
```

@my-custom-agent help me with [specific task]

```

## Best Practices
1. Provide clear context
2. Specify desired output format
3. Ask follow-up questions
4. Reference related resources
```

---

## 🧩 Creating Custom Skills

### Method 1: Via Python Generator

```python
# Create custom_skill_generator.py
from pathlib import Path
from agent.tools.agent_library_generator import SkillTemplate

# Define custom skill
ui_routing_skill = SkillTemplate(
    name="UI Routing Skill",
    id="ui-routing",
    description="Handle Next.js App Router navigation and route management",
    category="ui",
    instructions="""
Use this skill to:
1. Create new route folders in app directory
2. Generate page.tsx with proper metadata
3. Set up layouts and loading states
4. Configure route groups and dynamic segments
5. Implement middleware for auth/redirects
    """,
    example_code="""
// app/dashboard/[userId]/page.tsx
export default async function UserDashboard({ params }: { params: { userId: string } }) {
  const user = await fetchUser(params.userId);
  return <DashboardView user={user} />;
}
    """,
    dependencies=["Next.js 14+", "React 18+", "TypeScript"],
    tags=["routing", "nextjs", "navigation", "ui"]
)

# Write skill
skill_dir = Path(".github/skills/ui-routing")
skill_dir.mkdir(parents=True, exist_ok=True)
skill_file = skill_dir / "SKILL.md"
skill_file.write_text(ui_routing_skill.to_skill_md())

print(f"✅ Created skill: {skill_file}")
```

### Method 2: Manual Creation

Create `.github/skills/my-skill/SKILL.md`:

````yaml
---
name: my-skill
title: My Custom Skill
description: Brief description of the skill
category: tools
version: 1.0.0
tags:
  - custom
  - reusable
---

# My Custom Skill

## Instructions
Step-by-step instructions for using this skill:

1. **Setup**: Prerequisites and configuration
2. **Usage**: How to invoke the skill
3. **Examples**: Code samples and patterns
4. **Validation**: How to verify results
5. **Troubleshooting**: Common issues and fixes

## Dependencies
- Tool/library 1
- Tool/library 2

## Example
```typescript
// Example code demonstrating the skill
const result = await mySkillFunction(input);
````

## Resources

- Link to documentation
- Related skills in `.github/skills/`
- Tool definitions in `agent/toolsets.json`

````

---

## 🔗 Integration: Connecting Everything

### Complete Workflow

```powershell
# 1. Create custom agents
python custom_agent_generator.py

# 2. Create custom skills
python custom_skill_generator.py

# 3. Generate base library (if not done)
python scripts/generate_agent_library.py --agents 20 --prompts 20 --skills 20

# 4. Scan all skills and generate agent prompt
cd agent-generator
npm run generate

# 5. Validate skills with skills-ref library
cd ..
python -m agent.skills_ref.cli validate .github/skills/ui-routing

# 6. Copy agent prompt to agent runtime
cp agent-generator/output/agent_prompt.md agent/prompts/

# 7. Test with your agent
python agent/main.py
````

### Automated Pipeline

Create `scripts/sync_agent_library.ps1`:

```powershell
#!/usr/bin/env pwsh
# Sync agent library and regenerate prompts

Write-Host "🔄 Syncing Agent Library..." -ForegroundColor Cyan

# Step 1: Generate agent library
Write-Host "📦 Generating agents, prompts, skills..." -ForegroundColor Yellow
python scripts/generate_agent_library.py --agents 30 --prompts 30 --skills 30

# Step 2: Scan and generate prompts
Write-Host "🔍 Scanning skills and generating prompts..." -ForegroundColor Yellow
cd agent-generator
npm run generate
cd ..

# Step 3: Validate all skills
Write-Host "✅ Validating skills..." -ForegroundColor Yellow
$skills = Get-ChildItem .github/skills -Directory
foreach ($skill in $skills) {
    python -m agent.skills_ref.cli validate $skill.FullName
}

# Step 4: Generate index
Write-Host "📇 Generating library index..." -ForegroundColor Yellow
python scripts/generate_library_index.py

Write-Host "✅ Agent library sync complete!" -ForegroundColor Green
```

Run it:

```powershell
.\scripts\sync_agent_library.ps1
```

---

## 🎨 Advanced Patterns

### Pattern 1: Domain-Specific Agent Collections

```python
# Generate agents for specific domain
from agent.tools.agent_library_generator import generate_agent_library, ToolContext

class MockToolContext:
    def __init__(self):
        self.state = {}

# Generate only frontend-related agents
result = generate_agent_library(
    MockToolContext(),
    count=10,
    categories=[
        "react-frontend",
        "nextjs-fullstack",
        "tailwind-styling",
        "shadcn-ui",
        "component-architecture"
    ],
    output_dir=".github/agents/frontend"
)

print(f"Generated {result['count']} frontend specialists")
```

### Pattern 2: Skill Inheritance and Composition

```yaml
---
name: advanced-component-gen
title: Advanced Component Generation
description: Extends component-gen with TypeScript and Zod validation
category: ui
extends: component-gen
version: 2.0.0
---

# Advanced Component Generation

## Extends
This skill builds on `component-gen` adding:
- TypeScript strict mode
- Zod schema validation
- Error boundary wrapping
- Storybook stories
- Unit test generation

## Usage
See base skill: `.github/skills/component-gen/SKILL.md`

Plus additional steps:
1. Generate Zod schema from props
2. Add safeParse validation
3. Create error fallback UI
4. Generate Storybook story
5. Write Jest tests
```

### Pattern 3: Multi-Repo Skill Discovery

```typescript
// agent-generator/src/scripts/generate-from-multi-repo.ts
import { glob } from "glob";
import * as fs from "fs";
import * as path from "path";

const REPOS = [
  "D:/Github_Projects/Modme_2026/modme-ui-01-test-worktree",
  "D:/Github_Projects/Modme_2026/foam-knowledgebase",
  "D:/Github_Projects/Modme_2026/chuk-tool-processor",
];

async function scanAllRepos() {
  console.log("Scanning multiple repositories for skills...");

  const allSkills: Array<{ path: string; repo: string; name: string }> = [];

  for (const repo of REPOS) {
    const skillFiles = await glob(`${repo}/**/.github/skills/*/SKILL.md`, {
      ignore: ["**/node_modules/**"],
    });

    for (const skillPath of skillFiles) {
      const skillName = path.basename(path.dirname(skillPath));
      allSkills.push({
        path: skillPath,
        repo: path.basename(repo),
        name: skillName,
      });
    }
  }

  console.log(`Found ${allSkills.length} skills across ${REPOS.length} repos`);

  // Generate consolidated prompt
  let prompt = "# Multi-Repository Skills\n\n<available_skills>\n";

  for (const skill of allSkills) {
    const content = fs.readFileSync(skill.path, "utf-8");
    prompt += `  <skill>\n`;
    prompt += `    <name>${skill.name}</name>\n`;
    prompt += `    <repository>${skill.repo}</repository>\n`;
    prompt += `    <location>${skill.path}</location>\n`;
    prompt += `    <content>\n${indent(content, 6)}\n    </content>\n`;
    prompt += `  </skill>\n`;
  }

  prompt += "</available_skills>";

  fs.writeFileSync("output/multi-repo-skills-prompt.md", prompt);
  console.log("✅ Generated multi-repo skills prompt");
}

function indent(text: string, spaces: number): string {
  return text
    .split("\n")
    .map((line) => " ".repeat(spaces) + line)
    .join("\n");
}

scanAllRepos();
```

---

## 📊 Current Status

### Generated Files

| Category        | Count   | Location               |
| --------------- | ------- | ---------------------- |
| **Agents**      | 30+     | `.github/agents/`      |
| **Prompts**     | 27+     | `.github/prompts/`     |
| **Skills**      | 10+     | `.github/skills/`      |
| **Collections** | 5+      | `.github/collections/` |
| **Total**       | **70+** | Multiple locations     |

### Next Steps to 200+

1. **Run full generation**:

   ```powershell
   python scripts/generate_agent_library.py --agents 60 --prompts 60 --skills 60
   ```

2. **Add domain-specific agents** for your use cases:
   - ModMe UI specialists
   - GenAI toolbox specialists
   - Agent orchestration specialists
   - Workflow automation specialists

3. **Create skill variants** per technology stack

4. **Integrate with MCP tooling** for tool discovery

---

## 🎯 Use Cases

### Use Case 1: Create a Full-Stack Agent

```python
# Create full-stack specialist
from agent.tools.agent_library_generator import AgentTemplate
from pathlib import Path

agent = AgentTemplate(
    name="Full-Stack Engineer",
    id="fullstack-engineer",
    description="Expert in frontend (React/Next.js) and backend (Python/FastAPI) development",
    agent_type="specialist",
    primary_tools=[
        "tools_react-frontend",
        "tools_nextjs",
        "tools_python-backend",
        "tools_fastapi",
        "create_new_component",
        "edit_component"
    ],
    secondary_tools=[
        "run_build_check",
        "mcp_github2_get_toolset_tools",
        "analyze_component_props"
    ],
    example_prompt="Build a Next.js page with server components that fetches data from FastAPI",
    tags=["fullstack", "react", "nextjs", "python", "fastapi"]
)

Path(".github/agents/fullstack-engineer.agent.md").write_text(agent.to_markdown())
```

### Use Case 2: Build a Testing Skill Set

```python
# Create comprehensive testing skill
from agent.tools.agent_library_generator import SkillTemplate
from pathlib import Path

testing_skill = SkillTemplate(
    name="E2E Testing with Playwright",
    id="e2e-testing",
    description="End-to-end testing using Playwright for web applications",
    category="testing",
    instructions="""
## Setup
1. Install Playwright: `npm install -D @playwright/test`
2. Initialize config: `npx playwright install`

## Writing Tests
1. Create test file in `tests/e2e/`
2. Use Page Object Model pattern
3. Add fixtures for common setup
4. Implement retry logic for flaky tests

## Running Tests
- All tests: `npx playwright test`
- Headed mode: `npx playwright test --headed`
- Debug mode: `npx playwright test --debug`
- UI mode: `npx playwright test --ui`
    """,
    example_code="""
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
    """,
    dependencies=["Playwright", "TypeScript", "Node.js 18+"],
    tags=["testing", "e2e", "playwright", "automation"]
)

skill_dir = Path(".github/skills/e2e-testing")
skill_dir.mkdir(parents=True, exist_ok=True)
(skill_dir / "SKILL.md").write_text(testing_skill.to_skill_md())
```

### Use Case 3: Agent with Custom Instructions

Create agent with detailed instructions and examples:

````yaml
---
type: agent
title: ModMe GenUI Canvas Specialist
description: Expert in ModMe GenUI canvas operations, component lifecycle, and state management
agent_type: specialist
model: claude-opus-4.5
tools:
  - upsert_ui_element
  - remove_ui_element
  - clear_canvas
  - analyze_component_props
  - edit_component
tags:
  - genui
  - canvas
  - state-management
---

# ModMe GenUI Canvas Specialist

## Core Competencies

1. **Canvas State Management**
   - Understanding the one-way state flow (Python → React)
   - Managing `tool_context.state["elements"]` array
   - Ensuring ALLOWED_TYPES whitelist compliance

2. **Component Lifecycle**
   - Creating components with `upsert_ui_element`
   - Updating existing components by ID
   - Removing components with `remove_ui_element`
   - Clearing entire canvas with `clear_canvas`

3. **Type Safety**
   - Validating component types against ALLOWED_TYPES
   - Ensuring props are JSON-serializable
   - Using Zod schemas for runtime validation

## Primary Tools

### `upsert_ui_element(id, type, props)`
Add or update a canvas element.

**Example**:
```python
upsert_ui_element(
    tool_context,
    id="revenue_stat",
    type="StatCard",
    props={"title": "Revenue", "value": 1234, "trend": "up"}
)
````

### `remove_ui_element(id)`

Remove a component by ID.

### `clear_canvas()`

Clear all elements from the canvas.

### `analyze_component_props(component_path)`

Inspect TypeScript interfaces for valid props.

## Example Workflows

### Create a Dashboard

```
@modme-genui-canvas-specialist Create a dashboard with:
- Revenue StatCard (top left)
- Sales chart (center)
- Recent orders DataTable (bottom)
```

Response:

```python
# Revenue stat
upsert_ui_element(tool_context, "revenue_stat", "StatCard", {
    "title": "Revenue",
    "value": 125000,
    "trend": "up",
    "change": "+12%"
})

# Sales chart
upsert_ui_element(tool_context, "sales_chart", "ChartCard", {
    "title": "Sales Trend",
    "data": [...],
    "type": "line"
})

# Orders table
upsert_ui_element(tool_context, "orders_table", "DataTable", {
    "title": "Recent Orders",
    "columns": ["id", "customer", "amount", "status"],
    "data": [...]
})
```

## Constraints

1. **ALLOWED_TYPES**: Only use types in the whitelist:
   - `StatCard`
   - `DataTable`
   - `ChartCard`

2. **Props Validation**: All props must be JSON-serializable (no functions)

3. **ID Naming**: Use snake_case for element IDs

4. **State Contract**: Never mutate state from React side

## Resources

- Architecture: `.github/copilot-instructions.md`
- Component registry: `src/components/registry/`
- Agent tools: `agent/main.py`
- Type definitions: `src/lib/types.ts`

````

---

## 📚 Reference

### Key Files

| File | Purpose |
|------|---------|
| `agent/tools/agent_library_generator.py` | Python generator for agents/prompts/skills |
| `scripts/generate_agent_library.py` | CLI orchestrator |
| `agent-generator/src/scripts/generate.ts` | TypeScript skill scanner |
| `agent/skills_ref/` | Skills validation library |
| `.github/agents/` | Generated agent files |
| `.github/prompts/` | Generated prompt files |
| `.github/skills/` | Generated skill folders |
| `agent/toolsets.json` | MCP tool definitions |

### Commands Quick Reference

```powershell
# Generate library
python scripts/generate_agent_library.py --agents 50 --prompts 50 --skills 50

# Scan skills
cd agent-generator && npm run generate

# Validate skill
python -m agent.skills_ref.cli validate .github/skills/my-skill

# Generate multi-repo prompt
npx tsx agent-generator/src/scripts/generate-from-multi-repo.ts

# Sync everything
.\scripts\sync_agent_library.ps1
````

---

## 🎉 Summary

You now have:

1. ✅ **Python generator** for programmatic agent/prompt/skill creation
2. ✅ **TypeScript scanner** for skill discovery and schema generation
3. ✅ **Integration workflow** connecting both systems
4. ✅ **Validation tools** for ensuring quality
5. ✅ **70+ existing items** ready to use
6. ✅ **Paths to 200+** with custom generation

**Next Actions**:

1. Run `python scripts/generate_agent_library.py` to see it in action
2. Create your first custom agent using the patterns above
3. Build domain-specific skills for your use cases
4. Integrate with your agent runtime
5. Scale to 200+ items as needed

**Questions or issues?** Check the generated files in `.github/` for examples!

---

**Version**: 1.0.0
**Last Updated**: February 7, 2026
**Status**: ✅ Production Ready
