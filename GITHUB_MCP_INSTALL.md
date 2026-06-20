# GitHub MCP Server Installation Summary

## ✅ Installation Complete

The GitHub MCP Server has been successfully installed with **Docker + Dynamic Toolsets** at the user level.

---

## 📍 Configuration Location

**File:** `%APPDATA%\Code\User\mcp.json`  
**Full Path:** `C:\Users\dylan\AppData\Roaming\Code\User\mcp.json`

---

## ⚙️ Configuration Details

```json
{
  "type": "stdio",
  "command": "docker",
  "args": [
    "run",
    "-i",
    "--rm",
    "-e",
    "GITHUB_PERSONAL_ACCESS_TOKEN",
    "-e",
    "GITHUB_DYNAMIC_TOOLSETS=1",
    "ghcr.io/github/github-mcp-server"
  ],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:GITHUB_PERSONAL_ACCESS_TOKEN}"
  }
}
```

---

## 🎯 Dynamic Toolsets Features

### What It Means

- **Starts minimal:** Only 3 discovery tools available initially
- **On-demand expansion:** Agent can enable toolsets as needed
- **Reduces context:** Avoids overwhelming the LLM with all tools at once
- **Intelligent discovery:** Agent lists and explores toolsets before enabling

### Initial Tools (Available Immediately)

1. `list_available_toolsets` - Lists all available toolset categories
2. `get_toolset_tools` - Shows specific tools in a toolset
3. `enable_toolset` - Enables a toolset at runtime

### Available Toolsets (Enable on Demand)

- **context** - User and GitHub context (strongly recommended)
- **repos** - Repository operations
- **issues** - Issue management
- **pull_requests** - PR operations
- **actions** - GitHub Actions workflows
- **code_security** - Code scanning and security
- **secret_protection** - Secret scanning
- **dependabot** - Dependabot operations
- **discussions** - GitHub Discussions
- **gists** - Gist management
- **git** - Low-level Git operations
- **labels** - Label management
- **notifications** - Notification handling
- **orgs** - Organization operations
- **projects** - GitHub Projects
- **stargazers** - Star operations
- **users** - User operations

---

## 🔑 GitHub Personal Access Token Setup

### 1. Create a Token

Visit: [https://github.com/settings/tokens/new](https://github.com/settings/tokens/new)

### 2. Required Scopes

Select these permissions:

- ✅ `repo` - Full control of private repositories
- ✅ `read:org` - Read org and team membership
- ✅ `read:user` - Read user profile data

### 3. Generate and Copy

Generate the token and save it securely

### 4. VS Code Will Prompt

When you restart VS Code, it will prompt for `GITHUB_PERSONAL_ACCESS_TOKEN`

---

## 🚀 Next Steps

### 1. Restart VS Code

Close and reopen VS Code to load the new MCP configuration

### 2. Verify MCP Server

Open Copilot Chat and try:

```
List available GitHub toolsets
```

The agent should use `list_available_toolsets` tool and show you all available toolsets.

### 3. Enable a Toolset

Try asking:

```
Enable the repos toolset and list my repositories
```

The agent should:

1. Call `enable_toolset` with "repos"
2. Use newly available repo tools
3. List your repositories

### 4. Test Other Features

```
Enable issues toolset and show my open issues
Enable pull_requests toolset and list my PRs
Enable actions toolset and show recent workflow runs
```

---

## 🐳 Docker Details

### Image Status

✅ **Image:** `ghcr.io/github/github-mcp-server:latest`  
✅ **Pull Status:** Up to date (pre-downloaded)

### Docker Requirements

- Docker Desktop must be running
- Image will auto-start when MCP server is invoked
- Uses `--rm` flag (container auto-removes after use)

---

## 🔍 Verification Commands

### List All MCP Servers

```powershell
pwsh -NoProfile -File ./scripts/print_mcp_servers.ps1
```

### Verify GitHub Configuration

```powershell
pwsh -NoProfile -File ./scripts/verify_github_mcp.ps1
```

### Pull Latest Image

```powershell
docker pull ghcr.io/github/github-mcp-server:latest
```

---

## 📚 Documentation References

- **Official GitHub MCP Repo:** [github.com/github/github-mcp-server](https://github.com/github/github-mcp-server)
- **Installation Guides:** [docs/installation-guides](https://github.com/github/github-mcp-server/tree/main/docs/installation-guides)
- **Server Configuration:** [docs/server-configuration.md](https://github.com/github/github-mcp-server/blob/main/docs/server-configuration.md)
- **Dynamic Toolsets Docs:** [README - Dynamic Tool Discovery](https://github.com/github/github-mcp-server#dynamic-tool-discovery)

---

## 🔧 Troubleshooting

### MCP Server Doesn't Start

1. Verify Docker is running: `docker ps`
2. Check MCP logs in VS Code Output panel
3. Verify token has correct scopes

### Token Prompt Doesn't Appear

1. Restart VS Code completely
2. Check `mcp.json` syntax with: `Get-Content $env:APPDATA\Code\User\mcp.json | ConvertFrom-Json`

### Dynamic Toolsets Not Working

Verify the configuration has `-e GITHUB_DYNAMIC_TOOLSETS=1` in the args array

---

## ✨ Success Indicators

You'll know it's working when:

1. ✅ VS Code prompts for GitHub PAT on startup
2. ✅ Copilot Chat can call `list_available_toolsets`
3. ✅ Agent can dynamically enable toolsets
4. ✅ Newly enabled toolsets provide additional tools

---

**Installation Date:** January 2, 2026  
**Configuration Method:** Docker with Dynamic Toolsets  
**Install Level:** User-level (global across all workspaces)
