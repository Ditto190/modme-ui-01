#!/usr/bin/env python3
"""
Convert MCP Toolsets to GitHub Copilot Resources

This script automates the conversion of MCP toolsets (from awesome-copilot)
into GitHub Copilot agents, prompts, instructions, and collections.

Usage:
    python mcp_to_copilot_resources.py <toolset-name> [options]

Examples:
    # Convert entire toolset
    python mcp_to_copilot_resources.py github-pull-request

    # Generate specific resource types
    python mcp_to_copilot_resources.py github-pull-request --agents --prompts

    # Include schema generation
    python mcp_to_copilot_resources.py github-pull-request --schemas

    # Custom collection name
    python mcp_to_copilot_resources.py github-pull-request --collection-name "github-pr-tools"
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class MCPToolsetConverter:
    """Convert MCP toolsets to GitHub Copilot resources."""

    def __init__(self, toolset_name: str, output_base: Path):
        self.toolset_name = toolset_name
        self.output_base = output_base
        self.toolset_data: Dict[str, Any] = {}
        self.tools: List[Dict[str, Any]] = []

    def fetch_toolset(self) -> bool:
        """Fetch toolset tools using MCP."""
        print(f"📡 Fetching toolset: {self.toolset_name}")

        # Note: This would use the actual MCP tool when available
        # For now, we'll show the structure
        print("   Using mcp_awesome-copil_get_toolset_tools...")

        # Placeholder for actual implementation
        # In practice, this would call the MCP tool and get real data
        self.toolset_data = {
            "toolset_name": self.toolset_name,
            "description": f"Tools from {self.toolset_name} MCP server",
            "tools": [],
        }

        return True

    def generate_agent(self, tool: Dict[str, Any]) -> Path:
        """Generate an agent file from a tool definition."""
        agent_name = tool["name"].replace("_", "-")
        agent_id = f"mcp-{self.toolset_name}-{agent_name}"

        agent_content = f"""---
agent: {agent_id}
name: {self._format_title(tool['name'])}
description: |-
  {tool.get('description', f'Agent for {tool["name"]} tool')}

tools: ["mcp_awesome-copil_get_toolset_tools"]
tags:
  - mcp
  - {self.toolset_name}
  - automation
  - {agent_name}
---

# {self._format_title(tool['name'])} Agent

## Purpose

This agent wraps the `{tool['name']}` tool from the `{self.toolset_name}` MCP toolset.

{tool.get('description', '')}

## Capabilities

{"".join(f"- {capability}\n" for capability in self._extract_capabilities(tool))}

## Usage

### Basic Usage

```typescript
// Call the tool
const result = await mcp_awesome_copil_get_toolset_tools({{
  toolset_name: "{self.toolset_name}",
  tool_name: "{tool['name']}",
  parameters: {{
    // Add your parameters here
  }}
}});
```

### Parameters

{self._format_parameters(tool.get('parameters', {{}}))}

## Examples

{self._generate_examples(tool)}

## Best Practices

1. **Validate inputs**: Always check input parameters before calling
2. **Handle errors**: Implement proper error handling
3. **Use async/await**: This agent is async
4. **Check responses**: Validate response structure

## Related Resources

- Toolset: `{self.toolset_name}`
- Tool: `{tool['name']}`
- MCP Registry: https://github.com/github/awesome-copilot

## Notes

- This agent is auto-generated from MCP toolset metadata
- Generated on: {datetime.now().isoformat()}
- Source toolset: {self.toolset_name}
"""

        agent_path = self.output_base / "agents" / f"{agent_id}.agent.md"
        agent_path.parent.mkdir(parents=True, exist_ok=True)
        agent_path.write_text(agent_content, encoding="utf-8")

        print(f"   ✓ Generated agent: {agent_path.name}")
        return agent_path

    def generate_prompt(self, tool: Dict[str, Any]) -> Path:
        """Generate a prompt file from a tool definition."""
        prompt_name = tool["name"].replace("_", "-")
        prompt_id = f"use-{self.toolset_name}-{prompt_name}"

        prompt_content = f"""---
agent: "agent"
description: |-
  Use the {tool['name']} tool from {self.toolset_name} MCP toolset

tools: ["mcp_awesome-copil_get_toolset_tools", "edit", "search"]
tags:
  - mcp
  - {self.toolset_name}
  - {prompt_name}
---

# Use {self._format_title(tool['name'])}

{tool.get('description', f'Execute {tool["name"]} from the {self.toolset_name} toolset.')}

## Process

### 1. Gather Required Parameters

{self._format_parameter_gathering(tool.get('parameters', {{}}))}

### 2. Execute Tool

Call the MCP tool with the gathered parameters:

```typescript
const result = await mcp_awesome_copil_get_toolset_tools({{
  toolset_name: "{self.toolset_name}",
  tool_name: "{tool['name']}",
  parameters: {{
    // Parameters from step 1
  }}
}});
```

### 3. Process Results

Handle the response:

```typescript
if (result.success) {{
  // Success handling
  console.log("Operation completed:", result.data);
}} else {{
  // Error handling
  console.error("Operation failed:", result.error);
}}
```

### 4. Take Action

Based on the results:

- Update relevant files if needed
- Notify user of completion
- Log results for audit trail
- Handle any follow-up actions

## Use Cases

{self._generate_use_cases(tool)}

## Tips

1. **Validate inputs**: Check all required parameters before calling
2. **Handle async**: This is an async operation
3. **Error handling**: Implement proper try-catch blocks
4. **User feedback**: Keep user informed of progress

## Examples

{self._generate_examples(tool)}

---

**Generated from MCP toolset:** `{self.toolset_name}`
**Tool:** `{tool['name']}`
**Generated:** {datetime.now().isoformat()}
"""

        prompt_path = self.output_base / "prompts" / f"{prompt_id}.prompt.md"
        prompt_path.parent.mkdir(parents=True, exist_ok=True)
        prompt_path.write_text(prompt_content, encoding="utf-8")

        print(f"   ✓ Generated prompt: {prompt_path.name}")
        return prompt_path

    def generate_instructions(self, toolset_tools: List[Dict[str, Any]]) -> Path:
        """Generate instructions file for the entire toolset."""
        instructions_id = f"mcp-{self.toolset_name}"

        instructions_content = f"""---
description: |-
  Instructions for using {self.toolset_name} MCP toolset

applyTo: "**/*.ts, **/*.js, **/*.py"
tags:
  - mcp
  - {self.toolset_name}
  - automation
---

# {self._format_title(self.toolset_name)} MCP Toolset Instructions

## Overview

This toolset provides {len(toolset_tools)} tools for working with {self.toolset_name}.

## Available Tools

{self._format_tool_list(toolset_tools)}

## Usage Guidelines

### When to Use These Tools

Use these tools when:

{self._generate_usage_guidelines(toolset_tools)}

### Integration Pattern

```typescript
// Import MCP tool
import {{ mcp_awesome_copil_get_toolset_tools }} from "@/lib/mcp";

// Use toolset
async function use{self._format_class_name(self.toolset_name)}Tool(
  toolName: string,
  params: Record<string, any>
) {{
  const result = await mcp_awesome_copil_get_toolset_tools({{
    toolset_name: "{self.toolset_name}",
    tool_name: toolName,
    parameters: params,
  }});

  if (!result.success) {{
    throw new Error(`Tool execution failed: ${{result.error}}`);
  }}

  return result.data;
}}
```

## Best Practices

### Error Handling

Always implement proper error handling:

```typescript
try {{
  const result = await use{self._format_class_name(self.toolset_name)}Tool(
    "tool_name",
    {{ /* params */ }}
  );
  // Process result
}} catch (error) {{
  console.error("Tool execution failed:", error);
  // Handle error appropriately
}}
```

### Parameter Validation

Validate parameters before calling:

```typescript
function validateParams(params: Record<string, any>) {{
  // Add validation logic
  if (!params.requiredField) {{
    throw new Error("Required field missing");
  }}
  return true;
}}
```

### Async Operations

Handle async operations properly:

```typescript
// Use async/await
const result = await toolCall();

// Or use promises
toolCall()
  .then(result => {{ /* handle success */ }})
  .catch(error => {{ /* handle error */ }});
```

## Security Considerations

1. **Input Validation**: Always validate user inputs
2. **Authentication**: Ensure proper authentication
3. **Authorization**: Check user permissions
4. **Data Sanitization**: Sanitize outputs
5. **Error Messages**: Don't leak sensitive info

## Performance Tips

1. **Caching**: Cache results when appropriate
2. **Batching**: Batch multiple operations
3. **Async**: Use async operations
4. **Timeouts**: Implement reasonable timeouts
5. **Retries**: Add retry logic for transient failures

## Common Patterns

{self._generate_common_patterns(toolset_tools)}

## Troubleshooting

### Tool Not Found

If you get "tool not found" errors:

1. Check toolset name spelling
2. Verify tool exists in toolset
3. Ensure MCP server is running

### Authentication Errors

If you get auth errors:

1. Check credentials
2. Verify permissions
3. Refresh tokens if needed

### Timeout Errors

If operations timeout:

1. Increase timeout value
2. Check network connectivity
3. Verify server health

## References

- **Toolset**: `{self.toolset_name}`
- **Tools**: {len(toolset_tools)} available
- **MCP Registry**: https://github.com/github/awesome-copilot
- **Generated**: {datetime.now().isoformat()}

---

**Auto-generated from MCP toolset metadata**
"""

        instructions_path = (
            self.output_base / "instructions" / f"{instructions_id}.instructions.md"
        )
        instructions_path.parent.mkdir(parents=True, exist_ok=True)
        instructions_path.write_text(instructions_content, encoding="utf-8")

        print(f"   ✓ Generated instructions: {instructions_path.name}")
        return instructions_path

    def generate_collection(self, collection_name: Optional[str] = None) -> Path:
        """Generate a collection for all generated resources."""
        collection_id = collection_name or f"mcp-{self.toolset_name}-toolkit"

        print(f"📦 Generating collection: {collection_id}")

        # Use the existing collection generator script
        keywords = f"mcp {self.toolset_name} automation tools"

        try:
            subprocess.run(
                [
                    "python",
                    str(
                        self.output_base.parent
                        / "scripts"
                        / "generate_collection_from_keywords.py"
                    ),
                    keywords,
                    "--output",
                    collection_id,
                    "--max-items",
                    "50",
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            collection_path = self.output_base / "collections" / f"{collection_id}.collection.yml"
            print(f"   ✓ Generated collection: {collection_path.name}")
            return collection_path

        except subprocess.CalledProcessError as e:
            print(f"   ⚠ Failed to generate collection: {e}")
            return None

    def generate_schemas(self) -> Path:
        """Generate TypeScript/Zod schemas for the tools."""
        print(f"🔧 Generating schemas for {self.toolset_name}")

        # Create schemas directory
        schemas_dir = self.output_base / "schemas" / self.toolset_name
        schemas_dir.mkdir(parents=True, exist_ok=True)

        # Create a JSON schema file for the toolset
        schema_data = {
            "toolset": self.toolset_name,
            "tools": self.tools,
            "generated_at": datetime.now().isoformat(),
        }

        schema_file = schemas_dir / "tools.json"
        schema_file.write_text(json.dumps(schema_data, indent=2), encoding="utf-8")

        print(f"   ✓ Generated schema file: {schema_file.name}")

        # Note: To run the TypeScript schema generator, you would call:
        # npx tsx agent-generator/src/scripts/generate-agent-schemas.ts
        print(
            "   ℹ To generate Zod schemas, run: npx tsx agent-generator/src/scripts/generate-agent-schemas.ts"
        )

        return schemas_dir

    # Helper methods

    def _format_title(self, name: str) -> str:
        """Convert snake_case to Title Case."""
        return " ".join(word.capitalize() for word in name.split("_"))

    def _format_class_name(self, name: str) -> str:
        """Convert kebab-case to PascalCase."""
        return "".join(word.capitalize() for word in name.replace("-", "_").split("_"))

    def _extract_capabilities(self, tool: Dict[str, Any]) -> List[str]:
        """Extract capabilities from tool metadata."""
        capabilities = []

        if "description" in tool:
            capabilities.append(tool["description"])

        if "parameters" in tool:
            param_count = len(tool["parameters"].get("properties", {}))
            capabilities.append(f"Accepts {param_count} parameters")

        return capabilities or ["Tool functionality"]

    def _format_parameters(self, params: Dict[str, Any]) -> str:
        """Format parameters section."""
        if not params or "properties" not in params:
            return "_No parameters required_"

        lines = []
        for param_name, param_info in params.get("properties", {}).items():
            required = param_name in params.get("required", [])
            param_type = param_info.get("type", "any")
            description = param_info.get("description", "")

            req_marker = "**required**" if required else "_optional_"
            lines.append(
                f"- `{param_name}` ({param_type}) - {req_marker} - {description}"
            )

        return "\n".join(lines)

    def _format_parameter_gathering(self, params: Dict[str, Any]) -> str:
        """Format parameter gathering instructions."""
        if not params or "properties" not in params:
            return "_No parameters needed - proceed to execution_"

        lines = ["Ask the user for the following:"]
        for param_name, param_info in params.get("properties", {}).items():
            required = param_name in params.get("required", [])
            description = param_info.get("description", param_name)

            if required:
                lines.append(f"- **{param_name}**: {description} (required)")
            else:
                lines.append(f"- {param_name}: {description} (optional)")

        return "\n".join(lines)

    def _generate_examples(self, tool: Dict[str, Any]) -> str:
        """Generate example usage."""
        return f"""### Example 1: Basic Usage

```typescript
const result = await mcp_awesome_copil_get_toolset_tools({{
  toolset_name: "{self.toolset_name}",
  tool_name: "{tool['name']}",
  parameters: {{
    // Add parameters here
  }}
}});

console.log("Result:", result);
```

### Example 2: With Error Handling

```typescript
try {{
  const result = await mcp_awesome_copil_get_toolset_tools({{
    toolset_name: "{self.toolset_name}",
    tool_name: "{tool['name']}",
    parameters: {{ /* ... */ }}
  }});

  if (result.success) {{
    console.log("Success:", result.data);
  }}
}} catch (error) {{
  console.error("Failed:", error);
}}
```
"""

    def _generate_use_cases(self, tool: Dict[str, Any]) -> str:
        """Generate use case examples."""
        return f"""### Use Case 1: Automated Workflow

**Scenario:** Automate {tool['name']} as part of a larger workflow

**Steps:**
1. Gather required parameters
2. Call {tool['name']} tool
3. Process results
4. Continue workflow

---

### Use Case 2: Interactive Operation

**Scenario:** User-initiated {tool['name']} operation

**Steps:**
1. Prompt user for inputs
2. Validate inputs
3. Execute tool
4. Display results
"""

    def _format_tool_list(self, tools: List[Dict[str, Any]]) -> str:
        """Format list of tools."""
        if not tools:
            return "_No tools available_"

        lines = []
        for tool in tools:
            name = tool.get("name", "unknown")
            desc = tool.get("description", "")
            lines.append(f"- **`{name}`** - {desc}")

        return "\n".join(lines)

    def _generate_usage_guidelines(self, tools: List[Dict[str, Any]]) -> str:
        """Generate usage guidelines."""
        lines = [
            "- Working with the target system/service",
            f"- Need to automate {self.toolset_name} operations",
            "- Integrating with MCP-compatible systems",
            "- Building workflows that involve multiple tools",
        ]
        return "\n".join(lines)

    def _generate_common_patterns(self, tools: List[Dict[str, Any]]) -> str:
        """Generate common patterns section."""
        return """### Pattern 1: Sequential Operations

```typescript
// Execute tools in sequence
async function sequentialOps() {
  const result1 = await toolCall("tool1", params1);
  const result2 = await toolCall("tool2", { ...params2, data: result1 });
  return result2;
}
```

### Pattern 2: Parallel Operations

```typescript
// Execute tools in parallel
async function parallelOps() {
  const [result1, result2] = await Promise.all([
    toolCall("tool1", params1),
    toolCall("tool2", params2)
  ]);
  return { result1, result2 };
}
```

### Pattern 3: Conditional Execution

```typescript
// Execute based on conditions
async function conditionalOps(condition: boolean) {
  if (condition) {
    return await toolCall("tool1", params1);
  } else {
    return await toolCall("tool2", params2);
  }
}
```
"""


def main():
    parser = argparse.ArgumentParser(
        description="Convert MCP toolsets to GitHub Copilot resources"
    )
    parser.add_argument("toolset_name", help="Name of the MCP toolset")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent,
        help="Output directory (default: agent-library/)",
    )
    parser.add_argument(
        "--agents", action="store_true", help="Generate agent files"
    )
    parser.add_argument(
        "--prompts", action="store_true", help="Generate prompt files"
    )
    parser.add_argument(
        "--instructions", action="store_true", help="Generate instructions file"
    )
    parser.add_argument(
        "--collection",
        action="store_true",
        help="Generate collection",
    )
    parser.add_argument(
        "--collection-name",
        help="Custom collection name",
    )
    parser.add_argument(
        "--schemas", action="store_true", help="Generate TypeScript/Zod schemas"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate all resource types",
    )

    args = parser.parse_args()

    # If --all or no specific flags, generate everything
    generate_all = args.all or not any(
        [args.agents, args.prompts, args.instructions, args.collection, args.schemas]
    )

    converter = MCPToolsetConverter(args.toolset_name, args.output_dir)

    print("\n🚀 MCP to GitHub Copilot Resource Converter")
    print(f"📋 Toolset: {args.toolset_name}\n")

    # Fetch toolset data
    if not converter.fetch_toolset():
        print("❌ Failed to fetch toolset data")
        return 1

    # Generate resources based on flags
    if generate_all or args.agents:
        print("\n📝 Generating Agents...")
        for tool in converter.tools or []:
            converter.generate_agent(tool)

    if generate_all or args.prompts:
        print("\n🎯 Generating Prompts...")
        for tool in converter.tools or []:
            converter.generate_prompt(tool)

    if generate_all or args.instructions:
        print("\n📖 Generating Instructions...")
        converter.generate_instructions(converter.tools or [])

    if generate_all or args.schemas:
        print("\n🔧 Generating Schemas...")
        converter.generate_schemas()

    if generate_all or args.collection:
        print("\n📦 Generating Collection...")
        converter.generate_collection(args.collection_name)

    print("\n✅ Conversion complete!\n")
    print("Next steps:")
    print("1. Review generated files")
    print("2. Customize templates as needed")
    print("3. Run validation: npm run validate:toolsets")
    print("4. Generate docs: npm run docs:all")

    return 0


if __name__ == "__main__":
    exit(main())
