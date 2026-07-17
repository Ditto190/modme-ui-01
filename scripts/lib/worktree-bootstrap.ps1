# Shared worktree bootstrap steps for ModMe (dot-source from setup scripts).

function Invoke-WorktreeBootstrap {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorktreeRoot,

    [Parameter(Mandatory = $true)]
    [string]$SourceRoot,

    [switch]$Lite,

    [switch]$SharedDeps,

    [switch]$Full,

    [switch]$SkipSession
  )

  $ErrorActionPreference = "Stop"
  $WorktreeRoot = (Resolve-Path $WorktreeRoot).Path
  $SourceRoot = (Resolve-Path $SourceRoot).Path
  $scriptsDir = Join-Path $WorktreeRoot "scripts"

  if (-not $Lite -and -not $SharedDeps -and -not $Full) {
    $Full = $true
  }

  $totalSteps = if ($Lite) { 2 } elseif ($SharedDeps) { 5 } else { 10 }
  $step = 0

  function Write-BootstrapStep {
    param([string]$Message)
    $script:step++
    Write-Host "$($script:step)/$($script:totalSteps) $Message" -ForegroundColor Cyan
  }

  Write-Host "===========================================" -ForegroundColor Cyan
  Write-Host "   Monorepo_ModMe worktree bootstrap" -ForegroundColor Cyan
  Write-Host "===========================================" -ForegroundColor Cyan
  Write-Host "   Worktree: $WorktreeRoot"
  Write-Host "   Source:   $SourceRoot"
  if ($Lite) { Write-Host "   Mode:     lite (ports + env)" -ForegroundColor DarkYellow }
  elseif ($SharedDeps) { Write-Host "   Mode:     shared-deps (junctions + hooks)" -ForegroundColor DarkYellow }
  else { Write-Host "   Mode:     full install" -ForegroundColor DarkYellow }
  Write-Host ""

  Write-BootstrapStep "Allocating ports..."
  & "$scriptsDir/worktree-allocate-ports.ps1" -WorktreePath $WorktreeRoot
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-BootstrapStep "Copying .env files from source checkout..."
  & "$scriptsDir/worktree-copy-env.ps1" -SourceRoot $SourceRoot -TargetRoot $WorktreeRoot
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if ($Lite) {
    Write-Host ""
    Write-Host "Lite bootstrap complete." -ForegroundColor Green
    return
  }

  if ($SharedDeps) {
    Write-BootstrapStep "Linking shared dependency directories..."
    . "$scriptsDir/lib/worktree-link-deps.ps1"
    $linkResult = Invoke-WorktreeLinkDeps -WorktreeRoot $WorktreeRoot -SourceRoot $SourceRoot
    if ($linkResult.linked.Count -gt 0) {
      Write-Host "   linked: $($linkResult.linked -join ', ')" -ForegroundColor Green
    }

    Write-BootstrapStep "Installing git hooks..."
    & "$scriptsDir/install-git-hooks.ps1"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    if (-not $SkipSession) {
      Write-BootstrapStep "Starting agent session envelope..."
      $branch = git -C $WorktreeRoot branch --show-current 2>$null
      $taskTitle = if ($branch -match 'feature/[^/]+/(.+)') { $Matches[1] -replace '-', ' ' } else { "worktree: $branch" }
      if (Test-Path "$scriptsDir/agent-session-start.ps1") {
        & "$scriptsDir/agent-session-start.ps1" -TaskTitle $taskTitle -SkipBeads 2>&1 | Out-Null
      }
    }

    Write-Host ""
    Write-Host "Shared-deps bootstrap complete." -ForegroundColor Green
    Write-Host "Source ports before dev: . .\scripts\load-worktree-ports.ps1" -ForegroundColor Cyan
    Write-Host "End session:           yarn worktree:session:end -Yes -CommitMessage \"...\" -Push -CreatePr" -ForegroundColor Cyan
    Write-Host "Remove worktree:       yarn worktree:session:end -RemoveWorktree -Yes" -ForegroundColor Cyan
    return
  }

  Write-BootstrapStep "Enabling corepack..."
  corepack enable
  if ($LASTEXITCODE -ne 0) {
    Write-Host "   corepack enable failed (continuing if yarn/bun already on PATH)" -ForegroundColor DarkYellow
  }

  Write-BootstrapStep "yarn install (repo root)..."
  Push-Location $WorktreeRoot
  yarn install
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location

  Write-BootstrapStep "yarn install (GenerativeUI_monorepo)..."
  Push-Location "$WorktreeRoot/GenerativeUI_monorepo"
  yarn install
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location

  Write-BootstrapStep "bun install (next-forge)..."
  Push-Location "$WorktreeRoot/next-forge"
  $prevPuppeteerSkip = $env:PUPPETEER_SKIP_DOWNLOAD
  $env:PUPPETEER_SKIP_DOWNLOAD = "true"
  npx bun install
  $bunExit = $LASTEXITCODE
  if ($null -ne $prevPuppeteerSkip) { $env:PUPPETEER_SKIP_DOWNLOAD = $prevPuppeteerSkip }
  else { Remove-Item Env:PUPPETEER_SKIP_DOWNLOAD -ErrorAction SilentlyContinue }
  if ($bunExit -ne 0) { Pop-Location; exit $bunExit }
  Pop-Location

  Write-BootstrapStep "poetry install (agent-server)..."
  Push-Location "$WorktreeRoot/GenerativeUI_monorepo/apps/agent-server"
  poetry install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "   poetry install failed (continuing; fix Poetry config in agent-server)" -ForegroundColor DarkYellow
  }
  Pop-Location

  Write-BootstrapStep "lean-ctx doctor (non-fatal)..."
  if (Get-Command lean-ctx -ErrorAction SilentlyContinue) {
    lean-ctx doctor
    if ($LASTEXITCODE -ne 0) {
      Write-Host "   lean-ctx doctor reported issues (continuing)" -ForegroundColor DarkYellow
    }
  }
  else {
    Write-Host "   lean-ctx not on PATH - skipped" -ForegroundColor DarkYellow
  }

  Write-BootstrapStep "Installing git hooks..."
  & "$scriptsDir/install-git-hooks.ps1"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  if (-not $SkipSession) {
    Write-BootstrapStep "Starting agent session envelope..."
    $branch = git -C $WorktreeRoot branch --show-current 2>$null
    $taskTitle = if ($branch -match 'feature/[^/]+/(.+)') { $Matches[1] -replace '-', ' ' } else { "worktree: $branch" }
    if (Test-Path "$scriptsDir/agent-session-start.ps1") {
      & "$scriptsDir/agent-session-start.ps1" -TaskTitle $taskTitle -SkipBeads 2>&1 | Out-Null
    }
  }

  Write-Host ""
  Write-Host "Worktree bootstrap complete." -ForegroundColor Green
  Write-Host "Source ports before dev: . .\scripts\load-worktree-ports.ps1" -ForegroundColor Cyan
  Write-Host "Dev TUI: yarn agent:tui  (mprocs - install mprocs if missing)" -ForegroundColor Cyan
  Write-Host "Status:  yarn agent:status" -ForegroundColor Cyan
  Write-Host "End session: yarn worktree:session:end -Yes -CommitMessage \"...\" -Push -CreatePr" -ForegroundColor Cyan
}
