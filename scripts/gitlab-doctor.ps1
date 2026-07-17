#Requires -Version 5.1
<#
.SYNOPSIS
  Validate GitLab mirror + Duo adjunct configuration for ModMe.
#>
param(
  [switch]$Quiet,
  [switch]$Json,
  [string]$RepoRoot = ''
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (git rev-parse --show-toplevel 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = Split-Path -Parent $PSScriptRoot
  }
}

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

# glab CLI
if (Get-Command glab -ErrorAction SilentlyContinue) {
  $glabVer = (glab --version 2>&1 | Select-Object -First 1).ToString().Trim()
  Add-Check 'glab_cli' 'ok' "glab installed ($glabVer)" ''
}
else {
  Add-Check 'glab_cli' 'warn' 'glab not on PATH' 'https://gitlab.com/gitlab-org/cli#installation'
}

# glab auth
if (Get-Command glab -ErrorAction SilentlyContinue) {
  glab auth status 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Add-Check 'glab_auth' 'ok' 'glab authenticated' ''
  }
  else {
    Add-Check 'glab_auth' 'warn' 'glab not authenticated' 'glab auth login'
  }
}

# GITLAB_PROJECT_ID
if ($env:GITLAB_PROJECT_ID) {
  Add-Check 'gitlab_project_id' 'ok' "GITLAB_PROJECT_ID=$($env:GITLAB_PROJECT_ID)" ''
}
else {
  Add-Check 'gitlab_project_id' 'warn' 'GITLAB_PROJECT_ID not set' 'Set in root .env (never commit)'
}

# GITLAB_TOKEN (local only — do not print value)
if ($env:GITLAB_TOKEN) {
  Add-Check 'gitlab_token' 'ok' 'GITLAB_TOKEN set (local)' ''
}
else {
  Add-Check 'gitlab_token' 'warn' 'GITLAB_TOKEN not set locally' 'PAT with read_api for MCP/glab; mirror uses GitHub secrets'
}

# gitlab remote
$remoteList = @(git -C $RepoRoot remote 2>$null)
if ($remoteList -contains 'gitlab') {
  $gitlabUrl = (git -C $RepoRoot remote get-url gitlab).Trim()
  Add-Check 'gitlab_remote' 'ok' "gitlab remote ($gitlabUrl)" ''
}
else {
  Add-Check 'gitlab_remote' 'warn' 'No gitlab remote' 'git remote add gitlab https://gitlab.com/your-group/modme-ui-01.git'
}

# CI config files
$ciFiles = @(
  '.gitlab-ci.yml',
  '.gitlab/ci/security-adjunct.yml',
  '.gitlab/ci/devops-autofix.yml',
  '.gitlab/autodev-reference.yml',
  'next-forge/.gitlab-ci.yml',
  'GenerativeUI_monorepo/.gitlab-ci.yml'
)
$missingCi = @($ciFiles | Where-Object { -not (Test-Path (Join-Path $RepoRoot $_)) })
if ($missingCi.Count -eq 0) {
  Add-Check 'gitlab_ci_files' 'ok' 'GitLab CI router + child configs present' ''
}
else {
  Add-Check 'gitlab_ci_files' 'error' "Missing CI files: $($missingCi -join ', ')" ''
}

# Orbit (optional)
if (Get-Command glab -ErrorAction SilentlyContinue) {
  glab orbit --help 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Add-Check 'orbit_cli' 'ok' 'glab orbit extension available' ''
    if ($env:GITLAB_GROUP) {
      glab orbit remote graph-status --full-path $env:GITLAB_GROUP 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Add-Check 'orbit_remote' 'ok' "Orbit Remote ready for $($env:GITLAB_GROUP)" ''
      }
      else {
        Add-Check 'orbit_remote' 'warn' 'Orbit Remote not enabled for GITLAB_GROUP' 'Enable in GitLab group settings'
      }
    }
    else {
      Add-Check 'orbit_remote' 'warn' 'GITLAB_GROUP not set — skip Orbit Remote check' ''
    }
  }
  else {
    Add-Check 'orbit_cli' 'warn' 'glab orbit not installed' 'glab skills install --global orbit'
  }
}

$errors = @($checks | Where-Object { $_.status -eq 'error' })
$warns = @($checks | Where-Object { $_.status -eq 'warn' })

if ($Json) {
  @{
    ok     = ($errors.Count -eq 0)
    errors = $errors.Count
    warns  = $warns.Count
    checks = $checks
  } | ConvertTo-Json -Depth 4
}
elseif (-not $Quiet) {
  Write-Host 'GitLab doctor' -ForegroundColor Cyan
  foreach ($c in $checks) {
    $color = switch ($c.status) {
      'ok' { 'Green' }
      'warn' { 'Yellow' }
      default { 'Red' }
    }
    Write-Host "  [$($c.status)] $($c.id): $($c.message)" -ForegroundColor $color
    if ($c.fix_hint) {
      Write-Host "         fix: $($c.fix_hint)" -ForegroundColor DarkGray
    }
  }
  Write-Host ''
  if ($errors.Count -gt 0) {
    Write-Host "gitlab:doctor failed ($($errors.Count) error(s))" -ForegroundColor Red
  }
  else {
    Write-Host "gitlab:doctor passed ($($warns.Count) warning(s))" -ForegroundColor Green
  }
}

if ($errors.Count -gt 0) { exit 1 }
exit 0
