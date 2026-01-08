# Agent Tools Documentation

> **Python tools for ModMe GenUI Workbench agent functionality**

This directory contains Python agent tools that integrate with the Google ADK agent system. All tools follow the FastMCP-inspired pattern with `ToolContext` parameter.

---

## Table of Contents

1. [Tool Architecture](#tool-architecture)
2. [Available Tools](#available-tools)
3. [Usage Examples](#usage-examples)
4. [Development Guide](#development-guide)
5. [Testing](#testing)

---

## Tool Architecture

### Pattern

All agent tools follow this pattern:

```python
from google.adk.tools import ToolContext
from typing import Dict, Any

def my_tool(tool_context: ToolContext, param: str) -> Dict[str, Any]:
    """
    Tool description for agent instructions.
    
    Args:
        param: Description with type info
    
    Returns:
        Dictionary with status and result
    """
    # 1. Validate inputs
    if not param or not isinstance(param, str):
        return {"status": "error", "message": "Invalid param"}
    
    # 2. Get state safely
    state = tool_context.state.get("key", default_value)
    
    # 3. Perform operation
    result = perform_operation(param)
    
    # 4. Update state if needed
    tool_context.state["key"] = result
    
    # 5. Return structured response
    return {
        "status": "success",
        "message": "Operation completed",
        "result": result
    }
```

### Return Value Convention

All tools return dictionaries with:

- **status**: `"success"`, `"error"`, or `"warning"`
- **message**: Human-readable status message
- Additional keys for tool-specific data

---

## Available Tools

### 1. Schema Generation Tools

#### `generate_tool_schemas`

**Purpose**: Generate JSON Schemas from TypeScript tool interface definitions

**Source**: Converted from [agent-generator/src/scripts/generate.ts](../../agent-generator/src/scripts/generate.ts)

**Usage**:

```python
from agent.tools.generate_schemas import generate_tool_schemas

result = generate_tool_schemas(
    tool_context,
    tools_dir="agent-generator/src/tools",
    output_file="output/tools_schema.json"
)

# result = {
#     "status": "success",
#     "schemas_count": 5,
#     "output_path": "output/tools_schema.json",
#     "schemas": {...}
# }
```

**Configuration** (genai-toolbox/tools.yaml):

```yaml
generate_tool_schemas:
  kind: python
  module: agent.tools.generate_schemas
  function: generate_tool_schemas
  description: "Generate JSON Schemas from TypeScript tool interfaces"
  parameters:
    - name: tools_dir
      type: string
      required: false
    - name: output_file
      type: string
      required: false
```

---

#### `generate_agent_prompt`

**Purpose**: Generate agent system prompt from skill SKILL.md files

**Source**: Converted from [agent-generator/src/scripts/generate.ts](../../agent-generator/src/scripts/generate.ts)

**Usage**:

```python
from agent.tools.generate_schemas import generate_agent_prompt

result = generate_agent_prompt(
    tool_context,
    skills_dir="agent-generator/src/skills",
    output_file="output/agent_prompt.md",
    include_instructions=True
)

# result = {
#     "status": "success",
#     "skills_count": 3,
#     "output_path": "output/agent_prompt.md",
#     "prompt": "# AI Agent System Prompt\n..."
# }
```

**Output Format**:

```markdown
# AI Agent System Prompt

You are a helpful AI assistant equipped with specific skills and tools.

<available_skills>
  <skill>
    <name>mcp-builder</name>
    <description>
      Guide for creating high-quality MCP servers...
    </description>
    <instructions>
      [Full SKILL.md content...]
    </instructions>
  </skill>
  ...
</available_skills>

## Instructions
1. Review the <available_skills> to understand what you can do.
2. If a user request matches a skill's capabilities, follow those instructions.
3. Use the provided tools when necessary to fulfill requests.
```

---

#### `generate_all`

**Purpose**: Generate both tool schemas and agent prompt in one operation

**Usage**:

```python
from agent.tools.generate_schemas import generate_all

result = generate_all(
    tool_context,
    tools_dir="agent-generator/src/tools",
    skills_dir="agent-generator/src/skills",
    output_dir="output"
)

# result = {
#     "status": "success",
#     "schemas_result": {...},
#     "prompt_result": {...}
# }
```

---

### 2. Schema Crawler Tools

#### `generate_zod_from_json_schema`

**Purpose**: Convert JSON Schema to Zod validation schema + TypeScript types

**Documentation**: See [agent-generator/SCHEMA_CRAWLER_README.md](../../agent-generator/SCHEMA_CRAWLER_README.md)

**Usage**:

```python
from agent.tools.schema_crawler_tool import generate_zod_from_json_schema

result = generate_zod_from_json_schema(
    tool_context,
    json_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string", "minLength": 1},
            "age": {"type": "integer", "minimum": 0}
        },
        "required": ["name"]
    },
    schema_name="PersonInput",
    output_path="src/schemas/PersonInput.schema.ts"
)
```

---

#### `generate_zod_module`

**Purpose**: Generate complete Zod module for MCP tool with input/output schemas

**Usage**:

```python
from agent.tools.schema_crawler_tool import generate_zod_module

result = generate_zod_module(
    tool_context,
    tool_name="getWeather",
    input_schema={
        "type": "object",
        "properties": {
            "city": {"type": "string"},
            "units": {"type": "string", "enum": ["celsius", "fahrenheit"]}
        }
    },
    output_schema={
        "type": "object",
        "properties": {
            "temperature": {"type": "number"},
            "condition": {"type": "string"}
        }
    },
    output_path="src/schemas/getWeather.schema.ts"
)
```

---

## Usage Examples

### Example 1: Regenerate Agent Schemas

```python
# agent/main.py or scripts/regenerate_schemas.py
from google.adk.tools import ToolContext
from agent.tools.generate_schemas import generate_all

def regenerate_schemas():
    """Regenerate all agent schemas and prompts."""
    
    # Mock ToolContext for script usage
    class MockContext:
        def __init__(self):
            self.state = {}
    
    context = MockContext()
    
    # Generate everything
    result = generate_all(context)
    
    if result["status"] == "success":
        print(f"✅ Generated {result['schemas_result']['schemas_count']} schemas")
        print(f"✅ Generated prompt from {result['prompt_result']['skills_count']} skills")
        print(f"📁 Output: {result['output_directory']}")
    else:
        print(f"❌ Error: {result['message']}")

if __name__ == "__main__":
    regenerate_schemas()
```

### Example 2: Add Tool to Agent

```python
# agent/main.py
from google.adk.agents import LlmAgent
from agent.tools.generate_schemas import generate_agent_prompt

workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    model="gemini-2.5-flash",
    instruction="You manage a generative UI workbench...",
    tools=[
        upsert_ui_element,
        remove_ui_element,
        clear_canvas,
        generate_agent_prompt,  # ✅ Add new tool
        # ... other tools
    ]
)
```

### Example 3: GenAI Toolbox Integration

```bash
# Install genai-toolbox CLI
pip install genai-toolbox

# List available tools
genai-toolbox list

# Run tool via CLI
genai-toolbox run generate_agent_prompt \
  --skills_dir agent-generator/src/skills \
  --output_file output/prompt.md
```

---

## Development Guide

### Adding a New Tool

1. **Create Tool File**

```python
# agent/tools/my_new_tool.py
"""
My New Tool - Description of what it does

Reference Implementation: [original source if applicable]
"""

from google.adk.tools import ToolContext
from typing import Dict, Any

def my_new_tool(
    tool_context: ToolContext,
    param1: str,
    param2: int = 10
) -> Dict[str, Any]:
    """
    Tool description for agent.
    
    Args:
        param1: Required parameter description
        param2: Optional parameter (default: 10)
    
    Returns:
        Dictionary with status and result
    """
    try:
        # Validate inputs
        if not param1:
            return {"status": "error", "message": "param1 is required"}
        
        # Perform operation
        result = perform_operation(param1, param2)
        
        # Return success
        return {
            "status": "success",
            "message": f"Completed operation on {param1}",
            "result": result
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "error_type": type(e).__name__
        }
```

1. **Register in GenAI Toolbox**

```yaml
# genai-toolbox/tools.yaml
tools:
  my_new_tool:
    kind: python
    module: agent.tools.my_new_tool
    function: my_new_tool
    description: "Tool description"
    parameters:
      - name: param1
        type: string
        description: "Parameter description"
        required: true
      - name: param2
        type: integer
        description: "Optional parameter"
        required: false
```

1. **Add Tests**

```python
# tests/test_my_new_tool.py
import pytest
from agent.tools.my_new_tool import my_new_tool
from unittest.mock import MagicMock

def test_my_new_tool_success():
    context = MagicMock()
    context.state = {}
    
    result = my_new_tool(context, param1="test", param2=20)
    
    assert result["status"] == "success"
    assert "result" in result

def test_my_new_tool_invalid_input():
    context = MagicMock()
    
    result = my_new_tool(context, param1="")
    
    assert result["status"] == "error"
    assert "required" in result["message"]
```

---

## Testing

### Manual Testing

```python
# Test tool directly
python agent/tools/generate_schemas.py all

# Or import in Python REPL
from agent.tools.generate_schemas import generate_all
from unittest.mock import MagicMock

context = MagicMock()
context.state = {}

result = generate_all(context)
print(result)
```

### Automated Tests

```bash
# Run all tests
pytest tests/

# Run specific tool tests
pytest tests/test_generate_schemas.py

# With coverage
pytest --cov=agent.tools tests/
```

---

## Best Practices

### ✅ DO

- **Validate all inputs** before operations
- **Use type hints** for all parameters
- **Return structured dicts** with status + message
- **Handle exceptions** gracefully
- **Document with docstrings** (becomes tool description in agent)
- **Test independently** before agent integration
- **Log operations** for debugging

### ❌ DON'T

- Assume inputs are valid
- Raise uncaught exceptions
- Return inconsistent response formats
- Mutate global state
- Skip error handling
- Use blocking operations without timeouts

---

## Related Documentation

- [REFACTORING_PATTERNS.md](../../docs/REFACTORING_PATTERNS.md) - Tool refactoring patterns
- [SCHEMA_CRAWLER_README.md](../../agent-generator/SCHEMA_CRAWLER_README.md) - Schema crawler details
- [genai-toolbox/tools.yaml](../../genai-toolbox/tools.yaml) - Tool configuration
- [agent/main.py](../main.py) - Agent integration examples

---

## Support

For issues or questions:

1. Check tool docstrings for usage details
2. Review [REFACTORING_PATTERNS.md](../../docs/REFACTORING_PATTERNS.md) for patterns
3. Run tool with `--help` flag (if CLI entry point exists)
4. Check test files for usage examples

---

**Last Updated**: 2026-01-03  
**Maintained by**: ModMe GenUI Team  
**Version**: 1.0.0
