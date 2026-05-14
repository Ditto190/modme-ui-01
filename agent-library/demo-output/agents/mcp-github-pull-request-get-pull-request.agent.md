---
agent: mcp-github-pull-request-get-pull-request
name: Get Pull Request
description: |-
  Get details of a specific pull request

tools: ["mcp_awesome-copil_get_toolset_tools"]
tags:
  - mcp
  - github-pull-request
  - github
  - automation
---

# Get Pull Request Agent

## Purpose

This agent wraps the `get_pull_request` tool from the `github-pull-request` MCP toolset.

Get details of a specific pull request

## Usage

```typescript
// Call the tool via MCP
const result = await mcp_awesome_copil_get_toolset_tools({
  toolset_name: "github-pull-request",
  tool_name: "get_pull_request",
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

- `owner` (string) - **required** - Repository owner
- `repo` (string) - **required** - Repository name
- `pull_number` (number) - **required** - Pull request number

## Example

```typescript
// Example usage
const pr = await mcp_awesome_copil_get_toolset_tools({
  toolset_name: "github-pull-request",
  tool_name: "get_pull_request",
  parameters: {
    owner: "microsoft",
    repo: "vscode",
    pull_number: 12345
  }
});
```

## Notes

- Auto-generated from MCP toolset: `github-pull-request`
- Generated: 2026-02-08
- Source: GitHub Awesome-Copilot MCP Registry
