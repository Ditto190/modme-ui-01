#Requires -Version 5.1
<#
.SYNOPSIS
  Idempotent KM / agent data plane bootstrap (Dolt, Entire, Beads, km:status).

.DESCRIPTION
  Soft-fail by default so product launches (next-forge) continue if Dolt/Entire
  are missing. Pass -Strict to fail hard (Agent Data Plane debug launch).

  Called from agent-session-start.ps1, worktree setup, and VS Code tasks.
#>
param(
  [switch]$Strict,
  [switch]$SkipEntire,
  [switch]$SkipBeads,
  [switch]$SkipDolt,
  [switch]$SkipStatus,
  [switch]$Help
)

$ErrorActionPreference = 'Continue'
$failed = $false

function Write-KmWarn([string]$Message) {
  Write-Host "  [km] WARN: $Message" -ForegroundColor DarkYellow
}

function Write-KmOk([string]$Message) {
  Write-Host "  [km] $Message" -ForegroundColor Green
}

function Write-KmInfo([string]$Message) {
  Write-Host "  [km] $Message" -ForegroundColor Cyan
}

function Set-KmFailed([string]$Message) {
  Write-KmWarn $Message
  $script:failed = $true
}

if ($Help) {
  @"
km-session-bootstrap — ensure agent data plane (ADR-0013)

  1. Refresh PATH (dolt / entire from winget/scoop)
  2. Dot-source .dolt-data/beads-server.env if present
  3. yarn dolt:up (idempotent)
  4. entire status (warn unless -Strict)
  5. npx @beads/bd ready (warn unless -Strict)
  6. node scripts/km-status.mjs (soft unless -Strict)

Flags:
  -Strict      Exit non-zero on any failure
  -SkipEntire  Skip entire status
  -SkipBeads   Skip bd ready
  -SkipDolt    Skip dolt:up
  -SkipStatus  Skip km-status.mjs
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

Write-Host 'KM session bootstrap (agent data plane)...' -ForegroundColor Cyan

# 1. Refresh PATH so winget/scoop installs are visible in this process
$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
[System.Environment]::GetEnvironmentVariable('Path', 'User')

# 2. Optional Beads ↔ sql-server env hints
$beadsServerEnv = Join-Path $RepoRoot '.dolt-data\beads-server.env'
if (Test-Path $beadsServerEnv) {
  Write-KmInfo "Loading $beadsServerEnv"
  Get-Content $beadsServerEnv | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $name = $Matches[1]
      $value = $Matches[2].Trim().Trim('"').Trim("'")
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

# 3. Dolt sql-server (idempotent)
if (-not $SkipDolt) {
  $doltUp = Join-Path $ScriptDir 'dolt\up.ps1'
  if (Test-Path $doltUp) {
    Write-KmInfo 'Ensuring Dolt sql-server (yarn dolt:up)...'
    & $doltUp
    if ($LASTEXITCODE -ne 0) {
      Set-KmFailed "dolt:up failed (exit $LASTEXITCODE). Install: winget install DoltHub.Dolt"
    }
    else {
      Write-KmOk 'Dolt sql-server ready (or already up)'
    }
  }
  else {
    Set-KmFailed "Missing $doltUp"
  }
}

# 4. Entire status
if (-not $SkipEntire) {
  $entireStatus = Join-Path $ScriptDir 'entire\status.ps1'
  if (Test-Path $entireStatus) {
    Write-KmInfo 'Checking Entire...'
    & $entireStatus 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
      Set-KmFailed 'entire status failed — run yarn entire:install'
    }
    else {
      Write-KmOk 'Entire OK'
    }
  }
  else {
    Write-KmWarn 'scripts/entire/status.ps1 missing — skipped'
  }
}

# 5. Beads ready (read-only check) — prefer global bd; timeout so npx never hangs the shell
if (-not $SkipBeads) {
  Write-KmInfo 'Checking beads ready...'
  $bdTimeoutSec = 20

  function Resolve-BeadsReadyInvocation {
    $bd = Get-Command bd -ErrorAction SilentlyContinue
    if ($bd -and $bd.CommandType -eq 'Application') {
      return @{ File = $bd.Source; Args = @('ready') }
    }
    # Prefer npx.cmd — Start-Process cannot run npx.ps1 ("%1 is not a valid Win32 application")
    $npxCmd = Join-Path $env:ProgramFiles 'nodejs\npx.cmd'
    if (-not (Test-Path -LiteralPath $npxCmd)) {
      $npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
      if ($npx) { $npxCmd = $npx.Source }
      else { $npxCmd = $null }
    }
    if ($npxCmd -and (Test-Path -LiteralPath $npxCmd)) {
      return @{ File = $npxCmd; Args = @('--yes', '@beads/bd', 'ready') }
    }
    return $null
  }

  $inv = Resolve-BeadsReadyInvocation
  if (-not $inv) {
    Set-KmFailed 'bd/npx.cmd not on PATH — cannot run bd ready'
  }
  else {
    $outFile = [System.IO.Path]::GetTempFileName()
    $errFile = [System.IO.Path]::GetTempFileName()
    try {
      $proc = Start-Process -FilePath $inv.File -ArgumentList $inv.Args `
        -NoNewWindow -PassThru `
        -RedirectStandardOutput $outFile -RedirectStandardError $errFile
      if (-not $proc.WaitForExit($bdTimeoutSec * 1000)) {
        try { $proc.Kill() } catch { }
        Set-KmFailed "bd ready timed out after ${bdTimeoutSec}s (silent attach will retry later)"
      }
      else {
        $bdCode = $proc.ExitCode
        if ($null -eq $bdCode) { $bdCode = 0 }
        $bdText = ((Get-Content -LiteralPath $outFile -Raw -ErrorAction SilentlyContinue) + "`n" +
          (Get-Content -LiteralPath $errFile -Raw -ErrorAction SilentlyContinue))
        if ($bdText -match 'Error 1105|auto-backup failed|table file not found') {
          Write-KmWarn 'Beads auto-backup noise detected — see docs/beads-workflow.md (backup.enabled)'
        }
        if ([int]$bdCode -ne 0) {
          Write-Host $bdText
          Set-KmFailed "bd ready failed (exit $bdCode)"
        }
        else {
          Write-KmOk 'Beads ready OK'
          if ($bdText.Trim()) {
            Write-Host ($bdText.Trim() -split "`n" | Select-Object -First 12) -ForegroundColor DarkGray
          }
        }
      }
    }
    catch {
      Set-KmFailed "bd ready invoke failed: $_"
    }
    finally {
      Remove-Item -LiteralPath $outFile, $errFile -Force -ErrorAction SilentlyContinue
    }
  }
}

# 6. Aggregate status
if (-not $SkipStatus) {
  $kmStatus = Join-Path $ScriptDir 'km-status.mjs'
  if ((Test-Path $kmStatus) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-KmInfo 'Running km:status...'
    & node $kmStatus
    if ($LASTEXITCODE -ne 0) {
      Set-KmFailed "km:status reported PARTIAL/FAIL (exit $LASTEXITCODE)"
    }
    else {
      Write-KmOk 'km:status PASS'
    }
  }
}

if ($failed) {
  if ($Strict) {
    Write-Host 'KM bootstrap FAILED (strict)' -ForegroundColor Red
    exit 1
  }
  Write-Host 'KM bootstrap completed with warnings (non-strict — product launch may continue)' -ForegroundColor DarkYellow
  exit 0
}

Write-Host 'KM bootstrap OK' -ForegroundColor Green
exit 0
