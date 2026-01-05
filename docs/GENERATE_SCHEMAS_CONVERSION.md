# TypeScript to Python Agent Tool Conversion Summary

> **Conversion of generate.ts to Python agent tools**

**Date**: January 3, 2026  
**Source**: [agent-generator/src/scripts/generate.ts](agent-generator/src/scripts/generate.ts)  
**Target**: [agent/tools/generate_schemas.py](agent/tools/generate_schemas.py)

---

## Overview

Converted TypeScript tool generation script to Python agent tools compatible with:
- Google ADK agent framework
- GenAI Toolbox configuration
- FastMCP-inspired patterns

---

## Conversion Mapping

### Original TypeScript Functions → Python Agent Tools

| TypeScript Function | Python Tool | Status |
|---------------------|-------------|--------|
| `generateToolSchemas()` | `generate_tool_schemas()` | ✅ Complete |
| `generateAgentPrompt()` | `generate_agent_prompt()` | ✅ Complete |
| - | `generate_all()` | ✅ Added (convenience) |

---

## Key Changes

### 1. Function Signatures

**TypeScript**:
```typescript
async function generateToolSchemas(): Promise<void> {
  // Implementation
}
```

**Python**:
```python
def generate_tool_schemas(
    tool_context: ToolContext,
    tools_dir: Optional[str] = None,
    output_file: Optional[str] = None
) -> Dict[str, Any]:
    """Tool description"""
    # Implementation
```

**Changes**:
- ✅ Added `tool_context: ToolContext` parameter (required for ADK tools)
- ✅ Made paths configurable (not hardcoded)
- ✅ Return structured dict instead of void
- ✅ Added comprehensive error handling

---

### 2. Return Values

**TypeScript** (prints to console):
```typescript
console.log(`Saved schemas to ${OUTPUT_DIR}/tools_schema.json`);
```

**Python** (structured response):
```python
return {
    "status": "success",
    "message": "Generated 5 schemas from 3 TypeScript files",
    "schemas_count": 5,
    "output_path": "output/tools_schema.json",
    "schemas": {...},
    "symbols_generated": ["Tool1", "Tool2"]
}
```

**Benefits**:
- Agent can programmatically check success
- Contains all relevant metadata
- Human-readable message included
- Error responses follow same structure

---

### 3. Path Resolution

**TypeScript** (hardcoded):
```typescript
const TOOLS_DIR = path.join(ROOT_DIR, 'src/tools');
const SKILLS_DIR = path.join(ROOT_DIR, 'src/skills');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
```

**Python** (configurable with defaults):
```python
TOOLS_DIR = AGENT_GENERATOR_ROOT / "src" / "tools"
SKILLS_DIR = AGENT_GENERATOR_ROOT / "src" / "skills"
OUTPUT_DIR = AGENT_GENERATOR_ROOT / "output"

def generate_tool_schemas(
    tool_context: ToolContext,
    tools_dir: Optional[str] = None,  # ✅ Configurable
    output_file: Optional[str] = None  # ✅ Configurable
):
    tools_path = Path(tools_dir) if tools_dir else TOOLS_DIR
    output_path = Path(output_file) if output_file else OUTPUT_DIR / "tools_schema.json"
```

**Benefits**:
- Can be called from different working directories
- Supports custom paths for testing
- Defaults match original behavior

---

### 4. Error Handling

**TypeScript** (minimal):
```typescript
if (!generator) {
  console.error('Failed to create schema generator');
  return;
}
```

**Python** (comprehensive):
```python
try:
    # Operation
    if not generator:
        return {
            "status": "error",
            "message": "Failed to create schema generator"
        }
except FileNotFoundError as e:
    return {
        "status": "error",
        "message": f"File not found: {str(e)}",
        "error_type": "FileNotFoundError"
    }
except Exception as e:
    return {
        "status": "error",
        "message": f"Unexpected error: {str(e)}",
        "error_type": type(e).__name__
    }
```

**Benefits**:
- Never crashes agent
- Structured error responses
- Error type included for debugging
- Human-readable messages

---

### 5. XML Generation

**TypeScript** (string concatenation):
```typescript
for (const skillFile of skillFiles) {
  const content = fs.readFileSync(skillFile, 'utf-8');
  skillsXml += `  <skill>\n`;
  skillsXml += `    <name>${skillName}</name>\n`;
  // ...
}
```

**Python** (list + join):
```python
skills_xml = ['<available_skills>']

for skill_file in sorted(skill_files):
    skills_xml.append('  <skill>')
    skills_xml.append(f'    <name>{skill_name}</name>')
    # ...

skills_xml_str = '\n'.join(skills_xml)
```

**Benefits**:
- More Pythonic (list comprehension possible)
- Deterministic output (sorted files)
- Easier to test

---

## New Features Added

### 1. Convenience Function

```python
def generate_all(
    tool_context: ToolContext,
    tools_dir: Optional[str] = None,
    skills_dir: Optional[str] = None,
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """Generate both schemas and prompt in one operation"""
```

**Why**: Common use case - regenerate everything at once

---

### 2. CLI Entry Point

```python
if __name__ == "__main__":
    # Mock ToolContext for manual testing
    mock_context = MockToolContext()
    
    if sys.argv[1] == "schemas":
        result = generate_tool_schemas(mock_context)
    # ...
```

**Usage**:
```bash
python agent/tools/generate_schemas.py all
python agent/tools/generate_schemas.py schemas
python agent/tools/generate_schemas.py prompt
```

---

### 3. GenAI Toolbox Integration

**Configuration** (genai-toolbox/tools.yaml):
```yaml
tools:
  generate_tool_schemas:
    kind: python
    module: agent.tools.generate_schemas
    function: generate_tool_schemas
    description: "Generate JSON Schemas from TypeScript interfaces"
    parameters:
      - name: tools_dir
        type: string
        required: false
      - name: output_file
        type: string
        required: false
```

**Benefits**:
- Tools discoverable by GenAI Toolbox CLI
- Can be invoked via `genai-toolbox run generate_tool_schemas`
- Integrates with larger tooling ecosystem

---

## Testing Strategy

### Manual Testing

```bash
# Test schemas generation
python agent/tools/generate_schemas.py schemas

# Test prompt generation
python agent/tools/generate_schemas.py prompt

# Test both
python agent/tools/generate_schemas.py all
```

### Automated Testing

```python
# tests/test_generate_schemas.py
import pytest
from agent.tools.generate_schemas import generate_tool_schemas
from unittest.mock import MagicMock

def test_generate_tool_schemas_success():
    context = MagicMock()
    context.state = {}
    
    result = generate_tool_schemas(
        context,
        tools_dir="agent-generator/src/tools"
    )
    
    assert result["status"] == "success"
    assert result["schemas_count"] > 0
    assert "schemas" in result

def test_generate_tool_schemas_invalid_dir():
    context = MagicMock()
    
    result = generate_tool_schemas(
        context,
        tools_dir="/nonexistent/path"
    )
    
    assert result["status"] == "error"
    assert "not found" in result["message"]
```

---

## Usage Examples

### Example 1: Agent Integration

```python
# agent/main.py
from google.adk.agents import LlmAgent
from agent.tools.generate_schemas import (
    generate_tool_schemas,
    generate_agent_prompt,
    generate_all
)

workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    model="gemini-2.5-flash",
    tools=[
        upsert_ui_element,
        remove_ui_element,
        generate_tool_schemas,    # ✅ New tool
        generate_agent_prompt,    # ✅ New tool
        generate_all,             # ✅ New tool
    ]
)
```

### Example 2: Manual Script

```python
# scripts/regenerate_schemas.py
from agent.tools.generate_schemas import generate_all

class MockContext:
    def __init__(self):
        self.state = {}

context = MockContext()
result = generate_all(context)

if result["status"] == "success":
    print(f"✅ Success! {result['message']}")
else:
    print(f"❌ Error: {result['message']}")
```

### Example 3: GenAI Toolbox CLI

```bash
# List all tools
genai-toolbox list

# Run tool via CLI
genai-toolbox run generate_agent_prompt \
  --skills_dir agent-generator/src/skills \
  --output_file output/prompt.md
```

---

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `agent/tools/generate_schemas.py` | Main tool implementation |
| `agent/tools/README.md` | Complete tool documentation |
| `docs/GENERATE_SCHEMAS_CONVERSION.md` | This document |

### Modified Files

| File | Changes |
|------|---------|
| `genai-toolbox/tools.yaml` | Added tool configurations |

---

## Migration Checklist

- [x] Convert TypeScript functions to Python
- [x] Add ToolContext parameters
- [x] Return structured dicts
- [x] Add comprehensive error handling
- [x] Make paths configurable
- [x] Add CLI entry point
- [x] Create GenAI Toolbox config
- [x] Write comprehensive documentation
- [x] Add usage examples
- [ ] Write automated tests (TODO)
- [ ] Integrate into CI/CD (TODO)

---

## Next Steps

1. **Testing**
   - Write pytest tests for all three functions
   - Test with different directory structures
   - Test error cases (missing files, invalid paths)

2. **CI/CD Integration**
   - Add to GitHub Actions workflow
   - Auto-regenerate on skill changes
   - Validate output in PRs

3. **Documentation**
   - Add to main README.md
   - Update PROJECT_OVERVIEW.md
   - Create video tutorial

4. **Enhancements**
   - Add caching for repeated generations
   - Support incremental updates (only changed skills)
   - Add validation of generated schemas

---

## Reference Implementation

The Python implementation preserves the core logic from the TypeScript version while adapting it to Python idioms and agent tool patterns.

**Original TypeScript**: [agent-generator/src/scripts/generate.ts](agent-generator/src/scripts/generate.ts)

**Python Conversion**: [agent/tools/generate_schemas.py](agent/tools/generate_schemas.py)

**Skills Reference Implementation**: The Python [skills-ref library](https://github.com/anthropics/skills-ref) provides:
- `skills-ref validate <path>` - Validate skill directories
- `skills-ref to-prompt <path>...` - Generate `<available_skills>` XML

Our implementation follows similar patterns but integrates with Google ADK agent framework.

---

## Support

For questions or issues:
1. Review [agent/tools/README.md](agent/tools/README.md)
2. Check [REFACTORING_PATTERNS.md](docs/REFACTORING_PATTERNS.md)
3. Examine test files for usage examples
4. Open GitHub issue if needed

---

**Conversion By**: ModMe GenUI Team  
**Date**: January 3, 2026  
**Status**: ✅ Complete (testing pending)
