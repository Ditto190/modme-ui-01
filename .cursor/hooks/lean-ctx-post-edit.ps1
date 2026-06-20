# Advisory hook: after next-forge TS edits, print a one-line verify hint (never blocks).
# Cursor: wire in hooks.json.example with afterFileEdit + failClosed: false
param(
  [string]$FilePath = $env:CURSOR_FILE_PATH
)

$ErrorActionPreference = 'SilentlyContinue'

if ($FilePath -notmatch '[\\/]next-forge[\\/].*\.(ts|tsx)$') {
  exit 0
}

Write-Host '[lean-ctx hook] next-forge file changed — run: lean-ctx -c "yarn check:forge" (from repo root)' -ForegroundColor DarkCyan
exit 0
