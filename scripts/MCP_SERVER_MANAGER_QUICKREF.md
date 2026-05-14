# MCP Server Manager - Quick Reference

## 🚀 Start All Servers

```bash
npm run mcp:start
```

## 📖 Common Commands

| Command                     | Description                   |
| --------------------------- | ----------------------------- |
| `npm run mcp:start`         | Start all MCP servers         |
| `npm run mcp:start:force`   | Force restart (kill existing) |
| `npm run mcp:start:wait`    | Wait for health checks        |
| `npm run mcp:start:verbose` | Show detailed discovery info  |

## 🔍 What Gets Started?

1. **Scripts** in `.copilot/mcp-servers/` (`.ps1`, `.sh`, `.bat`)
2. **Python servers** in `agent/` (`*_mcp_server.py`)
3. **ChromaDB** (`scripts/start_chroma_server.py`) on port 8001
4. **Configured** servers from `mcp_config.json`

## 📝 Logs Location

All logs: `.logs/mcp-*.log`

```bash
# View logs
Get-Content .logs\mcp-<name>.log -Wait        # PowerShell
tail -f .logs/mcp-<name>.log                   # Bash
```

## 🆕 Add New Server

### Option 1: Simple Script

```bash
# Create in .copilot/mcp-servers/
echo "node my-server.js" > .copilot/mcp-servers/my-server.sh
chmod +x .copilot/mcp-servers/my-server.sh
```

### Option 2: Python MCP

```python
# Create agent/my_custom_mcp_server.py
if __name__ == "__main__":
    # Server implementation
    pass
```

### Option 3: Config File

```json
// Add to any mcp_config.json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"]
    }
  }
}
```

## ⚙️ VS Code Task

**Run:** `Ctrl+Shift+P` → "Tasks: Run Task" → "Start All MCP Servers"

## 🔧 Troubleshooting

| Issue               | Solution                                                                           |
| ------------------- | ---------------------------------------------------------------------------------- |
| Port in use         | `netstat -ano \| findstr :8001` (Windows)<br>`lsof -i :8001` (Linux/macOS)         |
| Script not found    | Check extension matches: `.ps1`, `.sh`, `.bat`, `.cmd`                             |
| Permission denied   | `chmod +x script.sh` (Linux/macOS)<br>`Set-ExecutionPolicy RemoteSigned` (Windows) |
| Server not starting | Check logs: `.logs/mcp-<name>.log`                                                 |

## 📊 Exit Codes

- `0` - All servers started successfully
- `1` - One or more servers failed to start

## 🎯 Features

- ✅ Auto-discovers all MCP servers
- ✅ Skips already-running servers
- ✅ Health checks for known ports
- ✅ Cross-platform (Windows/Linux/macOS)
- ✅ Comprehensive logging
- ✅ Color-coded output

## 📚 Full Documentation

See [MCP_SERVER_MANAGER_README.md](./MCP_SERVER_MANAGER_README.md) for complete documentation.

---

**Created:** February 8, 2026
**Version:** 1.0.0
