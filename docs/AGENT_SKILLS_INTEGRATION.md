# Agent Skills Integration Guide - ModMe UI Workbench

> **Complete guide to integrating the skills-ref library into ModMe GenUI**

**Date**: January 3, 2026  
**Status**: ✅ Implementation Complete

---

## Overview

This project now includes a complete adaptation of the [agentskills/skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref) library for working with Agent Skills in the ModMe UI Workbench.

**What was added**:

- ✅ `agent/skills_ref/` - Complete Python library (7 modules, ~800 lines)
- ✅ `agent/tools/skills_ref_tools.py` - Agent tool wrappers (~250 lines)
- ✅ `genai-toolbox/tools.yaml` - Tool configurations (3 new tools)
- ✅ Documentation - README + integration guide (~600 lines)

---

## Quick Start

### 1. Install Dependencies

```bash
# Install strictyaml (required for YAML parsing)
pip install strictyaml click

# Or using uv
uv add strictyaml click
```

---

### 2. Create Your First Skill

```bash
# Create skill directory
mkdir -p agent-generator/src/skills/demo-skill

# Create SKILL.md
cat > agent-generator/src/skills/demo-skill/SKILL.md << 'EOF'
---
name: demo-skill
description: A demonstration skill showing Agent Skills format
license: MIT
---

# Demo Skill

## When to use this skill
Use this skill when you need an example of the Agent Skills format.

## Instructions
This skill demonstrates:
- YAML frontmatter with metadata
- Markdown body with instructions
- Proper naming conventions (lowercase, hyphens)

## Example
When a user asks "Show me a demo skill", reference this skill.
EOF
```

---

### 3. Validate the Skill

```bash
# Using Python module
python -m agent.skills_ref.cli validate agent-generator/src/skills/demo-skill

# Expected output:
# Valid skill: agent-generator/src/skills/demo-skill
```

---

### 4. Generate Agent Prompt

```bash
# Generate XML for agent prompt
python -m agent.skills_ref.cli to-prompt agent-generator/src/skills/demo-skill

# Output:
# <available_skills>
# <skill>
# <name>
# demo-skill
# </name>
# <description>
# A demonstration skill showing Agent Skills format
# </description>
# <location>
# C:\Users\dylan\modme-ui-01\agent-generator\src\skills\demo-skill\SKILL.md
# </location>
# </skill>
# </available_skills>
```

---

## Python API Usage

### Example 1: Validate Multiple Skills

```python
from pathlib import Path
from agent.skills_ref import validate

# Get all skills in directory
skills_dir = Path("agent-generator/src/skills")
skill_dirs = [d for d in skills_dir.iterdir() if d.is_dir()]

# Validate each skill
for skill_dir in skill_dirs:
    errors = validate(skill_dir)
    if errors:
        print(f"❌ {skill_dir.name}: {len(errors)} error(s)")
        for error in errors:
            print(f"   - {error}")
    else:
        print(f"✅ {skill_dir.name}: Valid")
```

---

### Example 2: Read and Display Properties

```python
from pathlib import Path
from agent.skills_ref import read_properties
import json

skill_path = Path("agent-generator/src/skills/demo-skill")
props = read_properties(skill_path)

# Print as JSON
print(json.dumps(props.to_dict(), indent=2))

# Access properties
print(f"\nSkill: {props.name}")
print(f"Description: {props.description}")
print(f"License: {props.license}")
```

---

### Example 3: Generate Prompt for Agent

```python
from pathlib import Path
from agent.skills_ref import to_prompt

# Get all skills
skills_dir = Path("agent-generator/src/skills")
skill_paths = [d for d in skills_dir.iterdir() if d.is_dir()]

# Generate XML
prompt_xml = to_prompt(skill_paths)

# Write to file
output_path = Path("output/available_skills.xml")
output_path.parent.mkdir(exist_ok=True)
output_path.write_text(prompt_xml, encoding="utf-8")

print(f"Generated prompt for {len(skill_paths)} skills")
print(f"Saved to: {output_path}")
```

---

## Agent Integration

### Option 1: Manual Integration

```python
# agent/main.py
from pathlib import Path
from agent.skills_ref import to_prompt

# Generate skills prompt
skills_dir = Path(__file__).parent.parent / "agent-generator" / "src" / "skills"
if skills_dir.exists():
    skill_dirs = [d for d in skills_dir.iterdir() if d.is_dir()]
    skills_xml = to_prompt(skill_dirs)
else:
    skills_xml = ""

workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    model="gemini-2.5-flash",
    instruction=f"""
    You are the Workbench Assistant. You help users build dashboards and tools.
    
    {skills_xml}
    
    When a user asks for help, check if any of the available skills can assist.
    If a skill is relevant, mention it and offer to use its instructions.
    """,
    tools=[
        upsert_ui_element,
        remove_ui_element,
        clear_canvas,
    ]
)
```

---

### Option 2: Tool-Based Integration

```python
# agent/main.py
from agent.tools.skills_ref_tools import (
    validate_skill,
    read_skill_properties,
    generate_skills_prompt
)

workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    model="gemini-2.5-flash",
    instruction="""
    You are the Workbench Assistant.
    
    You have access to Agent Skills tools:
    - validate_skill: Check if a skill directory is valid
    - read_skill_properties: Get metadata from a skill
    - generate_skills_prompt: Generate XML for agent prompts
    
    Use these tools to discover and work with available skills.
    """,
    tools=[
        # ... existing tools
        validate_skill,
        read_skill_properties,
        generate_skills_prompt,
    ]
)
```

---

## GenAI Toolbox Integration

### Run Tools via CLI

```bash
# Validate a skill
genai-toolbox run validate_skill \
  --skill_path agent-generator/src/skills/demo-skill

# Read properties
genai-toolbox run read_skill_properties \
  --skill_path agent-generator/src/skills/demo-skill

# Generate prompt
genai-toolbox run generate_skills_prompt \
  --skill_paths '["agent-generator/src/skills/demo-skill"]' \
  --output_file output/prompt.xml
```

---

## Creating Skills

### Skill Directory Structure

```
my-skill/
├── SKILL.md          # Required: instructions + metadata
├── scripts/          # Optional: executable code
│   └── process.py
├── references/       # Optional: documentation
│   └── API.md
└── assets/           # Optional: templates, resources
    └── template.json
```

---

### SKILL.md Template

```markdown
---
name: my-skill
description: Brief description of what this skill does and when to use it (max 1024 chars)
license: MIT
compatibility: Requires Python 3.11+, specific packages, network access, etc. (max 500 chars)
metadata:
  author: Your Name
  version: "1.0"
  category: skill-category
---

# Skill Title

## When to use this skill
Describe scenarios where this skill is relevant...

## Prerequisites
- List any required tools, packages, or knowledge
- System requirements
- API keys or credentials needed

## Instructions

### Step 1: Setup
Detailed instructions for initial setup...

### Step 2: Usage
How to use the skill...

### Step 3: Troubleshooting
Common issues and solutions...

## Examples

### Example 1: Basic Usage
\`\`\`python
# Example code
result = do_something()
\`\`\`

### Example 2: Advanced Usage
\`\`\`python
# More complex example
result = advanced_operation()
\`\`\`

## References
- [External docs](https://example.com)
- [API reference](https://api.example.com)
```

---

## Validation Best Practices

### 1. Validate Before Committing

```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
for skill_dir in agent-generator/src/skills/*/; do
    python -m agent.skills_ref.cli validate "$skill_dir"
    if [ $? -ne 0 ]; then
        echo "❌ Skill validation failed: $skill_dir"
        exit 1
    fi
done
```

---

### 2. CI/CD Integration

```yaml
# .github/workflows/validate-skills.yml
name: Validate Skills

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          pip install strictyaml click
      
      - name: Validate all skills
        run: |
          for skill_dir in agent-generator/src/skills/*/; do
            echo "Validating $skill_dir"
            python -m agent.skills_ref.cli validate "$skill_dir"
          done
```

---

### 3. Pre-Deployment Check

```python
# scripts/validate_all_skills.py
from pathlib import Path
from agent.skills_ref import validate

skills_dir = Path("agent-generator/src/skills")
all_valid = True

for skill_dir in skills_dir.iterdir():
    if not skill_dir.is_dir():
        continue
    
    errors = validate(skill_dir)
    if errors:
        print(f"❌ {skill_dir.name}")
        for error in errors:
            print(f"   {error}")
        all_valid = False
    else:
        print(f"✅ {skill_dir.name}")

if not all_valid:
    sys.exit(1)
```

---

## Testing

### Unit Tests

```python
# tests/test_skills_ref.py
import pytest
from pathlib import Path
from agent.skills_ref import validate, read_properties, to_prompt

def test_validate_valid_skill(tmp_path):
    """Valid skill should pass validation."""
    skill_dir = tmp_path / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: test-skill
description: A test skill
---
Body
""")
    
    errors = validate(skill_dir)
    assert errors == []

def test_validate_invalid_name(tmp_path):
    """Invalid skill name should fail validation."""
    skill_dir = tmp_path / "Test-Skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: Test-Skill
description: A test skill
---
Body
""")
    
    errors = validate(skill_dir)
    assert any("lowercase" in e for e in errors)

def test_read_properties(tmp_path):
    """Should read properties from SKILL.md."""
    skill_dir = tmp_path / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: test-skill
description: A test skill
license: MIT
---
Body
""")
    
    props = read_properties(skill_dir)
    assert props.name == "test-skill"
    assert props.description == "A test skill"
    assert props.license == "MIT"

def test_to_prompt(tmp_path):
    """Should generate XML prompt."""
    skill_dir = tmp_path / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("""---
name: test-skill
description: A test skill
---
Body
""")
    
    xml = to_prompt([skill_dir])
    assert "<available_skills>" in xml
    assert "<name>" in xml
    assert "test-skill" in xml
```

---

## Troubleshooting

### Issue: Import Error

```python
# Error: ModuleNotFoundError: No module named 'agent.skills_ref'

# Solution: Ensure you're in the project root
cd c:\Users\dylan\modme-ui-01

# And Python can find the agent package
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

---

### Issue: strictyaml Not Found

```bash
# Error: ModuleNotFoundError: No module named 'strictyaml'

# Solution: Install dependency
pip install strictyaml
# or
uv add strictyaml
```

---

### Issue: Validation Fails

```python
# Error: Validation failed: Directory name 'my_skill' must match skill name 'my-skill'

# Solution: Rename directory
mv agent-generator/src/skills/my_skill agent-generator/src/skills/my-skill
```

---

## Next Steps

1. **Create Skills**: Add skills to `agent-generator/src/skills/`
2. **Validate**: Run validation on all skills
3. **Generate Prompt**: Create `<available_skills>` XML
4. **Integrate**: Add to agent instructions
5. **Test**: Verify agent can reference skills
6. **Document**: Update skill-specific docs

---

## File Checklist

```
✅ agent/skills_ref/__init__.py       - Module exports
✅ agent/skills_ref/errors.py         - Exception classes
✅ agent/skills_ref/models.py         - SkillProperties dataclass
✅ agent/skills_ref/parser.py         - YAML parsing
✅ agent/skills_ref/validator.py      - Validation logic
✅ agent/skills_ref/prompt.py         - XML generation
✅ agent/skills_ref/cli.py            - CLI commands
✅ agent/skills_ref/README.md         - Library documentation
✅ agent/tools/skills_ref_tools.py    - Agent tool wrappers
✅ genai-toolbox/tools.yaml           - Tool configurations (updated)
✅ docs/AGENT_SKILLS_INTEGRATION.md   - This integration guide
```

---

## References

- **Agent Skills Website**: <https://agentskills.io>
- **Specification**: <https://agentskills.io/specification>
- **Original Library**: <https://github.com/agentskills/agentskills/tree/main/skills-ref>
- **Example Skills**: <https://github.com/anthropics/skills>
- **ModMe Docs**: [Project_Overview.md](../Project_Overview.md)

---

**Last Updated**: January 3, 2026  
**Status**: ✅ Complete and Ready for Use  
**Maintained By**: ModMe GenUI Team
