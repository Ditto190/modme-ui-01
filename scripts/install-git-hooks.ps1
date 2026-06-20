#Requires -Version 5.1
<#
.SYNOPSIS
  Install repo git hooks (pre-commit checks) into .git/hooks/.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$SourceHook = Join-Path $RepoRoot '.githooks\pre-commit'
$DestHook = Join-Path $RepoRoot '.git\hooks\pre-commit'

if (-not (Test-Path $SourceHook)) {
    throw "Missing hook template: $SourceHook"
}

if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
    throw "Not a git repository: $RepoRoot"
}

Copy-Item -Path $SourceHook -Destination $DestHook -Force
Write-Host "[ok] installed pre-commit hook -> .git/hooks/pre-commit"
Write-Host "     runs: node scripts/pre-commit-checks.mjs"
