# VS Code / Cursor integrated terminal entry — sources modme-session -Phase terminal.
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
& (Join-Path $PSScriptRoot 'modme-session.ps1') -Phase terminal -RepoRoot $RepoRoot
