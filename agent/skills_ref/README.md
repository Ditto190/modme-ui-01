# Agent Skills Reference Library - ModMe UI Workbench Adaptation

> **Python library for working with Agent Skills - validation, parsing, and prompt generation**

**Based on**: [agentskills/agentskills/skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref)  
**Specification**: [Agent Skills Specification](https://agentskills.io/specification)  
**Status**: ✅ Complete and Ready for Use

---

## What is Agent Skills?

[Agent Skills](https://agentskills.io) is an open format for extending AI agent capabilities with specialized knowledge and workflows. A skill is a directory containing:

- **SKILL.md** - Instructions + metadata (required)
- **scripts/** - Executable code (optional)
- **references/** - Documentation (optional)
- **assets/** - Templates, resources (optional)

---

## What Does This Library Do?

This library provides Python utilities for:

1. **Parsing** SKILL.md files and extracting metadata
2. **Validating** skill structure, naming, and frontmatter
3. **Generating** `<available_skills>` XML for agent prompts

---

## Installation

### Prerequisites

```bash
# Install dependencies (if not already installed)
pip install strictyaml click
# or
uv add strictyaml click
```

### Usage

```python
# Import from skills_ref module
from agent.skills_ref import validate, read_properties, to_prompt
```

---

## CLI Commands

### 1. Validate a Skill

```bash
# Using Python module
python -m agent.skills_ref.cli validate path/to/my-skill

# Using CLI directly (if installed)
skills-ref validate path/to/my-skill
```

**Output (valid skill)**:

```
Valid skill: path/to/my-skill
```

**Output (invalid skill)**:

```
Validation failed for path/to/my-skill:
  - Directory name 'my_skill' must match skill name 'my-skill'
  - Description exceeds 1024 character limit (1200 chars)
```

---

### 2. Read Skill Properties

```bash
python -m agent.skills_ref.cli read-properties path/to/my-skill
```

**Output (JSON)**:

```json
{
  "name": "pdf-reader",
  "description": "Extract text and tables from PDF files",
  "license": "MIT",
  "compatibility": "Requires Python 3.11+",
  "metadata": {
    "author": "ModMe Team",
    "version": "1.0"
  }
}
```

---

### 3. Generate Agent Prompt

```bash
python -m agent.skills_ref.cli to-prompt path/to/skill-a path/to/skill-b
```

**Output (XML)**:

```xml
<available_skills>
<skill>
<name>
pdf-reader
</name>
<description>
Extract text and tables from PDF files
</description>
<location>
C:\Users\dylan\modme-ui-01\agent-generator\src\skills\pdf-reader\SKILL.md
</location>
</skill>
<skill>
<name>
image-analyzer
</name>
<description>
Analyze images and extract metadata
</description>
<location>
C:\Users\dylan\modme-ui-01\agent-generator\src\skills\image-analyzer\SKILL.md
</location>
</skill>
</available_skills>
```

---

## Python API

### Example 1: Validate a Skill

```python
from pathlib import Path
from agent.skills_ref import validate

skill_path = Path("agent-generator/src/skills/my-skill")
errors = validate(skill_path)

if errors:
    print("❌ Validation failed:")
    for error in errors:
        print(f"  - {error}")
else:
    print(f"✅ Valid skill: {skill_path}")
```

---

### Example 2: Read Skill Properties

```python
from pathlib import Path
from agent.skills_ref import read_properties

skill_path = Path("agent-generator/src/skills/pdf-reader")
props = read_properties(skill_path)

print(f"Name: {props.name}")
print(f"Description: {props.description}")
print(f"License: {props.license}")

# Convert to dict for JSON serialization
props_dict = props.to_dict()
```

---

### Example 3: Generate Skills Prompt

```python
from pathlib import Path
from agent.skills_ref import to_prompt

skills = [
    Path("agent-generator/src/skills/pdf-reader"),
    Path("agent-generator/src/skills/image-analyzer"),
]

prompt_xml = to_prompt(skills)
print(prompt_xml)

# Save to file
Path("output/available_skills.xml").write_text(prompt_xml, encoding="utf-8")
```

---

## Agent Tool Integration

### Use as Agent Tools (via GenAI Toolbox)

```bash
# Validate a skill
genai-toolbox run validate_skill --skill_path agent-generator/src/skills/my-skill

# Read properties
genai-toolbox run read_skill_properties --skill_path agent-generator/src/skills/pdf-reader

# Generate prompt
genai-toolbox run generate_skills_prompt \
  --skill_paths '["agent-generator/src/skills/pdf-reader", "agent-generator/src/skills/image-analyzer"]' \
  --output_file output/available_skills.xml
```

---

### Add to Google ADK Agent

```python
# agent/main.py
from google.adk.agents import LlmAgent
from agent.tools.skills_ref_tools import (
    validate_skill,
    read_skill_properties,
    generate_skills_prompt
)

workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    model="gemini-2.5-flash",
    instruction="You manage a generative UI workbench...",
    tools=[
        # ... existing tools
        validate_skill,
        read_skill_properties,
        generate_skills_prompt,
    ]
)
```

---

## SKILL.md Format

### Required Frontmatter

```yaml
---
name: my-skill
description: A description of what this skill does and when to use it.
---
```

### Full Example

```markdown
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents.
license: Apache-2.0
compatibility: Requires Python 3.11+, poppler-utils
metadata:
  author: example-org
  version: "1.0"
---

# PDF Processing

## When to use this skill

Use this skill when the user needs to work with PDF files...

## How to extract text

1. Use pdfplumber for text extraction...
```

---

## Validation Rules

### Skill Name

| Rule          | Constraint                                           |
| ------------- | ---------------------------------------------------- |
| **Format**    | Lowercase letters, numbers, hyphens only             |
| **Length**    | Max 64 characters                                    |
| **Hyphens**   | Cannot start/end with hyphen, no consecutive hyphens |
| **Directory** | Directory name must match skill name exactly         |

**Valid Names**: `pdf-reader`, `image-processing`, `data-analyzer`  
**Invalid Names**: `PDF-Reader` (uppercase), `my_skill` (underscore), `-my-skill` (starts with hyphen)

---

### Description

| Rule         | Constraint          |
| ------------ | ------------------- |
| **Required** | Yes                 |
| **Length**   | Max 1024 characters |
| **Content**  | Non-empty string    |

---

### Compatibility (Optional)

| Rule        | Constraint                                             |
| ----------- | ------------------------------------------------------ |
| **Length**  | Max 500 characters                                     |
| **Purpose** | Environment requirements (packages, system deps, etc.) |

**Example**: `Requires Python 3.11+, poppler-utils, network access`

---

### License (Optional)

| Rule       | Constraint                                        |
| ---------- | ------------------------------------------------- |
| **Format** | License name or reference to bundled license file |

**Example**: `MIT`, `Apache-2.0`, `See LICENSE.txt`

---

### Metadata (Optional)

| Rule        | Constraint                    |
| ----------- | ----------------------------- |
| **Format**  | Key-value pairs (all strings) |
| **Purpose** | Client-specific properties    |

**Example**:

```yaml
metadata:
  author: ModMe Team
  version: "1.0"
  category: pdf-tools
```

---

## Error Messages

### Common Validation Errors

```
❌ Missing required file: SKILL.md
   → Create a SKILL.md file in the skill directory

❌ SKILL.md must start with YAML frontmatter (---)
   → Add --- at the start of SKILL.md

❌ Missing required field in frontmatter: name
   → Add name: my-skill to frontmatter

❌ Skill name 'My-Skill' must be lowercase
   → Change to my-skill

❌ Directory name 'my_skill' must match skill name 'my-skill'
   → Rename directory to my-skill

❌ Description exceeds 1024 character limit (1200 chars)
   → Shorten description to <= 1024 chars

❌ Unexpected fields in frontmatter: foo, bar
   → Remove unknown fields (allowed: name, description, license, compatibility, allowed-tools, metadata)
```

---

## File Structure

```
agent/
├── skills_ref/               # skills-ref library
│   ├── __init__.py          # Public API exports
│   ├── errors.py            # SkillError, ParseError, ValidationError
│   ├── models.py            # SkillProperties dataclass
│   ├── parser.py            # YAML frontmatter parsing
│   ├── validator.py         # Validation logic
│   ├── prompt.py            # XML generation for agent prompts
│   └── cli.py               # Click-based CLI commands
│
├── tools/
│   └── skills_ref_tools.py  # Agent tool wrappers (ToolContext compatible)
│
agent-generator/
└── src/
    └── skills/              # Your skills directory
        ├── pdf-reader/
        │   ├── SKILL.md
        │   ├── scripts/
        │   └── references/
        └── image-analyzer/
            └── SKILL.md
```

---

## Comparison: Original vs Adapted

| Feature           | agentskills/skills-ref | ModMe Adaptation        |
| ----------------- | ---------------------- | ----------------------- |
| **Parser**        | ✅ StrictYAML          | ✅ StrictYAML           |
| **Validator**     | ✅ Full spec           | ✅ Full spec            |
| **Prompt Gen**    | ✅ XML format          | ✅ XML format           |
| **CLI**           | ✅ Click               | ✅ Click                |
| **Agent Tools**   | ❌ No                  | ✅ ToolContext wrappers |
| **GenAI Toolbox** | ❌ No                  | ✅ tools.yaml config    |
| **Python 3.12+**  | ✅ Yes                 | ✅ Yes                  |
| **License**       | Apache 2.0             | Apache 2.0              |

---

## Next Steps

### 1. Create Your First Skill

```bash
# Create skill directory
mkdir -p agent-generator/src/skills/my-first-skill

# Create SKILL.md
cat > agent-generator/src/skills/my-first-skill/SKILL.md << 'EOF'
---
name: my-first-skill
description: A test skill to demonstrate Agent Skills format
---

# My First Skill

## When to use
Use this skill when...

## Instructions
To perform X, do Y...
EOF

# Validate
python -m agent.skills_ref.cli validate agent-generator/src/skills/my-first-skill
```

---

### 2. Generate Agent Prompt

```bash
# Generate <available_skills> XML
python -m agent.skills_ref.cli to-prompt \
  agent-generator/src/skills/my-first-skill \
  > output/available_skills.xml
```

---

### 3. Integrate with Agent

```python
# agent/main.py
from pathlib import Path
from agent.skills_ref import to_prompt

# Get all skills
skills_dir = Path("agent-generator/src/skills")
skill_dirs = [d for d in skills_dir.iterdir() if d.is_dir()]

# Generate prompt XML
skills_xml = to_prompt(skill_dirs)

# Add to agent instruction
workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    model="gemini-2.5-flash",
    instruction=f"""
    You are the Workbench Assistant.

    {skills_xml}

    When a user asks for help, check if any of the available skills can help.
    """
)
```

---

## Testing

```bash
# Run tests (when test suite is added)
pytest tests/test_skills_ref.py -v

# Test CLI commands
python -m agent.skills_ref.cli validate agent-generator/src/skills/test-skill
python -m agent.skills_ref.cli read-properties agent-generator/src/skills/test-skill
python -m agent.skills_ref.cli to-prompt agent-generator/src/skills/test-skill
```

---

## Troubleshooting

### Issue: `ModuleNotFoundError: No module named 'strictyaml'`

```bash
pip install strictyaml
# or
uv add strictyaml
```

---

### Issue: `ValidationError: Missing required field: name`

**Solution**: Add `name` field to SKILL.md frontmatter:

```yaml
---
name: my-skill
description: My skill description
---
```

---

### Issue: Directory name doesn't match skill name

**Error**: `Directory name 'my_skill' must match skill name 'my-skill'`

**Solution**: Rename directory to match skill name exactly:

```bash
mv my_skill my-skill
```

---

## References

- **Agent Skills Specification**: <https://agentskills.io/specification>
- **agentskills/skills-ref**: <https://github.com/agentskills/agentskills/tree/main/skills-ref>
- **Example Skills**: <https://github.com/anthropics/skills>
- **Integration Guide**: <https://agentskills.io/integrate-skills>

---

## License

Apache 2.0 (matching original skills-ref library)

---

## Contributing

To extend this library:

1. Review [agentskills specification](https://agentskills.io/specification)
2. Follow patterns in `agent/skills_ref/*.py`
3. Add tests to `tests/test_skills_ref.py`
4. Update this README

---

**Last Updated**: January 3, 2026  
**Maintained By**: ModMe GenUI Team  
**Based On**: agentskills/agentskills/skills-ref v0.1.0
