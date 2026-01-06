# Skill Library - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Install Recommended Skills

```bash
cd /workspaces/modme-ui-01
python -m agent.skills_ref.skill_library install-recommended
```

This installs 5 curated skills:

- `theme-factory` - Professional theming
- `mcp-builder` - MCP server creation
- `code-review` - PR analysis
- `frontend-design` - UI components
- `artifacts-builder` - React components

### Step 2: List Installed Skills

```bash
python -m agent.skills_ref.skill_library installed
```

### Step 3: Generate Agent Prompt

```bash
python -m agent.skills_ref.skill_library generate-prompt --output agent/skills_prompt.xml
```

### Step 4: Integrate with Agent

Add to `agent/main.py`:

```python
from agent.skills_ref import generate_agent_prompt

def before_model_modifier(callback_context, llm_request):
    skills_prompt = generate_agent_prompt()

    # Add to system instruction
    enhanced_instruction = f"""
{skills_prompt}

{original_instruction}
"""

    llm_request.config.system_instruction = enhanced_instruction
```

Done! Your agent now has access to all installed skills.

---

## 📚 Common Commands

```bash
# Browse skills
python -m agent.skills_ref.skill_library list
python -m agent.skills_ref.skill_library list --category development

# Search
python -m agent.skills_ref.skill_library search "theme"

# Install
python -m agent.skills_ref.skill_library install theme-factory

# Uninstall
python -m agent.skills_ref.skill_library uninstall theme-factory

# Update repository
python -m agent.skills_ref.skill_library update-repo
```

---

## 🐍 Python API

```python
from agent.skills_ref import SkillLibraryManager

manager = SkillLibraryManager()

# List skills
skills = manager.list_available_skills(category="development")

# Search
results = manager.search_skills("mcp")

# Install
result = manager.install_skill("theme-factory")

# Generate prompt
prompt = manager.generate_installed_skills_prompt()
```

---

## 📖 Full Documentation

- **Complete Guide**: [SKILL_LIBRARY_INTEGRATION.md](./SKILL_LIBRARY_INTEGRATION.md)
- **Implementation Details**: [SKILL_LIBRARY_IMPLEMENTATION_SUMMARY.md](./SKILL_LIBRARY_IMPLEMENTATION_SUMMARY.md)
- **Test Suite**: `scripts/test-skill-library.sh`

---

**Ready to use!** 🎉
