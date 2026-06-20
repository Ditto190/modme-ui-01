# GitLens AI Integration - Quick Reference

> **TL;DR**: Generate VSCode/GitLens AI custom instructions from agent skills

---

## ⚡ Quick Commands

```bash
# Generate all formats
cd agent/skills_ref
python examples/generate_gitlens_instructions.py

# Outputs:
# - examples/output/anthropic_skills.xml
# - examples/output/vscode_settings.json
# - examples/output/copilot_instructions.md
# - examples/output/gitlens_custom_instructions.md
```

---

## 📋 One-Liners

### Generate VSCode Settings

```python
from agent.skills_ref.prompt import to_prompt
from pathlib import Path

skills = [Path("agent-generator/src/skills/weather")]
print(to_prompt(skills, format="vscode_json"))
```

### Generate GitLens Instructions

```python
context = {"architecture": "dual-runtime", "stack": ["Python", "React"]}
print(to_prompt(skills, format="gitlens_instructions", codebase_context=context))
```

### Generate Anthropic XML

```python
print(to_prompt(skills, format="xml"))
```

---

## 🎯 Use Cases

| Format                 | File Location                       | Use For                  |
| ---------------------- | ----------------------------------- | ------------------------ |
| `vscode_json`          | `.vscode/settings.json`             | GitLens AI config        |
| `gitlens_instructions` | `.github/gitlens-instructions.md`   | Comprehensive guidelines |
| `markdown`             | `.github/copilot-instructions.md`   | GitHub Copilot           |
| `xml`                  | `agent_prompt.md` or system prompts | Claude/Anthropic models  |

---

## 🔧 Integration Steps

### 1. Generate

```bash
python agent/skills_ref/examples/generate_gitlens_instructions.py
```

### 2. Copy to VSCode

```bash
cp agent/skills_ref/examples/output/vscode_settings.json .vscode/settings.json
```

### 3. Reload VSCode

`Ctrl+Shift+P` → `Developer: Reload Window`

### 4. Test GitLens AI

1. Open GitLens sidebar
2. Try "Generate Commit Message" on staged changes
3. Verify custom instructions are applied

---

## 📊 Output Examples

### VSCode Settings (JSON)

```json
{
  "gitlens.ai.generateCommitMessage.customInstructions": "Follow conventional commits...",
  "gitlens.ai.enabled": true
}
```

### GitLens Instructions (Markdown)

```markdown
# GitLens AI Custom Instructions

## Commit Message Guidelines

- Use conventional commit format: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore
```

### Anthropic XML

```xml
<available_skills>
<skill>
<name>weather</name>
<description>Get weather data</description>
</skill>
</available_skills>
```

---

## 🐛 Troubleshooting

| Issue                          | Solution                                               |
| ------------------------------ | ------------------------------------------------------ |
| No skills found                | Check `agent-generator/src/skills/*/SKILL.md` exists   |
| Invalid JSON output            | Ensure `codebase_context` has JSON-serializable values |
| GitLens not using instructions | Reload VSCode window (`Ctrl+Shift+P` → Reload)         |

---

## 📚 Full Documentation

- [GITLENS_INTEGRATION.md](GITLENS_INTEGRATION.md) - Complete guide
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details
- [examples/](examples/) - Working code samples

---

**Last Updated**: January 4, 2026
