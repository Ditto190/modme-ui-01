---
agent: mcp-github-pull-request-list-pull-requests
name: List Pull Requests
description: |-
  List pull requests in a repository

tools: ["mcp_awesome-copil_get_toolset_tools"]
tags:
  - mcp
  - github-pull-request
  - github
  - automation
---

# List Pull Requests Agent

## Purpose

This agent wraps the `list_pull_requests` tool from the `github-pull-request` MCP toolset.

List pull requests in a repository

## Usage

```typescript
// Call the tool via MCP
const result = await mcp_awesome_copil_get_toolset_tools({
  toolset_name: "github-pull-request",
  tool_name: "list_pull_requests",
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
- `state` (string) - _optional_ - Pull request state filter

## Example

```typescript
// Example usage
const pr = await mcp_awesome_copil_get_toolset_tools({
  toolset_name: "github-pull-request",
  tool_name: "list_pull_requests",
  parameters: {
    owner: "microsoft",
    repo: "vscode",
    state: "open"
  }
});
```

## Notes

- Auto-generated from MCP toolset: `github-pull-request`
- Generated: 2026-02-08
- Source: GitHub Awesome-Copilot MCP Registry
