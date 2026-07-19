# Shared worktree bootstrap - env copy, ports, hooks, optional shared deps.
# Dot-source from scripts/copilot-workspace/bootstrap.ps1 and setup-workspace-windows.ps1.

function Invoke-WorktreeBootstrap {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorktreeRoot,

    [Parameter(Mandatory = $true)]
    [string]$SourceRoot,

    [switch]$Full,
    [switch]$SharedDeps,
    [switch]$Lite,
    [switch]$SkipSession
  )

  $scriptsDir = Split-Path -Parent $PSScriptRoot
  $repoRoot = Split-Path -Parent $scriptsDir

  . (Join-Path $scriptsDir 'lib/worktree-context.ps1')
  $ctx = Get-WorktreeContext -RepoRoot $WorktreeRoot

  $copyEnv = Join-Path $scriptsDir 'worktree-copy-env.ps1'
  if (-not (Test-Path $copyEnv)) {
    throw "Missing bootstrap dependency: $copyEnv"
  }

  & $copyEnv -SourceRoot $SourceRoot -TargetRoot $WorktreeRoot
  if ($LASTEXITCODE -ne 0) { throw 'worktree-copy-env.ps1 failed' }

  $portsFile = Join-Path $WorktreeRoot '.worktree-ports.env'
  if (-not (Test-Path $portsFile)) {
    & (Join-Path $scriptsDir 'worktree-allocate-ports.ps1') -WorktreePath $WorktreeRoot
    if ($LASTEXITCODE -ne 0) { throw 'worktree-allocate-ports.ps1 failed' }
  }

  & (Join-Path $scriptsDir 'install-git-hooks.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'install-git-hooks.ps1 failed' }

  if ($Lite) {
    Write-Host 'Worktree bootstrap complete (lite: env + ports + hooks).' -ForegroundColor Green
    return
  }

  $linked = $false
  $onWindows = Test-ModMeIsWindows
  if ($SharedDeps -and $onWindows -and (Test-Path $ctx.DevCheckout)) {
    $linked = Invoke-WorktreeSharedDepJunctions -WorktreeRoot $WorktreeRoot -DevCheckout $ctx.DevCheckout
  }

  # Full install only when requested, or SharedDeps could not junction anything.
  $needInstall = $Full -or ($SharedDeps -and -not $linked)
  if ($needInstall) {
    if (-not (Get-Command yarn -ErrorAction SilentlyContinue)) {
      Write-Warning 'yarn not on PATH - skipping dependency install'
      return
    }

    Push-Location $WorktreeRoot
    try {
      Write-Host 'Running yarn install (worktree bootstrap)...' -ForegroundColor Cyan
      yarn install
      if ($LASTEXITCODE -ne 0) { throw 'yarn install failed during worktree bootstrap' }
    }
    finally {
      Pop-Location
    }
  }

  Write-Host 'Worktree bootstrap complete.' -ForegroundColor Green
}

function Invoke-WorktreeSharedDepJunctions {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorktreeRoot,

    [Parameter(Mandatory = $true)]
    [string]$DevCheckout
  )

  $relativePaths = @(
    'node_modules',
    'GenerativeUI_monorepo/node_modules',
    'next-forge/node_modules',
    'GenerativeUI_monorepo/apps/agent-server/.venv'
  )

  $linkedAny = $false
  foreach ($relativePath in $relativePaths) {
    $source = Join-Path $DevCheckout $relativePath
    $target = Join-Path $WorktreeRoot $relativePath
    if (-not (Test-Path $source)) { continue }

    if (Test-Path $target) {
      Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction SilentlyContinue
    }

    $targetParent = Split-Path -Parent $target
    if (-not (Test-Path $targetParent)) {
      New-Item -ItemType Directory -Force -Path $targetParent | Out-Null
    }

    try {
      New-Item -ItemType Junction -Path $target -Target $source | Out-Null
      Write-Host "   Junction: $relativePath -> .worktrees/dev" -ForegroundColor Green
      $linkedAny = $true
    }
    catch {
      Write-Warning "Could not junction $relativePath - $($_.Exception.Message)"
    }
  }

  return $linkedAny
}
