Session Logger hook

This repository contains a small session logger hook implemented in PowerShell
for Windows development environments. It logs session start/end events and
prompt events as JSON lines under logs/copilot/.

Configuration
- config.json controls tracked files and log directory.
- By default it tracks three UniversalWorkbench docs in this repo.

Usage
- Start a session (generates a session id and writes sessionStart):
  .\.github\hooks\session-logger\session-logger.ps1 start

- End a session:
  .\.github\hooks\session-logger\session-logger.ps1 end <session-id>

- Log a prompt event:
  .\.github\hooks\session-logger\session-logger.ps1 prompt <session-id> "User's prompt text"

Notes
- The hook is implemented in PowerShell for Windows compatibility. If your CI
  runner uses bash, you can call PowerShell core (pwsh) or re-implement a shell
  shim as needed.
- Logs are written to the repository-local logs/copilot/ directory and are
  excluded from git via .gitignore.
