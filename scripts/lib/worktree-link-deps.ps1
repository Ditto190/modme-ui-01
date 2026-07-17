# Link heavy dependency dirs from a source checkout into a worktree (Windows junctions).
# Yarn nmMode: hardlinks-global + Bun global cache reduce duplication; junctions avoid per-worktree installs.

function Get-LockfileFingerprint {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  return (Get-FileHash -Path $Path -Algorithm SHA256).Hash
}

function Test-LockfilesMatch {
  param(
    [string]$SourceRoot,
    [string]$TargetRoot,
    [string[]]$RelativeLockPaths
  )
  foreach ($rel in $RelativeLockPaths) {
    $src = Join-Path $SourceRoot $rel
    $tgt = Join-Path $TargetRoot $rel
    if (-not (Test-Path $src) -or -not (Test-Path $tgt)) { return $false }
    if ((Get-LockfileFingerprint $src) -ne (Get-LockfileFingerprint $tgt)) { return $false }
  }
  return $true
}

function Remove-PathIfJunctionOrEmpty {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  if ($null -eq $item) { return }
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    cmd /c "rmdir `"$Path`"" | Out-Null
    return
  }
  if ($item.PSIsContainer -and @(Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue).Count -eq 0) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

function New-DependencyJunction {
  param(
    [string]$LinkPath,
    [string]$TargetPath
  )
  if (-not (Test-Path $TargetPath)) {
    Write-Host "   skip junction (source missing): $TargetPath" -ForegroundColor DarkYellow
    return $false
  }
  if (Test-Path $LinkPath) {
    $existing = Get-Item -LiteralPath $LinkPath -Force
    if ($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      $resolved = $existing.Target
      if ($resolved -and ($resolved -eq $TargetPath -or $resolved -eq (Resolve-Path $TargetPath).Path)) {
        Write-Host "   already linked: $LinkPath" -ForegroundColor Gray
        return $true
      }
      Remove-PathIfJunctionOrEmpty -Path $LinkPath
    }
    else {
      Write-Host "   skip junction (real dir exists): $LinkPath" -ForegroundColor DarkYellow
      return $false
    }
  }
  $parent = Split-Path -Parent $LinkPath
  if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
  cmd /c "mklink /J `"$LinkPath`" `"$((Resolve-Path $TargetPath).Path)`"" | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "   linked: $LinkPath -> $TargetPath" -ForegroundColor Green
    return $true
  }
  Write-Host "   junction failed: $LinkPath" -ForegroundColor DarkYellow
  return $false
}

function Resolve-DependencySourceRoot {
  param(
    [string]$WorktreeRoot,
    [string]$PreferredSource
  )
  $candidates = @()
  if ($PreferredSource) { $candidates += $PreferredSource }
  . (Join-Path (Split-Path -Parent $PSScriptRoot) 'lib/worktree-context.ps1') | Out-Null
  $ctx = Get-WorktreeContext -RepoRoot $WorktreeRoot
  if ($ctx.DevCheckout -and (Test-Path $ctx.DevCheckout)) { $candidates += $ctx.DevCheckout }
  if ($ctx.MainRepoRoot) { $candidates += $ctx.MainRepoRoot }
  foreach ($root in $candidates | Select-Object -Unique) {
    if (-not $root) { continue }
    $resolved = (Resolve-Path $root -ErrorAction SilentlyContinue).Path
    if (-not $resolved) { continue }
    if ($resolved -eq (Resolve-Path $WorktreeRoot).Path) { continue }
    $genUiNm = Join-Path $resolved 'GenerativeUI_monorepo/node_modules'
    $forgeNm = Join-Path $resolved 'next-forge/node_modules'
    if ((Test-Path $genUiNm) -or (Test-Path $forgeNm)) {
      return $resolved
    }
  }
  return $PreferredSource
}

function Invoke-WorktreeLinkDeps {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorktreeRoot,

    [Parameter(Mandatory = $true)]
    [string]$SourceRoot
  )

  $WorktreeRoot = (Resolve-Path $WorktreeRoot).Path
  $SourceRoot = Resolve-DependencySourceRoot -WorktreeRoot $WorktreeRoot -PreferredSource $SourceRoot
  if (-not $SourceRoot) {
    Write-Host "   no dependency source checkout found" -ForegroundColor DarkYellow
    return @{ linked = @(); failed = @('source') }
  }
  $SourceRoot = (Resolve-Path $SourceRoot).Path
  if ($SourceRoot -eq $WorktreeRoot) {
    Write-Host "   source equals worktree; skip junctions" -ForegroundColor DarkYellow
    return @{ linked = @(); failed = @() }
  }

  Write-Host "   dependency source: $SourceRoot" -ForegroundColor Cyan

  $specs = @(
    @{
      rel       = 'node_modules'
      locks     = @('yarn.lock')
      install   = { param($wt) Push-Location $wt; yarn install; Pop-Location }
    },
    @{
      rel       = 'GenerativeUI_monorepo/node_modules'
      locks     = @('GenerativeUI_monorepo/yarn.lock')
      install   = { param($wt) Push-Location (Join-Path $wt 'GenerativeUI_monorepo'); yarn install; Pop-Location }
    },
    @{
      rel       = 'next-forge/node_modules'
      locks     = @('next-forge/bun.lock')
      install   = {
        param($wt)
        Push-Location (Join-Path $wt 'next-forge')
        $env:PUPPETEER_SKIP_DOWNLOAD = 'true'
        npx bun install
        Pop-Location
      }
    },
    @{
      rel       = 'GenerativeUI_monorepo/apps/agent-server/.venv'
      locks     = @('GenerativeUI_monorepo/apps/agent-server/poetry.lock')
      install   = {
        param($wt)
        Push-Location (Join-Path $wt 'GenerativeUI_monorepo/apps/agent-server')
        poetry install
        Pop-Location
      }
    }
  )

  $linked = @()
  $failed = @()

  foreach ($spec in $specs) {
    $rel = $spec.rel
    $srcPath = Join-Path $SourceRoot $rel
    $tgtPath = Join-Path $WorktreeRoot $rel
    if (-not (Test-Path $srcPath)) { continue }
    if (-not (Test-LockfilesMatch -SourceRoot $SourceRoot -TargetRoot $WorktreeRoot -RelativeLockPaths $spec.locks)) {
      Write-Host "   lockfile drift for $rel — will install locally if needed" -ForegroundColor DarkYellow
      $failed += $rel
      continue
    }
    if (New-DependencyJunction -LinkPath $tgtPath -TargetPath $srcPath) {
      $linked += $rel
    }
    else {
      $failed += $rel
    }
  }

  foreach ($rel in $failed) {
    $spec = $specs | Where-Object { $_.rel -eq $rel } | Select-Object -First 1
    if ($null -eq $spec) { continue }
    $tgtPath = Join-Path $WorktreeRoot $rel
    if (Test-Path $tgtPath) { continue }
    Write-Host "   fallback install: $rel" -ForegroundColor Cyan
    & $spec.install $WorktreeRoot
    if ($LASTEXITCODE -ne 0) {
      Write-Host "   fallback install failed: $rel (continuing)" -ForegroundColor DarkYellow
    }
  }

  return @{ linked = $linked; failed = $failed; source = $SourceRoot }
}
