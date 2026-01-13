# Collections Directory

> **Curated collections of agents, prompts, instructions, and skills organized by theme**

This directory follows the [awesome-copilot](https://github.com/github/awesome-copilot) collection pattern for organizing GitHub Copilot customizations.

---

## 📋 What Are Collections?

Collections are YAML manifests that group related agents, prompts, instructions, and skills around specific themes or workflows. They make it easy to:

- Discover related customizations
- Install thematic toolsets
- Organize by MCP server dependencies
- Feature specialized workflows

---

## 📂 Structure

Each collection is a `.collection.yml` file with this structure:

```yaml
id: collection-id
name: Human-Readable Name
description: What this collection provides
tags:
  - tag1
  - tag2
  - tag3

items:
  - path: agents/my-agent.agent.md
    kind: agent
    usage: What this agent does

  - path: instructions/my-instructions.instructions.md
    kind: instruction
    usage: Coding standards for X

  - path: prompts/my-prompt.prompt.md
    kind: prompt
    usage: Generate X from Y

display:
  ordering: manual # or 'alpha'
  show_badge: true
  featured: false
```

---

## 🎯 Available Collections

### GenUI Workbench (Example)

```yaml
id: genui-workbench
name: GenUI Workbench
description: Generative UI patterns, component registry, and agentic interface development
tags: [genui, copilotkit, adk, python]
items:
  - agents/workbench-assistant.agent.md (GenUI development agent)
  - instructions/genui-architecture.instructions.md (Architecture patterns)
  - prompts/create-genui-component.prompt.md (Component generator)
```

---

## 🔧 Creating Collections

### Programmatically (Recommended)

```python
from tools.collection_manager import create_collection

result = create_collection(
    tool_context,
    collection_id="my-collection",
    name="My Collection",
    description="Description of what this provides",
    items=[
        {"path": "agents/agent.agent.md", "kind": "agent", "usage": "..."},
        {"path": "prompts/prompt.prompt.md", "kind": "prompt", "usage": "..."}
    ],
    tags=["tag1", "tag2"],
    output_path="collections/my-collection.collection.yml"
)
```

See [scripts/examples/generate_collection_example.py](../scripts/examples/generate_collection_example.py) for complete examples.

### Manually

1. Create `my-collection.collection.yml` in this directory
2. Follow the schema defined in [.schemas/collection.schema.json](../.schemas/collection.schema.json)
3. Validate:

   ```bash
   npm run validate:collections
   ```

---

## ✅ Validation Rules

### Collection Requirements

- `id`: lowercase-hyphenated, max 50 chars
- `name`: display name, max 100 chars
- `description`: purpose, max 500 chars
- `tags`: max 10 tags, each lowercase-hyphenated, max 30 chars
- `items`: min 1, max 50 items

### Item Requirements

- `path`: must match pattern `(prompts|instructions|agents|skills)/*.*.md`
- `kind`: must be `prompt`, `instruction`, `agent`, or `skill`
- `usage`: optional description string

---

## 📚 Documentation

- **Complete Guide**: [docs/AGENT_COLLECTION_PROGRAMMING_GUIDE.md](../docs/AGENT_COLLECTION_PROGRAMMING_GUIDE.md)
- **Implementation Summary**: [AGENT_COLLECTION_IMPLEMENTATION_SUMMARY.md](../AGENT_COLLECTION_IMPLEMENTATION_SUMMARY.md)
- **Python Tool**: [agent/tools/collection_manager.py](../agent/tools/collection_manager.py)

---

## 🚀 Quick Start

### Generate Your First Collection

```bash
# Run example script
cd /workspaces/modme-ui-01
python scripts/examples/generate_collection_example.py

# This creates:
# - collections/genui-workbench.collection.yml (manual creation)
# - collections/genui-auto.collection.yml (auto-discovered)
# - collections/github-agents.collection.yml (MCP server-based)
```

### Create GenUI Collection from Real Files

```python
from tools.collection_manager import scan_repository_for_collection_items, create_collection

# Scan repository
items = scan_repository_for_collection_items(
    tool_context,
    repo_root="/workspaces/modme-ui-01",
    tag_filter=["genui", "copilotkit"],
    kind_filter=["agent", "instruction"]
)

# Create collection
create_collection(
    tool_context,
    collection_id="genui-real",
    name="GenUI Real Collection",
    description="Actual GenUI files in repository",
    items=items['items'],
    tags=["genui", "copilotkit"],
    output_path="collections/genui-real.collection.yml"
)
```

---

## 🔗 Related Resources

- **awesome-copilot Collections**: <https://github.com/github/awesome-copilot/tree/main/collections>
- **Collection Schema**: <https://github.com/github/awesome-copilot/blob/main/.schemas/collection.schema.json>
- **MCP Protocol**: <https://modelcontextprotocol.io/>

---

**Last Updated**: January 7, 2026
