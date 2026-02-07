# MCP Server Manager

Unified tool to discover and start all MCP (Model Context Protocol) servers in the workspace.

## Overview

The MCP Server Manager automatically discovers and starts:

1. **Script-based servers** in `.copilot/mcp-servers/` (`.ps1`, `.sh`, `.bat`, `.cmd`)
2. **Python MCP servers** in `agent/` (files matching `*_mcp_server.py`)
3. **ChromaDB server** for semantic search (`scripts/start_chroma_server.py`)
4. **Configured servers** from `mcp_config.json` files

## Quick Start

### Using NPM Scripts (Recommended)

```bash
# Start all MCP servers
npm run mcp:start

# Force restart all servers (even if already running)
npm run mcp:start:force

# Start and wait for health checks
npm run mcp:start:wait

# Verbose output
npm run mcp:start:verbose
```

### Direct Execution

**PowerShell (Windows):**
```powershell
.\scripts\start-all-mcp-servers.ps1
.\scripts\start-all-mcp-servers.ps1 -Force
.\scripts\start-all-mcp-servers.ps1 -WaitForReady
.\scripts\start-all-mcp-servers.ps1 -Verbose
```

**Bash (Linux/macOS/WSL):**
```bash
./scripts/start-all-mcp-servers.sh
./scripts/start-all-mcp-servers.sh --force
./scripts/start-all-mcp-servers.sh --wait
./scripts/start-all-mcp-servers.sh --verbose
```

## Features

### 🔍 Auto-Discovery
- Scans multiple locations for MCP servers
- Detects different server types automatically
- Finds configuration files recursively

### ⚡ Smart Startup
- Checks if servers are already running (by port or process)
- Skips already-running servers (unless `--force` is used)
- Supports parallel startup (experimental)

### 🏥 Health Checks
- Waits for servers with known ports to be ready
- Configurable timeout (30 seconds default)
- Reports server readiness status

### 📝 Comprehensive Logging
- All server output goes to `.logs/mcp-<name>.log`
- Color-coded console output
- Detailed summary report

### 🌐 Cross-Platform
- PowerShell script for Windows
- Bash script for Linux/macOS/WSL
- NPM scripts work on all platforms

## Server Discovery Logic

### 1. Script-Based Servers

**Location:** `.copilot/mcp-servers/`

**Supported extensions:** `.ps1`, `.sh`, `.bat`, `.cmd`, `.exe`

**Example:**
```
.copilot/mcp-servers/
  ├── start-everything.ps1      ← Discovered
  ├── start-everything.sh       ← Discovered
  └── README.md                 ← Ignored
```

### 2. Python MCP Servers

**Location:** `agent/`

**Pattern:** Files matching `*_mcp_server.py`

**Known servers:**
- `journal_mcp_server.py` (port 8002)
- Custom servers you create

**Example:**
```python
# agent/my_custom_mcp_server.py
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8003)
    args = parser.parse_args()
    # ... server implementation
```

### 3. ChromaDB Server

**Location:** `scripts/start_chroma_server.py`

**Port:** 8001 (default)

**Purpose:** Semantic search and vector storage

### 4. Configured Servers

**Location:** Any `mcp_config.json` file in the repository

**Format:**
```json
{
  "mcpServers": {
    "smart-coding-mcp": {
      "command": "npx",
      "args": ["-y", "smart-coding-mcp", "--workspace", "."]
    }
  }
}
```

## Command-Line Options

### PowerShell

| Option | Description |
|--------|-------------|
| `-Force` | Restart servers even if already running |
| `-WaitForReady` | Wait for health checks (servers with ports) |
| `-Verbose` | Show detailed output including discovery info |
| `-Parallel` | Start servers in parallel (experimental) |

### Bash

| Option | Description |
|--------|-------------|
| `--force`, `-f` | Restart servers even if already running |
| `--wait`, `-w` | Wait for health checks (servers with ports) |
| `--verbose`, `-v` | Show detailed output including discovery info |
| `--help`, `-h` | Show help message |

## Output Example

```
🚀 MCP Server Manager
============================================================

ℹ️  Scanning .copilot/mcp-servers/ for startup scripts...
✅ Found 2 MCP startup scripts
ℹ️  Scanning agent/ for Python MCP servers...
✅ Found 1 Python MCP servers
ℹ️  Checking for ChromaDB server...
✅ Found ChromaDB server (port 8001)

📊 Total servers discovered: 4

🔧 start-everything (script)
✅ Started successfully

🔧 journal (Python MCP)
✅ Already running

🔧 chroma-db (HTTP)
✅ Started successfully
ℹ️  Waiting for port 8001 to be ready...
✅ Server is ready on port 8001!

============================================================
📊 MCP Server Startup Summary
============================================================
✅ Started: 2
ℹ️  Already running: 1
❌ Failed: 0

ℹ️  📁 Logs directory: d:\Github_Projects\Modme_2026\modme-ui-01-test-worktree\.logs

✅ MCP servers are ready!
```

## Log Files

All server output is logged to `.logs/`:

```
.logs/
  ├── mcp-start-everything.log
  ├── mcp-journal.log
  ├── mcp-chroma-db.log
  └── mcp-smart-coding-mcp.log
```

**Tip:** Monitor logs in real-time:
```bash
# PowerShell
Get-Content .logs\mcp-journal.log -Wait

# Bash
tail -f .logs/mcp-journal.log
```

## Creating New MCP Servers

### Option 1: Script in `.copilot/mcp-servers/`

Create any executable script:

```bash
# .copilot/mcp-servers/my-server.sh
#!/bin/bash
echo "Starting my MCP server..."
node my-mcp-server.js
```

**Auto-discovered on next run!**

### Option 2: Python MCP Server in `agent/`

Create a file matching `*_mcp_server.py`:

```python
# agent/my_custom_mcp_server.py
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8003)
    args = parser.parse_args()
    
    print(f"Starting custom MCP server on port {args.port}")
    # ... implementation

if __name__ == "__main__":
    main()
```

**Auto-discovered on next run!**

### Option 3: Add to `mcp_config.json`

```json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "node",
      "args": ["path/to/server.js", "--port", "9000"]
    }
  }
}
```

**Auto-discovered on next run!**

## Integration with VS Code

### Task Definition

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start All MCP Servers",
      "type": "npm",
      "script": "mcp:start",
      "problemMatcher": [],
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Restart All MCP Servers",
      "type": "npm",
      "script": "mcp:start:force",
      "problemMatcher": []
    }
  ]
}
```

**Usage:** `Ctrl+Shift+P` → "Tasks: Run Task" → "Start All MCP Servers"

### Keyboard Shortcut

Add to `.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+m",
    "command": "workbench.action.tasks.runTask",
    "args": "Start All MCP Servers"
  }
]
```

## Troubleshooting

### Server Not Starting

1. **Check logs:** `.logs/mcp-<server-name>.log`
2. **Verify script is executable:**
   ```bash
   chmod +x .copilot/mcp-servers/my-script.sh
   ```
3. **Check dependencies:**
   - Python servers need venv activated
   - Node servers need `npm install`

### Port Already in Use

```bash
# Find what's using the port
netstat -ano | findstr :8001  # Windows
lsof -i :8001                  # Linux/macOS

# Kill the process
taskkill /PID <PID> /F         # Windows
kill -9 <PID>                  # Linux/macOS
```

### Script Not Discovered

- Ensure file has correct extension (`.ps1`, `.sh`, `.bat`, `.cmd`)
- Python MCP servers must end with `_mcp_server.py`
- Check file is in correct directory
- Run with `--verbose` to see discovery details

### Permission Issues (Windows)

```powershell
# Fix PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Advanced Usage

### Programmatic Start

```javascript
// Node.js
const { execSync } = require('child_process');
execSync('npm run mcp:start:wait', { stdio: 'inherit' });
```

```python
# Python
import subprocess
subprocess.run(['npm', 'run', 'mcp:start:wait'], check=True)
```

### Health Check Example

```bash
# Wait for server to be ready
npm run mcp:start:wait

# Then test
curl http://localhost:8001/health
```

## Related Scripts

- `scripts/start-mcp-servers.ps1` - Original launcher (still works)
- `scripts/start-mcp-servers.sh` - Original bash launcher
- `.copilot/mcp-servers/start-everything.ps1` - Example server script

## Future Enhancements

- [ ] Web dashboard for server status
- [ ] Stop/restart individual servers
- [ ] Server dependency management
- [ ] Automated health checks
- [ ] Configuration file per server
- [ ] Docker container support

## Contributing

To add a new server type:

1. Update discovery logic in both `.ps1` and `.sh` versions
2. Add starter function for the new type
3. Update this README
4. Test on both Windows and Linux

## License

Same as parent project.
