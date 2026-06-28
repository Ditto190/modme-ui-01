# Load project-local lean-ctx data directories (ModMe multi-agent)
# Usage (from repo root):
#   . .\scripts\load-lean-ctx-env.ps1
#   yarn lean-ctx:ensure   # calls this automatically
#
# Overrides XDG defaults so archive, knowledge, cache, journal, and tee
# land under the repo instead of ~/.local/share/lean-ctx.

param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$DataDir = Join-Path $RepoRoot 'data/lean-ctx'
$StateDir = Join-Path $RepoRoot 'logs/lean-ctx'
$CacheDir = Join-Path $DataDir 'cache'
$ArchiveDir = Join-Path $DataDir 'archive'

foreach ($dir in @($DataDir, $StateDir, $CacheDir, $ArchiveDir)) {
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
}

$env:LEAN_CTX_DATA_DIR = $DataDir
$env:LEAN_CTX_STATE_DIR = $StateDir
$env:LEAN_CTX_CACHE_DIR = $CacheDir

# Workspace trust (lean-ctx 3.8+): honour security-sensitive .lean-ctx.toml overrides
# without per-session `lean-ctx trust`. Pin repo root for worktrees/subfolders.
if (-not $env:LEAN_CTX_TRUST_WORKSPACE) {
  $env:LEAN_CTX_TRUST_WORKSPACE = '1'
}
$trustedRoots = @($RepoRoot)
$worktreeDev = Join-Path (Split-Path -Parent $RepoRoot) 'Monorepo_ModMe-dev/dev'
if (Test-Path -LiteralPath $worktreeDev) {
  $trustedRoots += (Resolve-Path -LiteralPath $worktreeDev).Path
}
$env:LEAN_CTX_TRUSTED_ROOTS = ($trustedRoots -join ';')

# Optional task profile (see data/lean-ctx-task-profiles.toml.example)
if ($env:LEAN_CTX_PROFILE) {
  $profileFile = Join-Path $RepoRoot 'data/lean-ctx-task-profiles.toml'
  $profileExample = Join-Path $RepoRoot 'data/lean-ctx-task-profiles.toml.example'
  if (-not (Test-Path $profileFile) -and (Test-Path $profileExample)) {
    Write-Verbose "LEAN_CTX_PROFILE=$($env:LEAN_CTX_PROFILE) - copy profile example to data/lean-ctx-task-profiles.toml"
  }
}

[pscustomobject]@{
  DataDir        = $DataDir
  StateDir       = $StateDir
  CacheDir       = $CacheDir
  ArchiveDir     = $ArchiveDir
  ActiveProfile  = $env:LEAN_CTX_PROFILE
}
