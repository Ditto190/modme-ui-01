# Pre-flight checks for ModMe multi-agent worktrees (human + agent friendly).
# Usage: .\scripts\worktree-doctor.ps1 [-Fix] [-Json] [-Quiet]
#
# Options:
#   -Fix    Copy yarn.lock/.yarn from main checkout when missing (worktrees only)
#   -Json   Machine-readable output
#   -Quiet  Only print summary line (exit code still reflects status)

param(
  [switch]$Fix,
  [switch]$Json,
  [switch]$Quiet,
  [string]$RepoRoot = ''
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib/worktree-context.ps1")

function Show-Help {
  @"
worktree-doctor - validate checkout, yarn, ports, gh, and Supabase env

Options:
  -Fix        Copy yarn.lock and .yarn/ from main checkout when missing
  -Json       Output JSON (checks array + summary)
  -Quiet      Summary line only
  -RepoRoot   Git repo root (default: git rev-parse --show-toplevel from cwd)

Exit codes:
  0 = all checks passed (or only warnings)
  1 = one or more errors

Examples:
  cd ..\Monorepo_ModMe-dev\dev-agent-cursor-my-task
  .\scripts\worktree-doctor.ps1
  .\scripts\worktree-doctor.ps1 -Fix -Json
  yarn worktree:doctor
  yarn worktree:doctor -- -Fix -Json
"@
}

if ($args -contains '-Help' -or $args -contains '--help' -or $args -contains '-h') {
  Show-Help
  exit 0
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (git rev-parse --show-toplevel 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
  }
}

$ctx = Get-WorktreeContext -RepoRoot $RepoRoot
$repo = $ctx.RepoRoot
$checks = @()

function Add-Check {
  param(
    [string]$Id,
    [ValidateSet('ok', 'warn', 'error')]
    [string]$Status,
    [string]$Message,
    [string]$FixHint = ''
  )
  $script:checks += [PSCustomObject]@{
    id       = $Id
    status   = $Status
    message  = $Message
    fix_hint = $FixHint
  }
}

# Checkout context
if ($ctx.IsWorktree) {
  Add-Check 'checkout' 'ok' "Worktree checkout ($repo)" ''
}
else {
  Add-Check 'checkout' 'warn' "Main checkout - feature work belongs under $($ctx.DevRootPath)" '.\scripts\migrate-main-to-worktree.ps1 -Name my-task -Owner cursor -FromCurrentBranch'
}

# Branch naming
if ($ctx.Branch -match '^feature/(cursor|copilot|claude|antigravity|human)/') {
  Add-Check 'branch' 'ok' "Branch $($ctx.Branch)" ''
}
elseif ($ctx.IsWorktree -and $ctx.Branch -eq 'dev') {
  Add-Check 'branch' 'warn' 'On dev branch in worktree - expected feature/owner/task' ''
}
elseif ($ctx.IsMainCheckout) {
  Add-Check 'branch' 'warn' "Main checkout on branch $($ctx.Branch)" ''
}
else {
  Add-Check 'branch' 'warn' "Branch $($ctx.Branch) (non-standard for agent worktrees)" ''
}

# yarn.lock (required for yarn scripts in worktrees)
$yarnLock = Join-Path $repo 'yarn.lock'
if (Test-Path $yarnLock) {
  Add-Check 'yarn_lock' 'ok' 'yarn.lock present' ''
}
else {
  $hint = if ($ctx.IsWorktree) {
    ".\scripts\worktree-doctor.ps1 -Fix  # or copy from main via worktree-copy-env.ps1"
  } else {
    'Run yarn install at repo root on main checkout'
  }
  Add-Check 'yarn_lock' 'error' 'Missing yarn.lock - yarn scripts will fail' $hint
  if ($Fix -and $ctx.IsWorktree) {
    & (Join-Path $PSScriptRoot 'worktree-copy-env.ps1') -SourceRoot $ctx.MainRepoRoot -TargetRoot $repo
    if (Test-Path $yarnLock) {
      $checks = $checks | Where-Object { $_.id -ne 'yarn_lock' }
      Add-Check 'yarn_lock' 'ok' 'yarn.lock copied from main checkout' ''
    }
  }
}

# Ports file
$portsFile = Join-Path $repo '.worktree-ports.env'
if ($ctx.IsWorktree) {
  if (Test-Path $portsFile) {
    Add-Check 'ports' 'ok' '.worktree-ports.env present' ''
  }
  else {
    Add-Check 'ports' 'error' 'Missing .worktree-ports.env' (".\scripts\worktree-allocate-ports.ps1 -WorktreePath `"$repo`"")
  }
}
else {
  Add-Check 'ports' 'ok' 'Main checkout uses launch-manifest defaults (no .worktree-ports.env required)' ''
}

# Git hooks
$hookPath = Join-Path $repo '.git/hooks/pre-commit'
if (Test-Path $hookPath) {
  Add-Check 'hooks' 'ok' 'pre-commit hook installed' ''
}
else {
  Add-Check 'hooks' 'warn' 'pre-commit hook missing' 'yarn hooks:install'
}

# gh auth
if (Get-Command gh -ErrorAction SilentlyContinue) {
  if ($env:GH_TOKEN -or $env:GITHUB_TOKEN) {
    Add-Check 'gh' 'ok' 'gh available (GH_TOKEN/GITHUB_TOKEN set for headless PR)' ''
  }
  else {
    $authStatus = gh auth status 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
      Add-Check 'gh' 'ok' 'gh authenticated (interactive)' ''
    }
    else {
      Add-Check 'gh' 'warn' 'gh not authenticated' 'gh auth refresh -h github.com  # or set GH_TOKEN for agents'
    }
  }
}
else {
  Add-Check 'gh' 'warn' 'gh CLI not on PATH' 'Install GitHub CLI for vibe:finish PR step'
}

# Supabase env (intake / cloud)
$envFile = Join-Path $repo '.env'
$needsSupabase = @('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
$missingSupabase = @()
if (Test-Path $envFile) {
  $envText = Get-Content $envFile -Raw
  foreach ($key in $needsSupabase) {
    if ($envText -notmatch "(?m)^${key}=") { $missingSupabase += $key }
  }
  if ($missingSupabase.Count -eq 0) {
    Add-Check 'supabase_env' 'ok' 'Root .env has Supabase intake keys' ''
  }
  else {
    Add-Check 'supabase_env' 'warn' "Missing in .env: $($missingSupabase -join ', ')" `
      'See docs/supabase-cloud-setup.md - run yarn intake only from repo root'
  }
}
else {
  Add-Check 'supabase_env' 'warn' 'No root .env - run worktree-copy-env.ps1 from main checkout or copy .env.example names' ''
}

# Supabase CLI cwd hint
$forgeConfig = Join-Path $repo 'next-forge/supabase/config.toml'
if (Test-Path $forgeConfig) {
  Add-Check 'supabase_cli' 'ok' 'next-forge/supabase/config.toml found - run CLI from next-forge/' 'cd next-forge; bunx supabase status -o env'
}
else {
  Add-Check 'supabase_cli' 'warn' 'No next-forge/supabase/config.toml at expected path' ''
}

# lspmux (optional shared LSP daemon — probe via status.ps1)
$lspmuxStatusScript = Join-Path $PSScriptRoot 'lspmux\status.ps1'
if (Test-Path $lspmuxStatusScript) {
  try {
    $lspmuxJsonText = & pwsh -NoProfile -File $lspmuxStatusScript -Json 2>$null
    $lspmuxJson = $lspmuxJsonText | ConvertFrom-Json
    if (-not $lspmuxJson.installed) {
      Add-Check 'lspmux' 'warn' 'lspmux not installed (optional Rust LSP multiplexer)' `
        '.\scripts\lspmux\install.ps1  # see docs/lspmux-setup.md'
    }
    elseif (-not $lspmuxJson.daemon_ok) {
      Add-Check 'lspmux' 'warn' 'lspmux installed but daemon not reachable' `
        '.\scripts\lspmux\start-daemon.ps1'
    }
    else {
      Add-Check 'lspmux' 'ok' 'lspmux daemon reachable' ''
    }
  }
  catch {
    Add-Check 'lspmux' 'warn' 'Could not probe lspmux status' '.\scripts\lspmux\status.ps1'
  }
}

# Package manager scope
if ($repo -match 'next-forge\\packages\\|next-forge/packages/') {
  Add-Check 'cwd' 'error' 'Run repo-root scripts from Monorepo_ModMe root, not next-forge/packages/*' `
    'cd (git rev-parse --show-toplevel)  # then yarn intake / yarn worktree:doctor'
}
elseif ($repo -match '\\next-forge$|/next-forge$') {
  Add-Check 'cwd' 'warn' 'In next-forge/ - use bun/npx bun for forge; yarn intake only from repo root' ''
}
else {
  Add-Check 'cwd' 'ok' 'Working directory OK for root orchestration scripts' ''
}

$errorCount = @($checks | Where-Object { $_.status -eq 'error' }).Count
$warnCount = @($checks | Where-Object { $_.status -eq 'warn' }).Count
$okCount = @($checks | Where-Object { $_.status -eq 'ok' }).Count

$summary = [PSCustomObject]@{
  repo        = $repo
  is_worktree = $ctx.IsWorktree
  branch      = $ctx.Branch
  ok          = $okCount
  warn        = $warnCount
  error       = $errorCount
  checks      = $checks
}

if ($Json) {
  $summary | ConvertTo-Json -Depth 5
}
elseif (-not $Quiet) {
  Write-Host "worktree-doctor: $repo" -ForegroundColor Cyan
  Write-Host "  branch: $($ctx.Branch)  worktree: $($ctx.IsWorktree)" -ForegroundColor DarkGray
  Write-Host ""
  foreach ($c in $checks) {
    $color = switch ($c.status) {
      'ok' { 'Green' }
      'warn' { 'Yellow' }
      'error' { 'Red' }
    }
    Write-Host "  [$($c.status)] $($c.id): $($c.message)" -ForegroundColor $color
    if ($c.fix_hint -and $c.status -ne 'ok') {
      Write-Host "        fix: $($c.fix_hint)" -ForegroundColor DarkGray
    }
  }
  Write-Host ""
  Write-Host "summary: ok=$okCount warn=$warnCount error=$errorCount" -ForegroundColor $(if ($errorCount -gt 0) { 'Red' } elseif ($warnCount -gt 0) { 'Yellow' } else { 'Green' })
}
else {
  $statusWord = if ($errorCount -gt 0) { 'FAIL' } elseif ($warnCount -gt 0) { 'WARN' } else { 'OK' }
  Write-Host "worktree-doctor: $statusWord ok=$okCount warn=$warnCount error=$errorCount branch=$($ctx.Branch)"
}

if ($errorCount -gt 0) { exit 1 }
exit 0
