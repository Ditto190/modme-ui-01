# Anthropic Skills Integration Guide

## Overview

This guide explains how to integrate skills from the [Anthropic skills repository](https://github.com/anthropics/skills) into the ModMe GenUI Workbench.

## Quick Start

### 1. List Available Skills

```bash
node scripts/knowledge-management/anthropic-skill-converter.js --list
```

### 2. Convert a Single Skill

```bash
# Convert skill-creator skill
node scripts/knowledge-management/anthropic-skill-converter.js \
  --skill skill-creator \
  --output agent-generator/src/skills

# Validate converted skill
node scripts/knowledge-management/skill-spec-validator.js \
  agent-generator/src/skills/skill-creator
```

### 3. Batch Convert All Skills

```bash
node scripts/knowledge-management/anthropic-skill-converter.js \
  --batch \
  --output agent-generator/src/skills
```

## Architecture

### Anthropic Skills Format

```
skills/
└── skill-name/
    ├── SKILL.md                  # Frontmatter + instructions
    ├── LICENSE.txt               # Licensing info
    ├── scripts/                  # Executable code
    │   ├── example.py
    │   └── helper.sh
    ├── references/               # Documentation for context
    │   ├── api_reference.md
    │   └── workflow_guide.md
    └── assets/                   # Files for output
        ├── template.pptx
        └── logo.png
```

### ModMe Converted Format

```
agent-generator/src/skills/
└── skill-name/
    ├── SKILL.md                  # Converted format with ModMe metadata
    ├── tools.py                  # Generated Python tool functions
    ├── tools.yaml                # GenAI Toolbox configuration
    ├── scripts/                  # Original scripts preserved
    ├── references/               # Original references preserved
    └── assets/                   # Original assets preserved
```

## Conversion Process

### Step 1: Download from GitHub

The converter uses the GitHub API to:
1. Fetch SKILL.md with frontmatter and body
2. Download all files in `scripts/`, `references/`, `assets/`
3. Preserve directory structure

### Step 2: Parse and Validate

Validates against [Agent Skills Specification](https://agentskills.io/specification):
- ✅ Frontmatter format (name, description, license)
- ✅ Naming conventions (hyphen-case, max 64 chars)
- ✅ Description completeness (50-1024 chars, includes triggers)
- ✅ Body length (max 500 lines for context efficiency)
- ✅ Resource organization

### Step 3: Generate Python Tools

Creates `tools.py` with tool functions for each script:

```python
"""
Auto-generated tools for pdf-editor skill
Source: anthropics/skills
"""

from google.adk.tools import ToolContext
from typing import Dict, Any

def rotate_pdf(tool_context: ToolContext, **kwargs) -> Dict[str, Any]:
    """
    Execute rotate_pdf.py from pdf-editor skill
    
    Args:
        **kwargs: Parameters for the script
    
    Returns:
        Dictionary with status and result
    """
    # Implementation here
    pass
```

### Step 4: Generate GenAI Toolbox YAML

Creates `tools.yaml` configuration:

```yaml
sources: {}
tools:
  rotate_pdf:
    kind: custom
    description: "Tool from pdf-editor skill: rotate_pdf.py"
    parameters:
      - name: input
        type: string
        description: 'Input for the tool'
```

### Step 5: Add ModMe Metadata

Adds integration notes to SKILL.md:

```markdown
---
name: pdf-editor
description: PDF manipulation toolkit
source: anthropics/skills
converted: 2026-01-03T12:00:00Z
license: Apache 2.0
---

# PDF Editor Skill

[Original content...]

---

## ModMe Integration Notes

This skill was automatically converted from the Anthropic skills repository.

### Available Resources

**Scripts**: 5 Python scripts
**References**: 2 reference documents
**Assets**: 3 asset files

### Tools Generated

See `tools.py` for Python tool implementations.
See `tools.yaml` for GenAI Toolbox configuration.
```

## Using Converted Skills

### Option 1: Direct Python Import

```python
# agent/main.py
from agent.tools.skills.pdf_editor import rotate_pdf, merge_pdfs

workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    model="gemini-2.5-flash",
    tools=[
        rotate_pdf,
        merge_pdfs,
        # ... other tools
    ]
)
```

### Option 2: GenAI Toolbox Integration

```python
# agent/main.py
from genai_toolbox import load_tools

# Load tools from YAML
tools = load_tools("agent-generator/src/skills/pdf-editor/tools.yaml")

workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    model="gemini-2.5-flash",
    tools=tools
)
```

### Option 3: Dynamic Loading

```python
# agent/toolset_manager.py
def load_skill(skill_name: str):
    """Dynamically load skill and register tools"""
    skill_path = Path(f"agent-generator/src/skills/{skill_name}")
    
    # Load tools.py
    spec = importlib.util.spec_from_file_location(
        f"skills.{skill_name}",
        skill_path / "tools.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    # Return all tool functions
    return [
        getattr(module, name)
        for name in dir(module)
        if not name.startswith('_') and callable(getattr(module, name))
    ]
```

## Schema Crawler Integration

Convert MCP tool JSON Schemas to Zod validation:

### Python API

```python
from agent.tools.schema_crawler_tool import generate_zod_module

# Generate Zod module for a tool
result = generate_zod_module(
    tool_context,
    tool_name="getWeather",
    input_schema={
        "type": "object",
        "properties": {
            "city": {"type": "string", "minLength": 2},
            "units": {"type": "string", "enum": ["celsius", "fahrenheit"]}
        },
        "required": ["city"]
    },
    output_path="src/schemas/getWeather.schema.ts"
)

print(result["message"])
# Module for getWeather generated and written to src/schemas/getWeather.schema.ts
```

### GenAI Toolbox YAML

```yaml
tools:
  generate_weather_schema:
    kind: python
    module: agent.tools.schema_crawler_tool
    function: generate_zod_module
    description: "Generate Zod schema for weather API"
    parameters:
      - name: tool_name
        type: string
        description: "getWeather"
      - name: input_schema
        type: object
        description: {...}
```

## Validation

### Validate Converted Skills

```bash
# Validate single skill
node scripts/knowledge-management/skill-spec-validator.js \
  agent-generator/src/skills/skill-creator

# Output:
# ✅ Skill is valid!
# 
# 📊 Metrics:
#    - Body: 347 lines, 2,850 words
#    - Description: 156 chars, 24 words
#    - Context efficiency: Good
```

### Common Validation Errors

| Error | Fix |
|-------|-----|
| `Invalid name format` | Use lowercase with hyphens only |
| `Description too short` | Add more detail + triggers (min 50 chars) |
| `Body too long` | Split into `references/` files (<500 lines) |
| `Unexpected frontmatter keys` | Remove invalid keys (only name, description, license, allowed-tools, metadata) |

## Best Practices

### 1. Progressive Disclosure

Keep SKILL.md body concise (<400 lines ideal):

```markdown
# PDF Editor

## Quick Start
[Basic usage...]

## Advanced Features
- **Form filling**: See [FORMS.md](references/FORMS.md)
- **API reference**: See [REFERENCE.md](references/REFERENCE.md)
```

### 2. Resource Organization

```
skill-name/
├── SKILL.md              # Core instructions (< 500 lines)
├── scripts/              # Executable code only
│   └── process.py
├── references/           # Docs for context
│   ├── api.md           # Loaded when needed
│   └── workflow.md
└── assets/               # Output files (not loaded into context)
    └── template.pptx
```

### 3. Tool Naming

```python
# ✅ GOOD: Descriptive function names
def rotate_pdf_clockwise(tool_context, angle: int): pass
def merge_multiple_pdfs(tool_context, file_paths: List[str]): pass

# ❌ BAD: Generic names
def tool1(tool_context, args): pass
def process(tool_context, data): pass
```

### 4. Schema Validation

Always validate tool inputs/outputs with Zod:

```typescript
// Generated by schema-crawler
import { getWeatherInputSchema } from "./getWeather.schema";

function callWeatherTool(userInput: unknown) {
  const validated = getWeatherInputSchema.parse(userInput);
  // Now TypeScript knows validated is { city: string; units?: string }
}
```

## Troubleshooting

### Issue: Skill conversion fails

**Symptoms**: `❌ Error downloading skill-name: 404`

**Solution**: Verify skill exists in [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills)

```bash
# List all available skills first
node scripts/knowledge-management/anthropic-skill-converter.js --list
```

### Issue: Generated tools not working

**Symptoms**: `ModuleNotFoundError: No module named 'agent.tools.skills'`

**Solution**: Ensure Python path includes agent directory

```python
# agent/main.py
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from agent.tools.skills.pdf_editor import rotate_pdf
```

### Issue: Schema crawler timeout

**Symptoms**: `Schema generation timed out (>30s)`

**Solution**: Simplify JSON Schema or run manually

```bash
# Test schema-crawler directly
cd agent-generator/src/mcp-registry
node -e "const {generateZodFromJSONSchema} = require('./schema-crawler'); \
  console.log(generateZodFromJSONSchema({type: 'string'}, 'TestSchema'));"
```

## Related Documentation

- **Agent Skills Specification**: https://agentskills.io/specification
- **Anthropic Skills Repo**: https://github.com/anthropics/skills
- **Schema Crawler README**: [agent-generator/SCHEMA_CRAWLER_README.md](../agent-generator/SCHEMA_CRAWLER_README.md)
- **GenAI Toolbox Docs**: https://googleapis.github.io/genai-toolbox/

## NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "skills:list": "node scripts/knowledge-management/anthropic-skill-converter.js --list",
    "skills:convert": "node scripts/knowledge-management/anthropic-skill-converter.js --skill",
    "skills:batch": "node scripts/knowledge-management/anthropic-skill-converter.js --batch",
    "skills:validate": "node scripts/knowledge-management/skill-spec-validator.js"
  }
}
```

**Usage**:

```bash
npm run skills:list
npm run skills:convert -- skill-creator --output ./output
npm run skills:batch -- --output ./output
npm run skills:validate -- ./output/skill-creator
```

---

**Last Updated**: January 3, 2026  
**Maintained by**: ModMe GenUI Team
