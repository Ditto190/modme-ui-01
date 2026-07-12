# Monorepo_ModMe — Copy gitignored bootstrap files from main checkout into a worktree.
# Reads patterns from .worktreeinclude; skips .worktreeexclude (dev-branch config mirror).

param(
  [Parameter(Mandatory = $true)]
  [string]$SourceRoot,

  [Parameter(Mandatory = $true)]
  [string]$TargetRoot,

  [switch]$ChangedOnly
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir

function Get-WorktreePatterns {
  param(
    [string]$FilePath
  )

  if (-not (Test-Path $FilePath)) {
    return @()
  }

  $patterns = @()
  foreach ($line in Get-Content $FilePath) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
    if ($trimmed.StartsWith('#')) { continue }
    $patterns += $trimmed
  }
  return $patterns
}

function Test-PathMatchesPattern {
  param(
    [string]$RelativePath,
    [string[]]$Patterns
  )

  $normalized = $RelativePath -replace '\\', '/'
  foreach ($pattern in $Patterns) {
    $glob = $pattern -replace '\\', '/'
    if ($glob.EndsWith('/**')) {
      $prefix = $glob.Substring(0, $glob.Length - 3)
      if ($normalized -eq $prefix -or $normalized.StartsWith("$prefix/")) {
        return $true
      }
    }
    elseif ($glob.EndsWith('/*')) {
      $prefix = $glob.Substring(0, $glob.Length - 2)
      if ($normalized.StartsWith("$prefix/")) {
        return $true
      }
    }
    elseif ($glob -match '[\*\?]') {
      if ($normalized -like ($glob -replace '/', '\')) {
        return $true
      }
      if ($normalized -like $glob) {
        return $true
      }
    }
    elseif ($normalized -eq $glob) {
      return $true
    }
  }
  return $false
}

function Should-CopyItem {
  param(
    [string]$Source,
    [string]$Target
  )

  if (-not (Test-Path $Source)) {
    return $false
  }
  if (-not $ChangedOnly) {
    return $true
  }
  if (-not (Test-Path $Target)) {
    return $true
  }
  $sourceTime = (Get-Item $Source).LastWriteTimeUtc
  $targetTime = (Get-Item $Target).LastWriteTimeUtc
  return $sourceTime -gt $targetTime
}

$includePath = Join-Path $RepoRoot '.worktreeinclude'
$excludePath = Join-Path $RepoRoot '.worktreeexclude'
$includePatterns = Get-WorktreePatterns -FilePath $includePath
$excludePatterns = Get-WorktreePatterns -FilePath $excludePath

if ($includePatterns.Count -eq 0) {
  Write-Warning '.worktreeinclude missing or empty; using legacy env paths only'
  $includePatterns = @(
    '.env',
    'GenerativeUI_monorepo/apps/agent-server/.env',
    'GenerativeUI_monorepo/apps/web-dashboard/.env.local',
    'next-forge/packages/database/.env',
    'yarn.lock',
    '.yarnrc.yml',
    '.yarn/',
    'next-forge/bun.lock',
    'GenerativeUI_monorepo/apps/agent-server/poetry.lock',
    '.worktree-ports.env',
    '.copilot/workspace.generated.env'
  )
}

foreach ($relativePath in $includePatterns) {
  if (Test-PathMatchesPattern -RelativePath $relativePath -Patterns $excludePatterns) {
    Write-Host "   Skipped $relativePath (worktreeexclude)" -ForegroundColor DarkGray
    continue
  }

  $source = Join-Path $SourceRoot $relativePath
  $target = Join-Path $TargetRoot $relativePath
  $isDirectory = $relativePath.EndsWith('/')

  if ($isDirectory) {
    $dirPath = $relativePath.TrimEnd('/')
    $source = Join-Path $SourceRoot $dirPath
    $target = Join-Path $TargetRoot $dirPath
    if (-not (Should-CopyItem -Source $source -Target $target)) {
      Write-Host "   Up-to-date $dirPath/" -ForegroundColor DarkGray
      continue
    }
    if (Test-Path $source) {
      if (Test-Path $target) {
        Remove-Item $target -Recurse -Force
      }
      Copy-Item $source $target -Recurse -Force
      Write-Host "   Copied $dirPath/" -ForegroundColor Green
    }
    else {
      Write-Host "   Skipped $dirPath/ (not present in source)" -ForegroundColor DarkYellow
    }
    continue
  }

  if (-not (Should-CopyItem -Source $source -Target $target)) {
    Write-Host "   Up-to-date $relativePath" -ForegroundColor DarkGray
    continue
  }

  if (Test-Path $source) {
    $targetDir = Split-Path -Parent $target
    if ($targetDir -and -not (Test-Path $targetDir)) {
      New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    }
    Copy-Item $source $target -Force
    Write-Host "   Copied $relativePath" -ForegroundColor Green
  }
  else {
    Write-Host "   Skipped $relativePath (not present in source)" -ForegroundColor DarkYellow
  }
}
