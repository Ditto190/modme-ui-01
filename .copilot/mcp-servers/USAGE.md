How to use the MCP servers starter script

- Place per-server start scripts in `.copilot/mcp-servers/`.
  - Supported types: `.ps1`, `.bat`/`.cmd`, `.exe`, `.sh` (if `bash` is available).
  - Name them clearly, e.g. `start-adk-agent.ps1`, `start-github-mcp.bat`.
- The workspace task `Start MCP servers if stopped` (in `.vscode/tasks.json`) runs on window reload and can be triggered manually via `Terminal → Run Task...`.
- Logs are written to `.logs/mcp-<scriptname>.log`.

## Examples

### MCP "Everything" Server (Reference Implementation)

The project includes starter scripts for the official MCP "everything" server:

- **PowerShell**: `.copilot/mcp-servers/start-everything.ps1`
- **Bash**: `.copilot/mcp-servers/start-everything.sh`

This is a comprehensive reference implementation that demonstrates all MCP protocol features. See [`docs/MCP_EVERYTHING_SERVER.md`](../../docs/MCP_EVERYTHING_SERVER.md) for details.

### Custom Server Scripts

- PowerShell server script: `.copilot/mcp-servers/start-agent.ps1`
- Batch wrapper: `.copilot/mcp-servers/start-agent.bat`

## Notes

- The starter uses command-line inspection to detect already-running processes. If your server launches child processes or detaches, adjust your script to write a PID file and modify the starter to use that.
- On non-Windows machines, you can still run the starter script with `pwsh` if PowerShell Core is installed. For POSIX-only setups, create a sibling `scripts/start-mcp-servers.sh` and a platform-specific task.

