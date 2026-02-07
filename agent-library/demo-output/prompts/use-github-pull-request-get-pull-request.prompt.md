---
agent: "agent"
description: |-
  Use the get_pull_request tool from github-pull-request MCP toolset

tools: ["mcp_awesome-copil_get_toolset_tools", "edit", "search"]
tags:
  - mcp
  - github-pull-request
  - github
---

# Use Get Pull Request

Get details of a specific pull request

## Process

### 1. Gather Parameters

Ask the user for:

- **owner**: Repository owner (required)
- **repo**: Repository name (required)
- **pull_number**: Pull request number (required)

### 2. Execute Tool

```typescript
const result = await mcp_awesome_copil_get_toolset_tools({
  toolset_name: "github-pull-request",
  tool_name: "get_pull_request",
  parameters: {
    // Parameters from step 1
  }
});
```

### 3. Handle Response

```typescript
if (result.success) {
  // Success: process result.data
  console.log("Operation completed:", result.data);
} else {
  // Error: handle result.error
  console.error("Operation failed:", result.error);
}
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

Generated: 2026-02-08
Toolset: `github-pull-request`
Tool: `get_pull_request`
