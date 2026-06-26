# GitKraken CLI — AI-Assisted Vibe-Coder Setup

This guide provides everything you need to know to leverage the new **GitKraken CLI (gk)** within your AI-assisted development ("vibe-coding") setup for this project.

With your **GitKraken PRO Subscription**, you have unlocked advanced cloud features, issue tracking, and powerful AI capabilities that integrate directly with your editor (Cursor, VS Code, Claude Desktop, Trae, etc.) via the Model Context Protocol (MCP).

---

## 🚀 Quick Start & Status

We have already completed the initial installation and configuration for you. Here is the current status:

*   **Executable Location:** `C:\Users\dylan\AppData\Local\Microsoft\WinGet\Packages\GitKraken.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\gk.exe`
    *   *Note: This directory is registered in your User PATH. Please restart your terminal/editor to make `gk` globally available as a command.*
*   **Authenticated User:** `Ditto190 <dylan.work190@gmail.com>`
*   **Active Organization:** `ModifyMe` (PRO Subscription)
*   **Active GitKraken Workspace:** `modme-ui` (contains the `modme-ui-01` repo at `c:\Users\dylan\Monorepo_ModMe`)
*   **Connected Providers:** GitHub & GitLab

---

## 🤖 MCP Server (AI-Assisted Vibe-Coding)

The **GitKraken MCP Server** allows AI agents (like Cursor's Composer, Claude Code, Trae, or this Antigravity session) to directly query and manage your Git repositories, issues, and pull requests.

### Cursor setup (this repo)

1. **Install GitLens** in Cursor (`eamodio.gitlens`) — enables `extension-GitKraken` MCP tools (Launchpad, graph, PR/issue actions).
2. **Run the repo doctor** (reinstalls `gk mcp` into `~/.cursor/mcp.json`, sets workspace `modme-ui`):

   ```powershell
   yarn gitkraken:setup
   # or: .\scripts\gitkraken\setup-cursor.ps1
   ```

3. **Restart Cursor** and open a **new terminal** so `gk` is on PATH.
4. **Verify in chat:** ask the agent for Launchpad or `git status` — it should call GitKraken MCP tools.

Agent rule: `.cursor/rules/gitkraken-mcp.mdc` tells Cursor agents which MCP tools to use for git/PR/issue work.

**Two MCP sources in Cursor (both OK):**

| Source | Id | Config |
|--------|-----|--------|
| GitLens extension | `extension-GitKraken` | Cursor extension (no manual JSON) |
| gk CLI | `GitKraken` | `~/.cursor/mcp.json` via `gk mcp install cursor` |

We have successfully installed the GitKraken MCP server configuration for **11 developer clients** on your machine:
1.  **Cursor**
2.  **Claude Desktop**
3.  **Claude Code**
4.  **VS Code**
5.  **VS Code Insiders**
6.  **Zed**
7.  **Trae**
8.  **GitHub Copilot CLI**
9.  **Gemini CLI**
10. **Codex**
11. **Antigravity**

### How AI Agents Use It
When you are chatting with an AI agent in one of these editors, you can now ask questions like:
*   *"What issues are currently assigned to me in GitHub?"*
*   *"Draft a pull request to merge my branch into dev."*
*   *"List all the PRs I need to review."*
*   *"Create a new issue to track the dashboard styling fix."*

The AI will automatically invoke the GitKraken MCP tools behind the scenes to fetch data or execute actions, keeping you entirely in your coding flow.

---

## 🛠️ CLI Subcommand Reference

Here are the most useful GitKraken CLI commands to run in your terminal:

### 1. Workspaces (`gk ws` or `gk workspace`)
Workspaces group related repositories together so you can run actions on them at once.
*   `gk workspace list` — Show all configured workspaces.
*   `gk workspace set modme-ui` — Set the active workspace to this project.
*   `gk workspace info` — Get details about the active workspace and its repositories.
*   `gk workspace clone` — Clone all repositories in the workspace to a target folder.

### 2. AI Subcommands (`gk ai`)
Leverage GitKraken's built-in AI directly from the CLI.
*   `gk ai commit` — Generate and stage a commit with an AI-generated commit message based on your git diff.
    *   *Add `-d` or `--add-description` to append a detailed description.*
*   `gk ai explain commit <SHA>` — Get a natural language explanation of the changes in a specific commit.
*   `gk ai explain branch` — Explains the differences and purpose of the current branch compared to the base.
*   `gk ai changelog` — Automatically generate a clean markdown changelog of changes between two branches or commits.
*   `gk ai pr create` — Walk through an interactive, AI-assisted workflow to create a pull request with generated summaries.

### 3. Issues & Pull Requests (`gk issue` / `gk pr`)
Interact with GitHub/GitLab issues and PRs without opening your browser.
*   `gk issue list` — List issues in the current workspace/repository.
*   `gk issue create` — Create a new issue interactively.
*   `gk pr list` — List active pull requests.
*   `gk pr create` — Spin up a new pull request.
*   `gk pr create-review` — Review and comment/approve a PR directly.

### 4. Graph & System Info
*   `gk graph` — Display an interactive, rich terminal-based commit graph of the current repository.
*   `gk whoami` — Show currently logged-in account, organization, subscription type, and active providers.
*   `gk setup` — Output diagnostic details about your Git configuration and CLI environment.

---

## 💡 "Vibe-Coding" Workflow Tips

1.  **Restart Your Editor/Terminal:** To ensure that the path updates take effect, close and reopen your VS Code, Cursor, or terminal application.
2.  **Generate Clean Commits:** Instead of writing lazy commit messages, run `gk ai commit` when you finish a chunk of code. The CLI will inspect your unstaged/staged files, write a high-quality commit message, and stage/commit them for you.
3.  **Collaborative PR Reviews:** Use `gk pr list` to see what needs attention, and review them using AI explanations to speed up onboarding onto teammate branches.
4.  **Terminal Graph:** Use `gk graph` instead of standard `git log` to get a beautiful, GitKraken-style branch graph printed directly in your terminal.
