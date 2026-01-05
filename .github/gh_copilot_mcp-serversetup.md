{
  "mcpServers": {
    "github-readonly": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/readonly",
      "tools": [
        "search_repositories",
        "get_repository_content",
        "list_issues",
        "get_pull_request",
        "search_code",
        "list_files"
      ],
      "headers": {
        "X-MCP-Toolsets": "repos,issues,pull_requests,code_security"
      }
    },
    "sentry": {
      "type": "local",
      "command": "npx",
      "args": [
        "@sentry/mcp-server@latest",
        "--host=$SENTRY_HOST"
      ],
      "tools": [
        "get_issue_details",
        "get_issue_summary",
        "list_recent_issues"
      ],
      "env": {
        "SENTRY_HOST": "https://your-org.sentry.io",
        "SENTRY_ACCESS_TOKEN": "COPILOT_MCP_SENTRY_ACCESS_TOKEN"
      }
    },
    "notion": {
      "type": "local",
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "NOTION_API_KEY=$NOTION_API_KEY",
        "mcp/notion"
      ],
      "tools": [
        "list_databases",
        "query_database",
        "get_page"
      ],
      "env": {
        "NOTION_API_KEY": "COPILOT_MCP_NOTION_API_KEY"
      }
    },
    "azure": {
      "type": "local",
      "command": "npx",
      "args": [
        "-y",
        "@azure/mcp@latest",
        "server",
        "start"
      ],
      "tools": [
        "list_resources",
        "get_resource_info",
        "list_deployments"
      ]
    }
  }
}