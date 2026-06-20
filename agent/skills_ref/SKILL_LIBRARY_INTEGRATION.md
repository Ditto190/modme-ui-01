# Skill Library Integration - Complete Guide

> **Curated skill library from Ai-Agent-Skills repository integrated into ModMe GenUI Workbench**

**Repository**: <https://github.com/skillcreatorai/Ai-Agent-Skills>  
**Specification**: <https://agentskills.io/specification>  
**Status**: ✅ Ready for Use

---

## Overview

The Skill Library Manager provides a curated collection of 40+ Agent Skills that can be installed and used with our GenUI Workbench agent. Skills extend agent capabilities with specialized knowledge, workflows, and tool integrations.

---

## Installation

### Prerequisites

```bash
# Install required Python packages
cd agent
uv add click strictyaml

# Or with pip
pip install click strictyaml
```

---

## Quick Start

### 1. List Available Skills

```bash
# List all skills
python -m agent.skills_ref.skill_library list

# List by category
python -m agent.skills_ref.skill_library list --category development

# JSON output
python -m agent.skills_ref.skill_library list --format json
```

**Example Output**:

```
📚 Available Skills

Name                           Category        Featured   Verified
----------------------------------------------------------------------
frontend-design                development     ✨ Yes      ✓ Yes
mcp-builder                    development     ✨ Yes      ✓ Yes
theme-factory                  creative        No         ✓ Yes
code-review                    development     ✨ Yes      ✓ Yes
pdf                            document        ✨ Yes      ✓ Yes

📊 Total: 40 skills
```

---

### 2. Search for Skills

```bash
# Search by keyword
python -m agent.skills_ref.skill_library search "pdf"
python -m agent.skills_ref.skill_library search "frontend"
python -m agent.skills_ref.skill_library search "test"
```

---

### 3. Install Skills

```bash
# Install a single skill
python -m agent.skills_ref.skill_library install theme-factory

# Install recommended skills for GenUI
python -m agent.skills_ref.skill_library install-recommended

# Overwrite existing installation
python -m agent.skills_ref.skill_library install theme-factory --overwrite

# Skip validation (faster but risky)
python -m agent.skills_ref.skill_library install mcp-builder --no-validate
```

**Recommended Skills for GenUI Workbench**:

- `theme-factory` - Professional theming for artifacts
- `mcp-builder` - Create MCP servers
- `code-review` - Automated PR analysis
- `frontend-design` - Production UI components
- `artifacts-builder` - Interactive React components

---

### 4. View Installed Skills

```bash
# List installed
python -m agent.skills_ref.skill_library installed

# JSON format
python -m agent.skills_ref.skill_library installed --format json
```

---

### 5. Uninstall Skills

```bash
python -m agent.skills_ref.skill_library uninstall theme-factory
```

---

### 6. Generate Agent Prompt

```bash
# Output to stdout
python -m agent.skills_ref.skill_library generate-prompt

# Write to file
python -m agent.skills_ref.skill_library generate-prompt --output agent_skills.xml
```

---

## Python API Usage

### Basic Usage

```python
from agent.skills_ref.skill_library_manager import SkillLibraryManager

# Initialize manager
manager = SkillLibraryManager()

# List available skills
skills = manager.list_available_skills()
for skill in skills:
    print(f"{skill.name}: {skill.description}")

# Search for skills
frontend_skills = manager.search_skills("frontend")

# Install a skill
result = manager.install_skill("theme-factory")
if result["status"] == "success":
    print(f"Installed to {result['path']}")
```

---

### Advanced Usage

```python
from pathlib import Path
from agent.skills_ref.skill_library_manager import (
    SkillLibraryManager,
    install_recommended_skills,
    generate_agent_prompt
)

# Custom directories
manager = SkillLibraryManager(
    cache_dir=Path("/custom/cache"),
    skills_dir=Path("/custom/skills")
)

# Update repository
manager.clone_or_update_repo(force=True)

# Install multiple skills
results = manager.install_multiple([
    "theme-factory",
    "mcp-builder",
    "code-review"
])

# Generate prompt for agent
prompt = generate_agent_prompt()
print(prompt)
```

---

### Integration with Agent

```python
# agent/main.py
from agent.skills_ref.skill_library_manager import generate_agent_prompt

def before_model_modifier(callback_context, llm_request):
    """Inject skills into system instructions"""

    # Get current instruction
    original_instruction = llm_request.config.system_instruction

    # Generate skills prompt
    skills_prompt = generate_agent_prompt()

    # Prepend to instruction
    enhanced_instruction = f"""
{skills_prompt}

{original_instruction}
"""

    llm_request.config.system_instruction = enhanced_instruction
    return None
```

---

## Available Skill Categories

| Category         | Count | Description                                 |
| ---------------- | ----- | ------------------------------------------- |
| **Development**  | 13    | Coding and software development skills      |
| **Document**     | 4     | Document processing (PDF, DOCX, XLSX, PPTX) |
| **Creative**     | 6     | Design and creative workflows               |
| **Business**     | 5     | Business communication and analysis         |
| **Productivity** | 12    | Workflow automation and tools               |

---

## Featured Skills

### Development Skills

| Skill                 | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `frontend-design`     | Production-grade UI components with high design quality |
| `mcp-builder`         | Create MCP servers for agent tool integrations          |
| `code-review`         | Automated PR review with quality/security analysis      |
| `backend-development` | API design, database architecture, microservices        |
| `python-development`  | Modern Python 3.12+ patterns and best practices         |
| `webapp-testing`      | Browser automation with Playwright                      |
| `artifacts-builder`   | Interactive React/Tailwind components                   |

### Document Skills

| Skill  | Description                                    |
| ------ | ---------------------------------------------- |
| `pdf`  | Extract, create, merge, split PDFs             |
| `xlsx` | Excel creation with formulas and data analysis |
| `docx` | Word documents with formatting preservation    |
| `pptx` | PowerPoint presentation creation and editing   |

### Creative Skills

| Skill             | Description                                     |
| ----------------- | ----------------------------------------------- |
| `theme-factory`   | Professional font and color themes (10 presets) |
| `algorithmic-art` | Generative art with p5.js                       |
| `canvas-design`   | Visual art and poster creation                  |
| `image-enhancer`  | Improve image quality and resolution            |

---

## Skill Structure

Each skill follows the Agent Skills specification:

```
theme-factory/
├── SKILL.md                 # Instructions + metadata (required)
├── themes/                  # Reference materials (optional)
│   ├── ocean-depths.md
│   ├── sunset-boulevard.md
│   └── ...
└── assets/                  # Templates and resources (optional)
    └── theme-showcase.pdf
```

---

## Manifest File

Installed skills are tracked in `agent/skills_ref/installed/manifest.json`:

```json
{
  "version": "1.0",
  "installed": [
    {
      "name": "theme-factory",
      "installed_at": "/workspaces/modme-ui-01",
      "properties": {
        "name": "theme-factory",
        "description": "Professional font and color themes",
        "license": "Apache-2.0"
      }
    }
  ]
}
```

---

## CLI Reference

### Commands

```bash
# List skills
python -m agent.skills_ref.skill_library list [--category CATEGORY] [--format json]

# Search skills
python -m agent.skills_ref.skill_library search QUERY

# Install skills
python -m agent.skills_ref.skill_library install SKILL_NAME [--no-validate] [--overwrite]
python -m agent.skills_ref.skill_library install-recommended

# Manage installed
python -m agent.skills_ref.skill_library installed [--format json]
python -m agent.skills_ref.skill_library uninstall SKILL_NAME

# Generate prompt
python -m agent.skills_ref.skill_library generate-prompt [--output FILE]

# Update repository
python -m agent.skills_ref.skill_library update-repo [--force]

# List categories
python -m agent.skills_ref.skill_library categories
```

---

## Configuration

### Custom Cache Directory

```python
from pathlib import Path
from agent.skills_ref.skill_library_manager import SkillLibraryManager

manager = SkillLibraryManager(
    cache_dir=Path.home() / ".cache" / "ai-agent-skills"
)
```

### Custom Install Directory

```python
manager = SkillLibraryManager(
    skills_dir=Path("/custom/path/to/skills")
)
```

---

## Troubleshooting

### Issue: Repository clone fails

```bash
# Force re-clone
python -m agent.skills_ref.skill_library update-repo --force
```

### Issue: Validation fails

```bash
# Skip validation (use with caution)
python -m agent.skills_ref.skill_library install SKILL_NAME --no-validate
```

### Issue: Skill already installed

```bash
# Overwrite
python -m agent.skills_ref.skill_library install SKILL_NAME --overwrite
```

---

## Integration Examples

### Example 1: Install and Generate Prompt

```bash
#!/bin/bash
# install-skills.sh

# Install recommended skills
python -m agent.skills_ref.skill_library install-recommended

# Generate agent prompt
python -m agent.skills_ref.skill_library generate-prompt --output agent_skills.xml

echo "✅ Skills installed and prompt generated"
```

### Example 2: Dynamic Skill Loading

```python
# agent/main.py
from agent.skills_ref.skill_library_manager import SkillLibraryManager

manager = SkillLibraryManager()

# Load specific skill categories
dev_skills = manager.list_available_skills(category="development")
for skill in dev_skills[:5]:  # Top 5 featured
    if skill.featured:
        manager.install_skill(skill.name)

# Generate prompt
prompt = manager.generate_installed_skills_prompt()
```

### Example 3: Skill Search and Install

```python
# Interactive skill installer
from agent.skills_ref.skill_library_manager import SkillLibraryManager

manager = SkillLibraryManager()

query = input("Search for skills: ")
results = manager.search_skills(query)

print(f"\nFound {len(results)} skills:")
for i, skill in enumerate(results):
    print(f"{i+1}. {skill.name} - {skill.description[:60]}")

choice = int(input("\nInstall which skill? "))
skill_name = results[choice-1].name

result = manager.install_skill(skill_name)
print(result["message"])
```

---

## Repository Structure

```
agent/skills_ref/
├── __init__.py
├── cli.py                          # Original skills_ref CLI
├── errors.py
├── models.py
├── parser.py
├── prompt.py
├── validator.py
├── README.md                       # Original README
├── skill_library_manager.py        # 🆕 Skill library manager
├── skill_library_cli.py            # 🆕 Skill library CLI
├── SKILL_LIBRARY_INTEGRATION.md    # 🆕 This file
└── installed/                      # 🆕 Installed skills directory
    ├── manifest.json               # Installation manifest
    ├── theme-factory/              # Example installed skill
    │   ├── SKILL.md
    │   ├── themes/
    │   └── assets/
    └── mcp-builder/
        └── SKILL.md
```

---

## Best Practices

### 1. Validate Before Installing

Always validate skills unless you trust the source:

```bash
python -m agent.skills_ref.skill_library install SKILL_NAME  # Validates by default
```

### 2. Use Recommended Skills

Start with the recommended skills for GenUI:

```bash
python -m agent.skills_ref.skill_library install-recommended
```

### 3. Keep Repository Updated

Regularly update the cached repository:

```bash
# Weekly or monthly
python -m agent.skills_ref.skill_library update-repo
```

### 4. Generate Prompt on Change

Regenerate agent prompt after installing/uninstalling:

```bash
python -m agent.skills_ref.skill_library generate-prompt --output agent_skills.xml
```

---

## Related Documentation

- **Agent Skills Specification**: <https://agentskills.io/specification>
- **Ai-Agent-Skills Repository**: <https://github.com/skillcreatorai/Ai-Agent-Skills>
- **Original skills_ref README**: [README.md](./README.md)
- **Skill Creator Guide**: <https://skillcreator.ai/build>

---

## Future Enhancements

- [ ] Web UI for browsing skills
- [ ] Skill versioning and updates
- [ ] Custom skill creation templates
- [ ] Skill dependency management
- [ ] CI/CD integration for skill testing
- [ ] Skill marketplace integration

---

**Maintained by**: ModMe GenUI Team  
**Last Updated**: January 6, 2026  
**Version**: 1.0.0
