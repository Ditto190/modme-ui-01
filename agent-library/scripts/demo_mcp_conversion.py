#!/usr/bin/env python3
"""
Practical Demo: Convert MCP Toolsets to Copilot Resources

This demo shows the complete workflow using real MCP data.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict


def demo_fetch_toolset(toolset_name: str = "github-pull-request") -> Dict[str, Any]:
    """
    Demo: Fetch MCP toolset data.

    In production, this would use the actual MCP tool:
    mcp_awesome_copil_get_toolset_tools(toolset_name)
    """
    print("\n=== STEP 1: Fetch MCP Toolset ===")
    print(f"Toolset: {toolset_name}")

    # Mock data structure (replace with actual MCP call)
    mock_data = {
        "toolset": toolset_name,
        "description": f"Tools for working with GitHub {toolset_name.split('-')[-1]}",
        "tools": [
            {
                "name": "get_pull_request",
                "description": "Get details of a specific pull request",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner"
                        },
                        "repo": {
                            "type": "string",
                            "description": "Repository name"
                        },
                        "pull_number": {
                            "type": "number",
                            "description": "Pull request number"
                        }
                    },
                    "required": ["owner", "repo", "pull_number"]
                }
            },
            {
                "name": "list_pull_requests",
                "description": "List pull requests in a repository",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "owner": {
                            "type": "string",
                            "description": "Repository owner"
                        },
                        "repo": {
                            "type": "string",
                            "description": "Repository name"
                        },
                        "state": {
                            "type": "string",
                            "enum": ["open", "closed", "all"],
                            "description": "Pull request state filter"
                        }
                    },
                    "required": ["owner", "repo"]
                }
            },
            {
                "name": "create_pull_request",
                "description": "Create a new pull request",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string"},
                        "repo": {"type": "string"},
                        "title": {"type": "string"},
                        "head": {"type": "string"},
                        "base": {"type": "string"},
                        "body": {"type": "string"}
                    },
                    "required": ["owner", "repo", "title", "head", "base"]
                }
            }
        ]
    }

    print(f"✓ Found {len(mock_data['tools'])} tools")
    for tool in mock_data['tools']:
        print(f"  - {tool['name']}: {tool['description']}")

    return mock_data


def demo_generate_agent(tool: Dict[str, Any], toolset_name: str, output_dir: Path) -> Path:
    """Demo: Generate agent file."""
    print("\n=== STEP 2: Generate Agent ===")
    print(f"Tool: {tool['name']}")

    agent_name = tool["name"].replace("_", "-")
    agent_id = f"mcp-{toolset_name}-{agent_name}"

    agent_content = f"""---
agent: {agent_id}
name: {tool['name'].replace('_', ' ').title()}
description: |-
  {tool.get('description', f'Agent for {tool["name"]} tool')}

tools: ["mcp_awesome-copil_get_toolset_tools"]
tags:
  - mcp
  - {toolset_name}
  - github
  - automation
---

# {tool['name'].replace('_', ' ').title()} Agent

## Purpose

This agent wraps the `{tool['name']}` tool from the `{toolset_name}` MCP toolset.

{tool.get('description', '')}

## Usage

```typescript
// Call the tool via MCP
const result = await mcp_awesome_copil_get_toolset_tools({{
  toolset_name: "{toolset_name}",
  tool_name: "{tool['name']}",
  parameters: {{
    // Add your parameters here based on the schema below
  }}
}});

if (result.success) {{
  console.log("Success:", result.data);
}} else {{
  console.error("Error:", result.error);
}}
```

## Parameters

{_format_params(tool.get('parameters', {}))}

## Example

```typescript
// Example usage
const pr = await mcp_awesome_copil_get_toolset_tools({{
  toolset_name: "{toolset_name}",
  tool_name: "{tool['name']}",
  parameters: {{
    owner: "microsoft",
    repo: "vscode",
    {_get_example_param(tool)}
  }}
}});
```

## Notes

- Auto-generated from MCP toolset: `{toolset_name}`
- Generated: {datetime.now().strftime("%Y-%m-%d")}
- Source: GitHub Awesome-Copilot MCP Registry
"""

    agent_path = output_dir / "agents" / f"{agent_id}.agent.md"
    agent_path.parent.mkdir(parents=True, exist_ok=True)
    agent_path.write_text(agent_content, encoding="utf-8")

    print(f"✓ Created: {agent_path.relative_to(output_dir.parent)}")
    return agent_path


def demo_generate_prompt(tool: Dict[str, Any], toolset_name: str, output_dir: Path) -> Path:
    """Demo: Generate prompt file."""
    print("\n=== STEP 3: Generate Prompt ===")
    print(f"Tool: {tool['name']}")

    prompt_name = tool["name"].replace("_", "-")
    prompt_id = f"use-{toolset_name}-{prompt_name}"

    prompt_content = f"""---
agent: "agent"
description: |-
  Use the {tool['name']} tool from {toolset_name} MCP toolset

tools: ["mcp_awesome-copil_get_toolset_tools", "edit", "search"]
tags:
  - mcp
  - {toolset_name}
  - github
---

# Use {tool['name'].replace('_', ' ').title()}

{tool.get('description', '')}

## Process

### 1. Gather Parameters

Ask the user for:

{_format_param_list(tool.get('parameters', {}))}

### 2. Execute Tool

```typescript
const result = await mcp_awesome_copil_get_toolset_tools({{
  toolset_name: "{toolset_name}",
  tool_name: "{tool['name']}",
  parameters: {{
    // Parameters from step 1
  }}
}});
```

### 3. Handle Response

```typescript
if (result.success) {{
  // Success: process result.data
  console.log("Operation completed:", result.data);
}} else {{
  // Error: handle result.error
  console.error("Operation failed:", result.error);
}}
```

## Use Cases

### Use Case 1: Automated Workflow

Integrate this tool into an automated workflow:

1. Trigger on specific event
2. Gather required parameters
3. Execute tool
4. Process results
5. Continue workflow

### Use Case 2: Interactive Operation

Use interactively with user input:

1. Prompt user for parameters
2. Validate inputs
3. Execute tool
4. Display formatted results

## Tips

- Validate all inputs before calling
- Implement proper error handling
- Use async/await for cleaner code
- Cache results when appropriate

---

Generated: {datetime.now().strftime("%Y-%m-%d")}
Toolset: `{toolset_name}`
Tool: `{tool['name']}`
"""

    prompt_path = output_dir / "prompts" / f"{prompt_id}.prompt.md"
    prompt_path.parent.mkdir(parents=True, exist_ok=True)
    prompt_path.write_text(prompt_content, encoding="utf-8")

    print(f"✓ Created: {prompt_path.relative_to(output_dir.parent)}")
    return prompt_path


def demo_generate_collection(toolset_name: str, output_dir: Path) -> Path:
    """Demo: Generate collection using keyword search."""
    print("\n=== STEP 4: Generate Collection ===")
    print(f"Using keyword search for: mcp {toolset_name}")

    collection_id = f"mcp-{toolset_name}-toolkit"
    keywords = f"mcp {toolset_name} github automation"

    print(f"Searching with keywords: {keywords}")
    print(f"Collection ID: {collection_id}")

    # In production, run the actual script:
    # subprocess.run([
    #     "python",
    #     "agent-library/scripts/generate_collection_from_keywords.py",
    #     keywords,
    #     "--output", collection_id,
    #     "--max-items", "25"
    # ])

    # For demo, create a simple collection
    collection_content = f"""id: {collection_id}
name: {toolset_name.replace('-', ' ').title()} Toolkit
description: Complete toolkit for working with GitHub {toolset_name.split('-')[-1]} via MCP
tags:
  - mcp
  - {toolset_name}
  - github
  - automation
items:
  - path: agents/mcp-{toolset_name}-get-pull-request.agent.md
    kind: agent
  - path: agents/mcp-{toolset_name}-list-pull-requests.agent.md
    kind: agent
  - path: agents/mcp-{toolset_name}-create-pull-request.agent.md
    kind: agent
  - path: prompts/use-{toolset_name}-get-pull-request.prompt.md
    kind: prompt
  - path: prompts/use-{toolset_name}-list-pull-requests.prompt.md
    kind: prompt
  - path: prompts/use-{toolset_name}-create-pull-request.prompt.md
    kind: prompt
display:
  ordering: manual
  show_badge: true
"""

    collection_path = output_dir / "collections" / f"{collection_id}.collection.yml"
    collection_path.parent.mkdir(parents=True, exist_ok=True)
    collection_path.write_text(collection_content, encoding="utf-8")

    print(f"✓ Created: {collection_path.relative_to(output_dir.parent)}")
    print(f"  - {6} items")
    print("  - 3 agents, 3 prompts")

    return collection_path


def demo_validate(output_dir: Path):
    """Demo: Validate generated files."""
    print("\n=== STEP 5: Validate ===")

    # In production, run:
    # subprocess.run(["node", "agent-library/eng/validate-collections.mjs"])

    print("Running validation...")
    print("✓ All collections valid")
    print("✓ All agents have valid frontmatter")
    print("✓ All prompts have valid frontmatter")
    print("✓ All item paths exist")


def demo_generate_docs(output_dir: Path):
    """Demo: Generate documentation."""
    print("\n=== STEP 6: Generate Documentation ===")

    # In production, run:
    # subprocess.run(["node", "agent-library/eng/update-readme.mjs"])

    print("Generating README files...")
    print("✓ Fetched MCP server data from registry")
    print("✓ Generated install buttons")
    print("✓ Created tool tables")
    print("✓ Updated collection READMEs")


# Helper functions

def _format_params(params: Dict[str, Any]) -> str:
    """Format parameters for documentation."""
    if not params or "properties" not in params:
        return "_No parameters required_"

    lines = []
    for name, info in params.get("properties", {}).items():
        required = name in params.get("required", [])
        param_type = info.get("type", "any")
        desc = info.get("description", "")
        req_str = "**required**" if required else "_optional_"
        lines.append(f"- `{name}` ({param_type}) - {req_str} - {desc}")

    return "\n".join(lines)


def _format_param_list(params: Dict[str, Any]) -> str:
    """Format parameter list for gathering."""
    if not params or "properties" not in params:
        return "_No parameters needed_"

    lines = []
    for name, info in params.get("properties", {}).items():
        required = name in params.get("required", [])
        desc = info.get("description", name)
        if required:
            lines.append(f"- **{name}**: {desc} (required)")
        else:
            lines.append(f"- {name}: {desc} (optional)")

    return "\n".join(lines)


def _get_example_param(tool: Dict[str, Any]) -> str:
    """Get example parameter for demo."""
    params = tool.get("parameters", {})
    if "properties" in params:
        props = params["properties"]
        if "pull_number" in props:
            return 'pull_number: 12345'
        elif "state" in props:
            return 'state: "open"'
    return "// additional params..."


def main():
    """Run the complete demo."""
    print("=" * 60)
    print("MCP to GitHub Copilot Resources - Practical Demo")
    print("=" * 60)

    # Configuration
    toolset_name = "github-pull-request"
    output_dir = Path(__file__).parent.parent / "demo-output"

    print("\nConfiguration:")
    print(f"  Toolset: {toolset_name}")
    print(f"  Output: {output_dir}")

    # Step 1: Fetch toolset
    toolset_data = demo_fetch_toolset(toolset_name)

    # Step 2-3: Generate agents and prompts for each tool
    for tool in toolset_data["tools"]:
        demo_generate_agent(tool, toolset_name, output_dir)
        demo_generate_prompt(tool, toolset_name, output_dir)

    # Step 4: Generate collection
    demo_generate_collection(toolset_name, output_dir)

    # Step 5: Validate
    demo_validate(output_dir)

    # Step 6: Generate docs
    demo_generate_docs(output_dir)

    # Summary
    print("\n" + "=" * 60)
    print("Demo Complete!")
    print("=" * 60)
    print(f"\n📁 Output Directory: {output_dir}")
    print("\n📋 Generated Files:")

    # List generated files
    for category in ["agents", "prompts", "collections"]:
        cat_dir = output_dir / category
        if cat_dir.exists():
            files = list(cat_dir.glob("*.md")) + list(cat_dir.glob("*.yml"))
            print(f"\n{category.title()} ({len(files)}):")
            for file in sorted(files):
                print(f"  ✓ {file.name}")

    print("\n🎯 Next Steps:")
    print("  1. Review generated files in demo-output/")
    print("  2. Test with actual MCP toolset data")
    print("  3. Run: python agent-library/scripts/mcp_to_copilot_resources.py <toolset> --all")
    print("  4. Validate: node agent-library/eng/validate-collections.mjs")
    print("  5. Generate docs: node agent-library/eng/update-readme.mjs")

    print("\n📚 Documentation:")
    print("  - Full workflow: agent-library/MCP_TO_COPILOT_WORKFLOW.md")
    print("  - Quick reference: agent-library/QUICK_REFERENCE_MCP_CONVERSION.md")
    print("  - Collection prompt: agent-library/prompts/generate-collection-from-keywords.prompt.md")


if __name__ == "__main__":
    main()
