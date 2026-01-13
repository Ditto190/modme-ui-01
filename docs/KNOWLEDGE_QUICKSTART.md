# Knowledge Management Quickstart

Get started with the knowledge management system in **5 minutes**.

## Prerequisites

- Node.js 22.9.0+ installed
- Dependencies installed: `npm install`
- ripgrep installed (for search): `brew install ripgrep` or `choco install ripgrep`

## Quick Start

### 1. Validate Existing Toolsets

```bash
npm run docs:sync -- --validate-only
```

✅ Expected output:

```
✓ Schema loaded successfully
✓ Toolsets validated: 2 toolsets (ui_elements, theme)
✓ All toolsets are valid
```

### 2. Generate Documentation

```bash
npm run docs:all
```

This will:

1. Validate JSON against schema
2. Generate markdown files in `docs/toolsets/`
3. Create Mermaid diagram: `docs/toolsets/toolset-relationships.svg`

### 3. Search the Codebase

```bash
npm run search:toolset "upsert_ui_element"
```

Output:

```
🔍 Searching for: upsert_ui_element

📂 agent/ (Python):
agent/main.py:25: def upsert_ui_element(tool_context: ToolContext, id: str, type: str, props: Dict[str, Any]):

📂 src/ (TypeScript):
src/app/page.tsx:45: // Agent calls upsert_ui_element tool

🎯 Total matches: 2
```

### 4. View Toolset Diagram

```bash
open docs/toolsets/toolset-relationships.svg
# Or on Windows:
start docs/toolsets/toolset-relationships.svg
```

---

## Common Tasks

### Add a New Toolset

**Step 1**: Edit `agent/toolsets.json`

```json
{
  "toolsets": [
    {
      "id": "data_analysis",
      "name": "Data Analysis",
      "description": "Tools for analyzing data",
      "tools": ["analyze_data", "generate_chart"],
      "metadata": {
        "status": "active",
        "category": "data_analysis",
        "version": "1.0.0",
        "authors": ["your-name"],
        "last_modified": "2025-01-15T10:00:00Z",
        "requires": [],
        "related_toolsets": []
      }
    }
  ]
}
```

**Step 2**: Generate documentation

```bash
npm run docs:json-to-md
```

**Step 3**: View generated file

```bash
cat docs/toolsets/data_analysis.md
```

**Step 4**: Commit changes

```bash
git add agent/toolsets.json docs/toolsets/data_analysis.md
git commit -m "feat: add data_analysis toolset"
```

---

### Edit Markdown Documentation

**Step 1**: Edit markdown file

```bash
code docs/toolsets/ui_elements.md
```

Make changes:

```markdown
# UI Elements

**Updated description**: Enhanced tools for dynamic UI manipulation...
```

**Step 2**: Sync to JSON

```bash
npm run docs:md-to-json
```

**Step 3**: Validate

```bash
npm run docs:sync -- --validate-only
```

**Step 4**: Commit changes

```bash
git add agent/toolsets.json docs/toolsets/ui_elements.md
git commit -m "docs: update ui_elements description"
```

---

### Deprecate a Toolset

**Step 1**: Edit `agent/toolsets.json`

```json
{
  "id": "old_toolset",
  "name": "Old Toolset",
  "description": "Legacy tools",
  "tools": ["old_tool"],
  "metadata": {
    "status": "deprecated",
    "category": "generative_ui",
    "deprecated": {
      "deprecated_since": "2025-01-15T00:00:00Z",
      "removal_date": "2025-07-15T00:00:00Z",
      "superseded_by": "new_toolset",
      "reason": "Replaced by improved API",
      "migration_guide": "docs/migration/old_to_new.md"
    }
  }
}
```

**Step 2**: Create migration guide

````bash
cat > docs/migration/old_to_new.md << 'EOF'
# Migrating from old_toolset to new_toolset

## Changes
- `old_tool()` → `new_tool()`
- Added parameter: `options`

## Example
**Before**:
```python
old_tool(id="test")
````

**After**:

```python
new_tool(id="test", options={"enabled": true})
```

EOF

```
````

**Step 3**: Regenerate docs

```bash
npm run docs:all
````

The diagram will now show the toolset with red dashed border and deprecation arrow.

---

### Search for Tool Usage

**Example 1**: Find all uses of `upsert_ui_element`

```bash
npm run search:toolset "upsert_ui_element"
```

**Example 2**: Find toolsets in category

```bash
npm run search:toolset '"category": "generative_ui"'
```

**Example 3**: Case-sensitive search

```bash
./scripts/knowledge-management/search-toolsets.sh "UIElement"
```

---

## VS Code Integration

### Run Tasks

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Run Task"
3. Select one of:
   - **Search Toolsets** - Interactive search
   - **Validate Toolsets** - Run validation
   - **Generate Documentation** - Full sync
   - **View Toolset Diagram** - Open SVG

### Search Task Example

1. Run "Search Toolsets" task
2. Enter pattern: `theme`
3. View results in terminal panel

---

## CI/CD Workflows

### Automatic Sync on Push

When you push changes to `agent/toolsets.json`, GitHub Actions will:

1. Validate JSON against schema
2. Generate markdown documentation
3. Create toolset diagram
4. Auto-commit to your branch

**Trigger**: Push to `main` or `develop`

### Incremental Docs on PRs

When you create a PR modifying agent code:

1. GitHub Actions detects changed toolsets using ripgrep
2. Regenerates only affected documentation
3. Uploads artifacts for review
4. Posts comment on PR with detected changes

**Trigger**: Pull request to `main` or `develop`

---

## Troubleshooting

### Validation Errors

**Error**: `data/toolsets/0 should have required property 'metadata'`

**Fix**: Add missing metadata field to toolset:

```json
{
  "id": "my_toolset",
  "metadata": {
    "status": "active",
    "category": "generative_ui"
  }
}
```

### Sync Conflicts

**Error**: `Multiple toolsets found for ID: ui_elements`

**Fix**: Ensure toolset IDs are unique in `agent/toolsets.json`.

### Missing Dependencies

**Error**: `ripgrep not found`

**Fix**: Install ripgrep:

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt-get install ripgrep

# Windows
choco install ripgrep
```

### Template Errors

**Error**: `Template not found: templates/toolset-single.md.hbs`

**Fix**: Ensure templates directory exists:

```bash
ls templates/
# Should show: toolset-single.md.hbs, toolset-full.md.hbs
```

---

## Next Steps

- Read [KNOWLEDGE_MANAGEMENT.md](KNOWLEDGE_MANAGEMENT.md) for architecture details
- Explore [toolset-schema.json](../agent/toolset-schema.json) for schema reference
- Check [TOOLSET_MANAGEMENT.md](TOOLSET_MANAGEMENT.md) for runtime loading

---

## Quick Reference

### NPM Scripts

| Command                            | Description                     |
| ---------------------------------- | ------------------------------- |
| `npm run docs:sync`                | Validate + sync JSON → markdown |
| `npm run docs:md-to-json`          | Convert markdown → JSON         |
| `npm run docs:json-to-md`          | Convert JSON → markdown         |
| `npm run docs:diagram`             | Generate Mermaid .mmd file      |
| `npm run docs:diagram:svg`         | Generate SVG diagram            |
| `npm run docs:all`                 | Full sync + diagram             |
| `npm run search:toolset "pattern"` | Search with ripgrep             |

### File Locations

| File                            | Purpose                        |
| ------------------------------- | ------------------------------ |
| `agent/toolsets.json`           | Source of truth (12KB)         |
| `agent/toolset-schema.json`     | JSON Schema for validation     |
| `docs/toolsets/*.md`            | Generated documentation (45KB) |
| `docs/toolsets/*.svg`           | Toolset relationship diagrams  |
| `templates/*.hbs`               | Handlebars templates           |
| `scripts/knowledge-management/` | Sync/search/diagram scripts    |

### Toolset Categories

- `generative_ui` - UI generation tools
- `data_analysis` - Data processing tools
- `frontend` - Frontend utilities
- `backend` - Backend utilities
- `system` - System-level tools
- `integration` - Third-party integrations
- `testing` - Testing utilities
- `knowledge_management` - Documentation tools

---

**Last Updated**: 2025-01-15  
**Version**: 1.0.0
