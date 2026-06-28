#Requires -Version 5.1
<#
.SYNOPSIS
  Prove-it metrics — savings verify, summary, sign, benchmark scorecard.
#>
param(
  [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)),
  [switch]$SkipSign,
  [switch]$Help
)

$ErrorActionPreference = 'Continue'

if ($Help) {
  @"
lean-ctx-prove-it — savings verification + benchmark scorecard

Writes to metrics/lean-ctx-savings-YYYY-MM.json and metrics/lean-ctx-scorecard.json
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$loadEnv = Join-Path $ScriptDir 'load-lean-ctx-env.ps1'
if (Test-Path $loadEnv) {
  . $loadEnv -RepoRoot $RepoRoot | Out-Null
}

$metricsDir = Join-Path $RepoRoot 'metrics'
New-Item -ItemType Directory -Force -Path $metricsDir | Out-Null

$month = Get-Date -Format 'yyyy-MM'
$savingsOut = Join-Path $metricsDir "lean-ctx-savings-$month.json"
$scorecardOut = Join-Path $metricsDir 'lean-ctx-scorecard.json'

if (-not (Get-Command lean-ctx -ErrorAction SilentlyContinue)) {
  Write-Warning 'lean-ctx not on PATH — prove-it skipped'
  exit 0
}

Write-Host 'lean-ctx prove-it' -ForegroundColor Green

& lean-ctx savings verify 2>&1 | Out-Host
& lean-ctx savings summary 2>&1 | Out-Host

if (-not $SkipSign) {
  & lean-ctx savings sign --out $savingsOut 2>&1 | Out-Host
  Write-Host "  savings signed -> $savingsOut" -ForegroundColor DarkGray
}

& lean-ctx benchmark scorecard --json 2>&1 | Set-Content -Path $scorecardOut -Encoding utf8
Write-Host "  scorecard -> $scorecardOut" -ForegroundColor DarkGray

# Append lineage to metrics/lean_ctx_savings.csv when track script exists
$trackScript = Join-Path $ScriptDir 'track_lean_ctx.ps1'
if ((Test-Path $trackScript) -and (Test-Path $scorecardOut)) {
  Write-Verbose "prove-it: scorecard at $scorecardOut (append via track_lean_ctx.ps1 manually if needed)"
}

Write-Host 'lean-ctx prove-it: complete' -ForegroundColor Green
