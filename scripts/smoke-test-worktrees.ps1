$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Definition) | Out-Null
Set-Location ..

$tmp1 = Join-Path $env:TEMP "wt-cursor-test"
$tmp2 = Join-Path $env:TEMP "wt-copilot-test"
New-Item -ItemType Directory -Force -Path $tmp1, $tmp2 | Out-Null

$p1 = & (Join-Path $PSScriptRoot "worktree-allocate-ports.ps1") -WorktreePath $tmp1
$p2 = & (Join-Path $PSScriptRoot "worktree-allocate-ports.ps1") -WorktreePath $tmp2

$slot1 = (Select-String -Path $p1 -Pattern "WORKTREE_SLOT=(\d+)").Matches.Groups[1].Value
$slot2 = (Select-String -Path $p2 -Pattern "WORKTREE_SLOT=(\d+)").Matches.Groups[1].Value
$dash1 = (Select-String -Path $p1 -Pattern "WEB_DASHBOARD_PORT=(\d+)").Matches.Groups[1].Value
$dash2 = (Select-String -Path $p2 -Pattern "WEB_DASHBOARD_PORT=(\d+)").Matches.Groups[1].Value

Write-Host "Slot cursor-test: $slot1 dashboard: $dash1"
Write-Host "Slot copilot-test: $slot2 dashboard: $dash2"

if ($dash1 -eq $dash2) {
  Write-Warning "Same dashboard port - hash collision possible"
} else {
  Write-Host "OK: distinct dashboard ports" -ForegroundColor Green
}

node scripts/validate-launch-json.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Smoke test passed." -ForegroundColor Green
