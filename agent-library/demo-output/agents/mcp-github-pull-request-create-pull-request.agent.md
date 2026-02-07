---
agent: mcp-github-pull-request-create-pull-request
name: Create Pull Request
description: |-
  Create a new pull request

tools: ["mcp_awesome-copil_get_toolset_tools"]
tags:
  - mcp
  - github-pull-request
  - github
  - automation
---

# Create Pull Request Agent

## Purpose

This agent wraps the `create_pull_request` tool from the `github-pull-request` MCP toolset.

Create a new pull request

## Usage

```typescript
// Call the tool via MCP
const result = await mcp_awesome_copil_get_toolset_tools({
  toolset_name: "github-pull-request",
  tool_name: "create_pull_request",
  parameters: {
    // Add your parameters here based on the schema below
  }
});

if (result.success) {
  console.log("Success:", result.data);
} else {
  console.error("Error:", result.error);
}
```

## Parameters

- `owner` (string) - **required** - 
- `repo` (string) - **required** - 
- `title` (string) - **required** - 
- `head` (string) - **required** - 
- `base` (string) - **required** - 
- `body` (string) - _optional_ - 

## Example

```typescript
// Example usage
const pr = await mcp_awesome_copil_get_toolset_tools({
  toolset_name: "github-pull-request",
  tool_name: "create_pull_request",
  parameters: {
    owner: "microsoft",
    repo: "vscode",
    // additional params...
  }
});
```

## Notes

- Auto-generated from MCP toolset: `github-pull-request`
- Generated: 2026-02-08
- Source: GitHub Awesome-Copilot MCP Registry
