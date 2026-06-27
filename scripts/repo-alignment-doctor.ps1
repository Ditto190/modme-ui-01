# Repo alignment doctor - validates git remotes, workspace layout, and doc drift.
# Usage: .\scripts\repo-alignment-doctor.ps1 [-Fix] [-Json] [-Quiet]

param(
  [switch]$Fix,
  [switch]$Json,
  [switch]$Quiet,
  [string]$RepoRoot = ''
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib/worktree-context.ps1")

$CanonicalOrigin = "https://github.com/Ditto190/modme-ui-01.git"
$ExpectedWorkspaceFolders = @(
  "next-forge",
  "GenerativeUI_monorepo"
)

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (git rev-parse --show-toplevel 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
  }
}

$ctx = Get-WorktreeContext -RepoRoot $RepoRoot
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
  Add-Check 'checkout_context' 'ok' "Worktree checkout ($($ctx.RepoRoot))" ''
}
else {
  Add-Check 'checkout_context' 'warn' "Main checkout - feature work belongs under $($ctx.DevRootPath)" '.\scripts\migrate-main-to-worktree.ps1 -Name my-task -Owner cursor'
}

# Canonical remote
$originUrl = (git -C $ctx.RepoRoot remote get-url origin 2>$null).Trim()
if ($originUrl -match 'modme-ui-01') {
  Add-Check 'remote_canonical' 'ok' "origin matches GitHub canonical ($originUrl)" ''
}
else {
  Add-Check 'remote_canonical' 'error' "origin unexpected: $originUrl" "git remote set-url origin $CanonicalOrigin"
}

# GitLab mirror remote (optional)
$gitlabUrl = ''
$remoteList = @(git -C $ctx.RepoRoot remote 2>$null)
if ($remoteList -contains 'gitlab') {
  $gitlabUrl = (git -C $ctx.RepoRoot remote get-url gitlab).Trim()
}
if ($gitlabUrl) {
  Add-Check 'gitlab_mirror' 'ok' "gitlab remote configured ($gitlabUrl)" ''
}
else {
  Add-Check 'gitlab_mirror' 'warn' 'No gitlab remote - add with git remote add gitlab YOUR_GITLAB_URL' 'See docs/repo-alignment.md'
}

# AGENTS.md conflict markers
$agentsPath = Join-Path $ctx.RepoRoot 'AGENTS.md'
if (Test-Path $agentsPath) {
  $agentsContent = Get-Content $agentsPath -Raw
  if ($agentsContent.Contains('<<<<<<<') -or $agentsContent.Contains('>>>>>>>')) {
    Add-Check 'agents_md' 'error' 'AGENTS.md has unresolved merge conflict markers' 'Resolve conflict; keep monorepo_modme body'
  }
  else {
    Add-Check 'agents_md' 'ok' 'AGENTS.md has no conflict markers' ''
  }
}
else {
  Add-Check 'agents_md' 'error' 'Missing AGENTS.md' ''
}

# workspace.code-workspace
$workspacePath = Join-Path $ctx.RepoRoot 'workspace.code-workspace'
if (Test-Path $workspacePath) {
  try {
    $ws = Get-Content $workspacePath -Raw | ConvertFrom-Json
    $paths = @($ws.folders | ForEach-Object { $_.path -replace '^\./', '' })
    $missing = @($ExpectedWorkspaceFolders | Where-Object { $_ -notin $paths })
    if ($missing.Count -eq 0) {
      Add-Check 'workspace_file' 'ok' 'workspace.code-workspace includes next-forge and GenerativeUI_monorepo' ''
    }
    else {
      Add-Check 'workspace_file' 'warn' "workspace missing folders: $($missing -join ', ')" 'Regenerate via repo-alignment-doctor.ps1 -Fix'
    }
  }
  catch {
    Add-Check 'workspace_file' 'error' "workspace.code-workspace invalid JSON: $($_.Exception.Message)" 'Fix JSON or run -Fix to regenerate template'
  }
}
else {
  Add-Check 'workspace_file' 'warn' 'Missing workspace.code-workspace' 'Run repo-alignment-doctor.ps1 -Fix'
}

# Submodule state
$gitmodulesPath = Join-Path $ctx.RepoRoot '.gitmodules'
if (Test-Path $gitmodulesPath) {
  Add-Check 'submodule_state' 'warn' '.gitmodules present - run git submodule update --init if needed' 'Or remove unused submodule entries'
}
else {
  Add-Check 'submodule_state' 'ok' 'No .gitmodules (vendor via .vendor/ zip only)' ''
}

# Vendor state
$vendorPath = Join-Path $ctx.RepoRoot '.vendor'
if (Test-Path $vendorPath) {
  Add-Check 'vendor_state' 'ok' '.vendor/ present' ''
}
else {
  Add-Check 'vendor_state' 'warn' '.vendor/ missing' '.\scripts\cursor-ai\setup.ps1'
}

# Worktree sync
$devWt = Join-Path $ctx.DevRootPath 'dev'
if (Test-Path $devWt) {
  Add-Check 'worktree_sync' 'ok' "dev worktree exists at $devWt" ''
}
else {
  Add-Check 'worktree_sync' 'warn' 'dev worktree missing' '.\scripts\init-worktrees.ps1'
}

# package.json validity
$pkgPath = Join-Path $ctx.RepoRoot 'package.json'
if (Test-Path $pkgPath) {
  $pkgRaw = Get-Content $pkgPath -Raw
  if ($pkgRaw.Contains('<<<<<<<') -or $pkgRaw.Contains('>>>>>>>')) {
    Add-Check 'package_json' 'error' 'package.json has merge conflict markers' 'Resolve conflict; keep monorepo_modme-root scripts'
  }
  else {
    try {
      $null = $pkgRaw | ConvertFrom-Json
      Add-Check 'package_json' 'ok' 'package.json is valid JSON' ''
    }
    catch {
      Add-Check 'package_json' 'error' "package.json invalid: $($_.Exception.Message)" ''
    }
  }
}

# Doc drift - stale modme-ui-01 path references in key docs (informational)
$keyDocs = @(
  (Join-Path $ctx.RepoRoot 'docs/agent-index.md'),
  (Join-Path $ctx.RepoRoot 'docs/agent-tech-guide.md')
)
$driftCount = 0
foreach ($doc in $keyDocs) {
  if (Test-Path $doc) {
    $content = Get-Content $doc -Raw
    if ($content -match 'modme-ui-01.*Monorepo_ModMe-dev') { $driftCount++ }
  }
}
if ($driftCount -eq 0) {
  Add-Check 'doc_drift' 'ok' 'No obvious path drift in key agent docs' ''
}
else {
  Add-Check 'doc_drift' 'warn' "Possible stale path references in $driftCount doc(s)" 'Update docs to Monorepo_ModMe / modme-ui-01 naming'
}

# -Fix actions
if ($Fix) {
  if ($checks | Where-Object { $_.id -eq 'workspace_file' -and $_.status -ne 'ok' }) {
    $template = @'
{
  "folders": [
    { "name": "Root", "path": "." },
    { "name": "next-forge", "path": "next-forge" },
    { "name": "GenerativeUI", "path": "GenerativeUI_monorepo" },
    { "name": "scripts", "path": "scripts" },
    { "name": "agent-skills", "path": ".agents/skills" }
  ],
  "settings": {
    "git.ignoreLimitWarning": true
  }
}
'@
    Set-Content -Path $workspacePath -Value $template -Encoding utf8
    $checks = $checks | Where-Object { $_.id -ne 'workspace_file' }
    Add-Check 'workspace_file' 'ok' 'Regenerated minimal workspace.code-workspace' ''
  }

  if ($ctx.IsWorktree -and ($checks | Where-Object { $_.id -eq 'yarn_lock' -and $_.status -eq 'error' })) {
    & (Join-Path $PSScriptRoot 'worktree-copy-env.ps1') -SourceRoot $ctx.MainRepoRoot -TargetRoot $ctx.RepoRoot
  }
}

$errors = @($checks | Where-Object { $_.status -eq 'error' })
$warnings = @($checks | Where-Object { $_.status -eq 'warn' })

if ($Json) {
  @{
    repo   = $ctx.RepoRoot
    branch = $ctx.Branch
    checks = $checks
    summary = @{
      ok     = @($checks | Where-Object { $_.status -eq 'ok' }).Count
      warn   = $warnings.Count
      error  = $errors.Count
    }
  } | ConvertTo-Json -Depth 5
}
elseif (-not $Quiet) {
  Write-Host "repo-alignment-doctor: $($ctx.RepoRoot)" -ForegroundColor Cyan
  Write-Host "  branch: $($ctx.Branch)  worktree: $($ctx.IsWorktree)"
  Write-Host ""
  foreach ($c in $checks) {
    $color = switch ($c.status) { 'ok' { 'Green' } 'warn' { 'Yellow' } default { 'Red' } }
    Write-Host "  [$($c.status)] $($c.id): $($c.message)" -ForegroundColor $color
    if ($c.fix_hint) { Write-Host "        fix: $($c.fix_hint)" -ForegroundColor DarkGray }
  }
  Write-Host ""
  Write-Host "summary: ok=$(@($checks | Where-Object { $_.status -eq 'ok' }).Count) warn=$($warnings.Count) error=$($errors.Count)"
}

if ($errors.Count -gt 0) { exit 1 }
exit 0
