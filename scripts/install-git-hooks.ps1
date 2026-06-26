#Requires -Version 5.1
<#
.SYNOPSIS
  Install repo git hooks (pre-commit checks) into .git/hooks/.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$SourcePreCommit = Join-Path $RepoRoot '.githooks\pre-commit'
$SourcePrePush = Join-Path $RepoRoot '.githooks\pre-push'
$DestPreCommit = Join-Path $RepoRoot '.git\hooks\pre-commit'
$DestPrePush = Join-Path $RepoRoot '.git\hooks\pre-push'

if (-not (Test-Path $SourcePreCommit)) {
    throw "Missing hook template: $SourcePreCommit"
}

if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
    throw "Not a git repository: $RepoRoot"
}

$hooksDir = Join-Path $RepoRoot '.git\hooks'
if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
}

Copy-Item -Path $SourcePreCommit -Destination $DestPreCommit -Force
Write-Host "[ok] installed pre-commit hook -> .git/hooks/pre-commit"

if (Test-Path $SourcePrePush) {
    Copy-Item -Path $SourcePrePush -Destination $DestPrePush -Force
    Write-Host "[ok] installed pre-push hook -> .git/hooks/pre-push"
}

Write-Host "     pre-commit: node scripts/pre-commit-checks.mjs"
Write-Host "     pre-push:   repo-alignment-doctor + pre-commit-checks --full"
