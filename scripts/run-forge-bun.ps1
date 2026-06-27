# Run Bun commands in next-forge without root Yarn PnP (.pnp.cjs) interfering.
# Root Monorepo_ModMe uses Yarn 3 PnP with no deps; esbuild/Storybook walk up and pick it up.

param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$BunArgs
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$ForgeRoot = Join-Path $RepoRoot "next-forge"
$RootPnp = Join-Path $RepoRoot ".pnp.cjs"
$HiddenPnp = Join-Path $RepoRoot ".pnp.cjs.forge-hidden"

if (-not (Test-Path $ForgeRoot)) {
  Write-Error "next-forge directory not found: $ForgeRoot"
}

if ($BunArgs.Count -eq 0) {
  Write-Error "Usage: run-forge-bun.ps1 <bun-args...>  e.g. run dev --filter storybook"
}

# Recover from an interrupted prior run
if ((Test-Path $HiddenPnp) -and -not (Test-Path $RootPnp)) {
  Move-Item -LiteralPath $HiddenPnp -Destination $RootPnp
}

$pnpHidden = $false
if (Test-Path $RootPnp) {
  Move-Item -LiteralPath $RootPnp -Destination $HiddenPnp
  $pnpHidden = $true
}

if ($env:NODE_OPTIONS -match '\.pnp\.cjs') {
  Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
}

$bootstrap = Join-Path $ScriptDir 'lib\modme-env-bootstrap.ps1'
if (Test-Path $bootstrap) {
  . $bootstrap
  Import-ModMeEnv -RepoRoot $RepoRoot -Quiet | Out-Null
}

$exitCode = 1
Push-Location $ForgeRoot
try {
  & bun @BunArgs
  if ($null -ne $LASTEXITCODE) {
    $exitCode = $LASTEXITCODE
  }
  else {
    $exitCode = 0
  }
}
finally {
  Pop-Location
  if ($pnpHidden -and (Test-Path $HiddenPnp)) {
    Move-Item -LiteralPath $HiddenPnp -Destination $RootPnp
  }
}

exit $exitCode
