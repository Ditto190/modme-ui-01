# 🎯 Toolset Management System

> **GitHub MCP-style toolset lifecycle automation for ModMe GenUI**

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=github-actions)](/.github/workflows/)
[![Documentation](https://img.shields.io/badge/docs-comprehensive-blue)](/docs/TOOLSET_MANAGEMENT.md)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue?logo=python)](https://www.python.org)
[![Node.js 22+](https://img.shields.io/badge/node-22+-green?logo=node.js)](https://nodejs.org)

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install ajv ajv-formats --save-dev

# 2. Validate toolsets
npm run validate:toolsets

# 3. Detect changes
npm run detect:changes

# ✅ You're ready!
```

---

## 📦 What's Included

### 📋 **Documentation** (3 files, 1,041 lines)

- **[TOOLSET_MANAGEMENT.md](/docs/TOOLSET_MANAGEMENT.md)** - Complete reference guide
- **[TOOLSET_QUICKSTART.md](/docs/TOOLSET_QUICKSTART.md)** - Developer quick start
- **[IMPLEMENTATION_SUMMARY.md](/IMPLEMENTATION_SUMMARY.md)** - This implementation

### 🤖 **GitHub Actions** (4 workflows, 1,123 lines)

- **[toolset-update.yml](/.github/workflows/toolset-update.yml)** - Auto-detect & register
- **[toolset-deprecate.yml](/.github/workflows/toolset-deprecate.yml)** - Safe deprecation
- **[toolset-validate.yml](/.github/workflows/toolset-validate.yml)** - 10-job validation
- **[toolset-docs.yml](/.github/workflows/toolset-docs.yml)** - Doc generation

### ⚙️ **Configuration** (3 files)

- **[toolsets.json](/agent/toolsets.json)** - Toolset registry
- **[toolset_aliases.json](/agent/toolset_aliases.json)** - Deprecation aliases
- **[toolset-schema.json](/agent/toolset-schema.json)** - JSON Schema

### 🔧 **Scripts** (4 core + many helpers)

- **[detect-toolset-changes.js](/scripts/toolset-management/detect-toolset-changes.js)**
- **[validate-toolsets.js](/scripts/toolset-management/validate-toolsets.js)**
- **[create-alias.js](/scripts/toolset-management/create-alias.js)**
- **[generate-migration-guide.js](/scripts/toolset-management/generate-migration-guide.js)**

### 🐍 **Python Support** (2 files, 523 lines)

- **[toolset_manager.py](/agent/toolset_manager.py)** - Runtime manager
- **[INTEGRATION_EXAMPLE.py](/agent/INTEGRATION_EXAMPLE.py)** - Usage examples

---

## 🎯 Features

| Feature               | Description                       | Status |
| --------------------- | --------------------------------- | ------ |
| 🔍 **Auto-Detection** | Scans code for new toolsets       | ✅     |
| ✅ **Validation**     | 10-job validation suite           | ✅     |
| 🔄 **Deprecation**    | Backward-compatible aliases       | ✅     |
| 📚 **Documentation**  | Auto-generated migration guides   | ✅     |
| 🧪 **Testing**        | Schema, naming, integration tests | ✅     |
| 🔐 **Security**       | npm audit, secret scanning        | ✅     |
| 📊 **Monitoring**     | GitHub issue tracking             | ✅     |
| 🚀 **CI/CD**          | Fully automated workflows         | ✅     |

---

## 📖 Usage Examples

### Adding a New Toolset

```python
# 1. Define tool in agent/main.py
def my_new_tool(tool_context: ToolContext, param: str):
    """Tool description"""
    # Implementation
    pass

# 2. Push to main
git add agent/main.py
git commit -m "feat: add my_new_tool"
git push origin main

# 3. Workflow auto-detects and registers! ✨
```

### Deprecating a Toolset

```bash
# Trigger deprecation workflow
gh workflow run toolset-deprecate.yml \
  -f old_toolset=old_feature \
  -f new_toolset=new_feature \
  -f reason="Better API design" \
  -f create_issue=true

# System automatically:
# ✓ Creates alias mapping
# ✓ Generates migration guide
# ✓ Tests backward compatibility
# ✓ Creates tracking issue
```

### Using in Python Agent

```python
from toolset_manager import initialize_toolsets, get_toolset

# Initialize on startup
initialize_toolsets()

# Get toolset with deprecation handling
toolset = get_toolset("ui_elements")
print(f"Tools: {toolset['tools']}")

# Old names still work (with warning)
toolset = get_toolset("old_ui_elements")  # Resolves to "ui_elements"
# ⚠️  Deprecated warning logged to stderr
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│             Toolset Lifecycle                   │
└─────────────────────────────────────────────────┘

  Developer adds tool
         │
         ▼
  ┌──────────────┐
  │  Git Push    │──────┐
  └──────────────┘      │
                        ▼
              ┌────────────────────┐
              │ toolset-update.yml │
              │                    │
              │ 1. Detect changes  │
              │ 2. Validate        │
              │ 3. Update registry │
              │ 4. Generate docs   │
              └─────────┬──────────┘
                        │
                        ▼
              ┌────────────────────┐
              │  toolsets.json     │◄──── Python Agent
              │  (Registry)        │      loads at runtime
              └────────────────────┘

  Need to deprecate? ──┐
                       ▼
              ┌────────────────────┐
              │toolset-deprecate.yml│
              │                     │
              │ 1. Create alias     │
              │ 2. Migration guide  │
              │ 3. Test resolution  │
              │ 4. Track issue      │
              └─────────┬───────────┘
                        │
                        ▼
              ┌────────────────────┐
              │toolset_aliases.json│◄──── Resolves at runtime
              │  (Deprecations)    │      with warnings
              └────────────────────┘
```

---

## 🧪 Validation Pipeline

**10 comprehensive validation jobs run on every PR:**

1. ✅ **Schema Validation** - JSON schema compliance
2. ✅ **Naming Conventions** - lowercase_with_underscores
3. ✅ **Dependency Analysis** - Circular dependency detection
4. ✅ **Alias Resolution** - Test deprecated name resolution
5. ✅ **Integration Tests** - Full system testing
6. ✅ **Python Tests** - Agent toolset loading
7. ✅ **Documentation** - Link checking, completeness
8. ✅ **Backward Compatibility** - Breaking change detection
9. ✅ **Security Scanning** - npm audit, TruffleHog
10. ✅ **Summary Report** - Aggregated results

---

## 📚 Documentation Map

```
docs/
├── TOOLSET_MANAGEMENT.md          # 📖 Complete reference (409 lines)
│   ├── Architecture & concepts
│   ├── Workflow descriptions
│   ├── Manual procedures
│   ├── Troubleshooting
│   └── Configuration reference
│
├── TOOLSET_QUICKSTART.md          # 🚀 Quick start (487 lines)
│   ├── Installation steps
│   ├── Usage examples
│   ├── Testing guide
│   └── Best practices
│
└── migration/                     # 📝 Auto-generated guides
    └── [old]_to_[new].md          # Created by deprecation workflow
```

---

## ⚙️ Configuration

### Toolset Definition

```json
{
  "id": "ui_elements",
  "name": "UI Elements",
  "description": "Manage canvas UI components",
  "default": true,
  "icon": "paintbrush",
  "tools": ["upsert_ui_element", "remove_ui_element", "clear_canvas"],
  "metadata": {
    "category": "generative_ui",
    "requires": [],
    "deprecated": false
  }
}
```

### Deprecation Alias

```json
{
  "aliases": {
    "old_ui": "ui_elements"
  },
  "deprecation_metadata": {
    "old_ui": {
      "deprecated_at": "2025-01-01T00:00:00Z",
      "removal_date": "2026-07-01",
      "reason": "Consolidated UI toolsets",
      "replacement": "ui_elements",
      "migration_guide": "docs/migration/old_ui_to_ui_elements.md"
    }
  }
}
```

---

## 🔧 NPM Scripts

```bash
# Validation
npm run validate:toolsets     # Full validation suite
npm run validate:naming       # Check naming conventions

# Testing
npm run test:aliases          # Test alias resolution

# Detection
npm run detect:changes        # Find new/modified toolsets
```

---

## 🎓 Key Concepts

### 📦 **Toolset**

Logical grouping of related tools (functions)

### 🔄 **Alias**

Mapping from deprecated name to canonical name

### ⏱️ **Grace Period**

180 days (6 months) for users to migrate

### 📝 **Migration Guide**

Step-by-step instructions for transitioning

---

## ⚠️ Important Notes

1. **Dependencies Required:**

   ```bash
   npm install ajv ajv-formats --save-dev
   ```

2. **GitHub Actions:**
   - Requires repository write permissions
   - Enable Actions in repository settings

3. **Python Integration:**
   - Import `toolset_manager` in `agent/main.py`
   - Call `initialize_toolsets()` on startup

4. **Backward Compatibility:**
   - Aliases work for 6 months
   - Warnings logged to stderr
   - No breaking changes during grace period

---

## 📊 System Status

| Component     | Files   | Lines      | Status                  |
| ------------- | ------- | ---------- | ----------------------- |
| Documentation | 3       | 1,041      | ✅ Complete             |
| Workflows     | 4       | 1,123      | ✅ Complete             |
| Scripts       | 4+      | 841+       | ✅ Core done            |
| Config        | 3       | 150        | ✅ Complete             |
| Python        | 2       | 523        | ✅ Complete             |
| **Total**     | **16+** | **3,678+** | **✅ Production-Ready** |

---

## 🎯 Next Steps

1. **Install dependencies:** `npm install ajv ajv-formats --save-dev`
2. **Test validation:** `npm run validate:toolsets`
3. **Review workflows:** Check `.github/workflows/`
4. **Integrate agent:** Use `INTEGRATION_EXAMPLE.py` as guide
5. **Test deprecation:** Try workflow with test toolset

---

## 🤝 Contributing

See [TOOLSET_MANAGEMENT.md](/docs/TOOLSET_MANAGEMENT.md) for:

- Naming conventions
- Deprecation procedures
- Testing requirements
- Documentation standards

---

## 📖 Reference

- **GitHub MCP Server:** <https://github.com/github/github-mcp-server>
- **Tool Renaming Guide:** [github-mcp-server/docs/tool-renaming.md](https://github.com/github/github-mcp-server/blob/main/docs/tool-renaming.md)
- **JSON Schema:** <https://json-schema.org/>

---

## 📞 Support

- 📖 **Docs:** [TOOLSET_MANAGEMENT.md](/docs/TOOLSET_MANAGEMENT.md)
- 🚀 **Quick Start:** [TOOLSET_QUICKSTART.md](/docs/TOOLSET_QUICKSTART.md)
- 📋 **Summary:** [IMPLEMENTATION_SUMMARY.md](/IMPLEMENTATION_SUMMARY.md)
- 💬 **Issues:** [GitHub Issues](https://github.com/your-org/your-repo/issues)

---

<div align="center">

**Built with** ❤️ **for the ModMe GenUI Team**

_Inspired by [GitHub MCP Server](https://github.com/github/github-mcp-server)_

**Version 1.0.0** | **2025-01-01**

</div>
