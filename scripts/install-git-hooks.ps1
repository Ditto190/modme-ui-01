#Requires -Version 5.1
<#
.SYNOPSIS
  Install repo git hooks from .githooks/ into .git/hooks/.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$HooksDir = Join-Path $RepoRoot '.githooks'
$DestDir = Join-Path $RepoRoot '.git\hooks'
$SourcePreCommit = Join-Path $RepoRoot '.githooks\pre-commit'
$SourcePrePush = Join-Path $RepoRoot '.githooks\pre-push'
$DestPreCommit = Join-Path $RepoRoot '.git\hooks\pre-commit'
$DestPrePush = Join-Path $RepoRoot '.git\hooks\pre-push'

if (-not (Test-Path $HooksDir)) {
    throw "Missing hooks directory: $HooksDir"
}

if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
    throw "Not a git repository: $RepoRoot"
}

if (-not (Test-Path $DestDir)) {
    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
}

$hookNames = @('pre-commit', 'commit-msg', 'pre-push')
foreach ($name in $hookNames) {
    $source = Join-Path $HooksDir $name
    if (-not (Test-Path $source)) {
        Write-Host "[skip] $name (no template)" -ForegroundColor DarkYellow
        continue
    }
    Copy-Item -Path $source -Destination (Join-Path $DestDir $name) -Force
    Write-Host "[ok] installed $name -> .git/hooks/$name"
}

Write-Host ''
Write-Host 'Hooks:' -ForegroundColor Cyan
Write-Host '  pre-commit  -> node scripts/pre-commit-checks.mjs (+ main/master guard)'
Write-Host '  commit-msg  -> conventional commit warn-only'
Write-Host '  pre-push    -> node scripts/pre-push-checks.mjs (path-filtered verify)'
