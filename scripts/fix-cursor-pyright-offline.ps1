#Requires -Version 5.1
<#
.SYNOPSIS
  Clears Cursor mass-disabled extensions and reinstalls the Python/Pyright stack.
  MUST run only when Cursor is fully quit (no Cursor.exe processes).
#>
[CmdletBinding()]
param(
  [switch]$WaitForCursorExit,
  [int]$WaitSeconds = 600
)

$ErrorActionPreference = "Stop"
$statusPath = Join-Path $env:TEMP "fix-cursor-pyright-status.json"

function Write-Status([string]$Phase, [hashtable]$Data = @{}) {
  $payload = @{
    phase     = $Phase
    timestamp = (Get-Date).ToString("o")
    data      = $Data
  } | ConvertTo-Json -Depth 6
  Set-Content -Path $statusPath -Value $payload -Encoding UTF8
  Write-Host "[$Phase] $($Data | ConvertTo-Json -Compress)"
}

function Test-CursorRunning {
  return $null -ne (Get-Process -Name "Cursor" -ErrorAction SilentlyContinue)
}

if ($WaitForCursorExit) {
  Write-Status "waiting_for_cursor_exit" @{ maxSeconds = $WaitSeconds }
  $deadline = (Get-Date).AddSeconds($WaitSeconds)
  while (Test-CursorRunning) {
    if ((Get-Date) -gt $deadline) {
      Write-Status "timeout" @{ message = "Cursor still running after wait" }
      exit 2
    }
    Start-Sleep -Seconds 3
  }
  # Brief settle so shutdown flush can finish
  Start-Sleep -Seconds 5
  if (Test-CursorRunning) {
    Write-Status "cursor_restarted" @{ message = "Cursor came back during settle; abort" }
    exit 3
  }
}

if (Test-CursorRunning) {
  Write-Status "aborted_cursor_running" @{ message = "Quit Cursor fully, then re-run this script" }
  exit 1
}

Write-Status "clearing_disabled"

$db = Join-Path $env:APPDATA "Cursor\User\globalStorage\state.vscdb"
if (-not (Test-Path $db)) { throw "Missing state.vscdb: $db" }

$bak = "$db.bak-pyright-offline-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $db $bak -Force

Add-Type -AssemblyName System.Data
# Use Python for reliable sqlite update
$py = @"
import sqlite3, json, shutil, os
db = r'''$db'''
con = sqlite3.connect(db)
key = 'extensionsIdentifiers/disabled'
row = con.execute('SELECT value FROM ItemTable WHERE key=?', (key,)).fetchone()
before = json.loads(row[0]) if row and row[0] else []
con.execute('UPDATE ItemTable SET value=? WHERE key=?', (json.dumps([]), key))
con.commit()
con.close()
con2 = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
after = json.loads(con2.execute('SELECT value FROM ItemTable WHERE key=?', (key,)).fetchone()[0])
print(json.dumps({'backup': r'''$bak''', 'beforeCount': len(before), 'afterCount': len(after)}))
"@
$pyOut = & python -c $py
Write-Status "disabled_cleared" (@{ raw = $pyOut } )

Write-Status "reinstalling_extensions"
$exts = @(
  "anysphere.cursorpyright",
  "ms-python.python",
  "ms-python.debugpy"
)
foreach ($id in $exts) {
  & cursor --uninstall-extension $id 2>&1 | Out-Host
}
foreach ($id in @("ms-python.python", "ms-python.debugpy", "anysphere.cursorpyright")) {
  & cursor --install-extension $id --force 2>&1 | Out-Host
}

# Remove obsolete orphan python 2025.4.0 if present
$orphan = Join-Path $env:USERPROFILE ".cursor\extensions\ms-python.python-2025.4.0"
if (Test-Path $orphan) {
  Remove-Item -Recurse -Force $orphan -ErrorAction SilentlyContinue
  Write-Status "removed_orphan" @{ path = $orphan }
}

Write-Status "done" @{
  next = "Reopen Cursor and verify: Cursor Pyright Restart Server, Output max-old-space-size=1024"
}
exit 0
