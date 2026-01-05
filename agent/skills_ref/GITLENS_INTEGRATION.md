# GitLens AI Integration Guide

> **Enhanced `prompt.py`** - Generate VSCode/GitLens-compatible custom instructions from agent skills

**Created**: January 4, 2026  
**For**: ModMe GenUI Workbench & GitLens AI Features

---

## 🎯 Overview

The enhanced `agent/skills_ref/prompt.py` module now generates **GitLens-compatible custom instructions** in multiple formats:

| Format                     | Use Case                                  | Output Type              |
| -------------------------- | ----------------------------------------- | ------------------------ |
| **`xml`**                  | Anthropic/Claude models                   | `<available_skills>` XML |
| **`vscode_json`**          | VSCode settings.json for GitLens AI       | JSON config              |
| **`markdown`**             | GitHub Copilot instructions               | Markdown                 |
| **`gitlens_instructions`** | Comprehensive GitLens custom instructions | Markdown                 |

---

## 🚀 Quick Start

### 1. Generate GitLens Custom Instructions

```bash
cd agent/skills_ref
python examples/generate_gitlens_instructions.py
```

**Output**:

- `output/anthropic_skills.xml` - For Claude models
- `output/vscode_settings.json` - For GitLens AI
- `output/copilot_instructions.md` - For GitHub Copilot
- `output/gitlens_custom_instructions.md` - Comprehensive GitLens instructions

---

## 📋 Usage Examples

### Example 1: Generate VSCode Settings

```python
from pathlib import Path
from agent.skills_ref.prompt import to_prompt

# Define skills directories
skill_dirs = [
    Path("agent-generator/src/skills/pdf"),
    Path("agent-generator/src/skills/weather"),
]

# Define codebase context
context = {
    "architecture": "dual-runtime",
    "stack": ["Python 3.12+", "React 19", "Next.js 16"],
    "patterns": [
        "One-way state flow (Python → React)",
        "Zod validation with safeParse()",
    ],
}

# Generate VSCode settings
vscode_config = to_prompt(
    skill_dirs,
    format="vscode_json",
    codebase_context=context,
)

# Save to .vscode/settings.json
Path(".vscode/settings.json").write_text(vscode_config)
```

**Output** (`.vscode/settings.json`):

```json
{
  "gitlens.ai.generateCommitMessage.customInstructions": "Follow conventional commits format (type(scope): subject). For dual-runtime changes, specify 'agent' or 'ui' scope. Example: 'feat(agent): add new tool for X'",
  "gitlens.ai.generateCommits.customInstructions": "Organize changes into logical commits that isolate features, fixes, and refactors. Separate agent-side (Python) from UI-side (React/TypeScript) changes.",
  "gitlens.ai.explainChanges.customInstructions": "Explain changes in terms of business value and architectural impact. Reference these project patterns: One-way state flow (Python → React), Zod validation with safeParse().",
  "gitlens.ai.experimental.composer.enabled": true,
  "gitlens.ai.enabled": true,
  "_comment": "Available skills for reference",
  "_available_skills": [
    {
      "name": "pdf-reader",
      "description": "Read and extract text from PDF files",
      "location": "agent-generator/src/skills/pdf/SKILL.md"
    },
    {
      "name": "weather",
      "description": "Get current weather data",
      "location": "agent-generator/src/skills/weather/SKILL.md"
    }
  ]
}
```

---

### Example 2: Generate GitLens Custom Instructions

```python
from agent.skills_ref.prompt import to_prompt

# Generate comprehensive GitLens instructions
instructions = to_prompt(
    skill_dirs,
    format="gitlens_instructions",
    codebase_context=context,
)

# Save to .github/gitlens-instructions.md
Path(".github/gitlens-instructions.md").write_text(instructions)
```

**Output** (`.github/gitlens-instructions.md`):

```markdown
# GitLens AI Custom Instructions

## Codebase Architecture

This codebase uses a **dual-runtime** architecture.

**Key Patterns**:

- One-way state flow (Python → React)
- Zod validation with safeParse()

## Commit Message Guidelines

When generating commit messages:

- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`
- Keep first line under 72 characters
- Focus on **why** over **what** in the body
- Reference issues/PRs when applicable

## Code Explanation Guidelines

When explaining changes:

- Start with high-level intent
- Explain architectural decisions
- Highlight breaking changes or migrations
- Connect to project patterns and conventions

## Available Skills

### pdf-reader

Read and extract text from PDF files
**Skill Definition**: `agent-generator/src/skills/pdf/SKILL.md`

### weather

Get current weather data
**Skill Definition**: `agent-generator/src/skills/weather/SKILL.md`

## Constraints

- Never modify files without explicit confirmation
- Preserve existing code style and formatting
- Follow project-specific linting and type checking rules
- Validate against test suites before suggesting changes
```

---

### Example 3: Generate Anthropic XML

```python
# Generate XML for Claude models
xml = to_prompt(skill_dirs, format="xml")

# Use in agent system prompt
system_prompt = f"""
You are a helpful coding assistant with access to specialized skills.

{xml}

When the user asks for a task, check if a skill can help.
"""
```

**Output**:

```xml
<available_skills>
<skill>
<name>pdf-reader</name>
<description>Read and extract text from PDF files</description>
<location>agent-generator/src/skills/pdf/SKILL.md</location>
</skill>
<skill>
<name>weather</name>
<description>Get current weather data</description>
<location>agent-generator/src/skills/weather/SKILL.md</location>
</skill>
</available_skills>
```

---

## 🔧 Integration with GitLens

### Step 1: Generate Settings

```bash
python agent/skills_ref/examples/generate_gitlens_instructions.py
```

### Step 2: Merge into VSCode Settings

**Option A: Global Settings** (User Settings)

1. Open VSCode Command Palette (`Ctrl+Shift+P`)
2. Run `Preferences: Open User Settings (JSON)`
3. Merge content from `agent/skills_ref/examples/output/vscode_settings.json`

**Option B: Workspace Settings** (`.vscode/settings.json`)

```bash
# Copy to workspace settings
cp agent/skills_ref/examples/output/vscode_settings.json .vscode/settings.json
```

### Step 3: Verify GitLens AI

1. Open GitLens sidebar
2. Navigate to **AI Settings**
3. Confirm custom instructions are loaded

---

## 📊 Codebase Context Schema

The `codebase_context` parameter accepts the following structure:

```python
codebase_context = {
    # Architecture type (affects commit message instructions)
    "architecture": "dual-runtime" | "monolith" | "microservices",

    # Tech stack (listed in generated markdown)
    "stack": [
        "Python 3.12+",
        "React 19",
        "Next.js 16",
    ],

    # Key patterns (referenced in explanations)
    "patterns": [
        "One-way state flow",
        "Zod validation with safeParse()",
        "ToolContext pattern for agent tools",
    ],
}
```

---

## 🎨 Customization

### Customize Commit Instructions

Edit `_generate_commit_instructions()` in `prompt.py`:

```python
def _generate_commit_instructions(context: dict) -> str:
    """Generate custom instructions for commit message generation."""
    base = "Follow conventional commits format (type(scope): subject)."

    # Add project-specific rules
    if context.get("use_jira"):
        return f"{base} Include JIRA ticket number: 'feat(scope): [PROJ-123] description'"

    return base
```

### Customize Explain Instructions

Edit `_generate_explain_instructions()` in `prompt.py`:

```python
def _generate_explain_instructions(context: dict) -> str:
    """Generate custom instructions for code explanations."""
    base = "Explain changes in terms of business value and architectural impact."

    # Add domain-specific context
    if context.get("domain") == "healthcare":
        return f"{base} Reference HIPAA compliance and data privacy concerns."

    return base
```

---

## 🧪 Testing

### Test Script

```python
# agent/skills_ref/test_prompt_formats.py
from pathlib import Path
from prompt import to_prompt

def test_all_formats():
    """Test all output formats."""
    skill_dirs = [Path("agent-generator/src/skills/weather")]
    context = {"architecture": "dual-runtime"}

    # Test each format
    formats = ["xml", "vscode_json", "markdown", "gitlens_instructions"]
    for fmt in formats:
        output = to_prompt(skill_dirs, format=fmt, codebase_context=context)
        assert len(output) > 0, f"Format {fmt} produced empty output"
        print(f"✅ {fmt}: {len(output)} chars")

if __name__ == "__main__":
    test_all_formats()
```

### Run Tests

```bash
cd agent/skills_ref
python test_prompt_formats.py
```

---

## 🔗 Related Resources

### GitLens AI Features

- [GitLens AI Commit Messages](https://github.com/gitkraken/vscode-gitlens/blob/main/src/plus/ai/actions/generateMessage.ts) - Source code reference
- [GitLens AI Composer](https://github.com/gitkraken/vscode-gitlens/blob/main/src/webviews/plus/composer/composerWebview.ts) - Recompose commits with AI
- [GitLens Telemetry Events](https://github.com/gitkraken/vscode-gitlens/blob/main/docs/telemetry-events.md) - AI event tracking

### VSCode Extension API

- [VSCode AI Integration Docs](https://context7.com/microsoft/vscode/llms.txt) - Extension API overview
- [Language Model Provider API](https://context7.com/microsoft/vscode/llms.txt) - Custom model registration

### Project Documentation

- [.github/copilot-instructions.md](../../.github/copilot-instructions.md) - Current AI agent instructions
- [docs/REFACTORING_PATTERNS.md](../../docs/REFACTORING_PATTERNS.md) - Dual-runtime refactoring guides
- [CODEBASE_INDEX.md](../../CODEBASE_INDEX.md) - Complete file catalog

---

## 🐛 Troubleshooting

### Issue: Empty skills list

**Cause**: Skills directory not found or no `SKILL.md` files

**Solution**:

```bash
# Verify skills exist
ls agent-generator/src/skills/*/SKILL.md

# Generate test skills
python agent/tools/generate_schemas.py all
```

### Issue: Invalid JSON in VSCode settings

**Cause**: Malformed codebase_context dict

**Solution**:

```python
# Ensure all values are JSON-serializable
context = {
    "architecture": "dual-runtime",  # String, not object
    "stack": ["Python", "React"],    # List of strings
    "patterns": ["Pattern 1"],       # List of strings
}
```

### Issue: GitLens not using custom instructions

**Cause**: Settings not applied or GitLens needs restart

**Solution**:

1. Verify settings in VSCode: `Ctrl+Shift+P` → `Preferences: Open User Settings (JSON)`
2. Reload VSCode window: `Ctrl+Shift+P` → `Developer: Reload Window`
3. Check GitLens output channel: `Ctrl+Shift+U` → Select "GitLens"

---

## 📈 Changelog

### January 4, 2026

- ✅ Initial release with 4 output formats
- ✅ GitLens AI integration (commit messages, recompose, explain)
- ✅ VSCode settings.json generation
- ✅ Codebase context parameter support
- ✅ Example script (`generate_gitlens_instructions.py`)

---

## 📞 Support

For questions about this integration:

1. Review [GitLens AI patterns](https://github.com/gitkraken/vscode-gitlens/tree/main/src/plus/ai)
2. Check [examples/](examples/) directory for working code
3. File issue with `gitlens-integration` label

---

**Last Updated**: January 4, 2026  
**Maintainer**: ModMe GenUI Team  
**GitLens Version**: Compatible with VSCode GitLens v15.0.0+
