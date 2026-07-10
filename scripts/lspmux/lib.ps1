# Shared helpers for lspmux install/start/status scripts.

function Get-LspmuxScriptRoot {
  if ($PSCommandPath) {
    return Split-Path -Parent $PSCommandPath
  }
  return Split-Path -Parent $MyInvocation.MyCommand.Path
}

function Get-LspmuxCargoBinDir {
  if ($env:CARGO_HOME) {
    return Join-Path $env:CARGO_HOME 'bin'
  }
  return Join-Path $env:USERPROFILE '.cargo\bin'
}

function Get-LspmuxBinaryPath {
  $binDir = Get-LspmuxCargoBinDir
  $exe = Join-Path $binDir 'lspmux.exe'
  if (Test-Path $exe) { return $exe }
  $noExt = Join-Path $binDir 'lspmux'
  if (Test-Path $noExt) { return $noExt }
  return $exe
}

function Get-LspmuxConfigPath {
  if ($IsWindows -or $env:OS -match 'Windows') {
    if ($env:APPDATA) {
      return Join-Path $env:APPDATA 'lspmux\config\config.toml'
    }
  }
  if ($env:XDG_CONFIG_HOME) {
    return Join-Path $env:XDG_CONFIG_HOME 'lspmux\config.toml'
  }
  return Join-Path $env:USERPROFILE '.config\lspmux\config.toml'
}

function Test-LspmuxInstalled {
  return Test-Path (Get-LspmuxBinaryPath)
}

function Get-CargoBinaryPath {
  if (Get-Command cargo -ErrorAction SilentlyContinue) {
    return (Get-Command cargo).Source
  }
  $cargoExe = Join-Path (Get-LspmuxCargoBinDir) 'cargo.exe'
  if (Test-Path $cargoExe) { return $cargoExe }
  return $null
}

function Test-CargoAvailable {
  return [bool](Get-CargoBinaryPath)
}

function Ensure-LspmuxConfig {
  param(
    [switch]$Force
  )

  $configPath = Get-LspmuxConfigPath
  $configDir = Split-Path -Parent $configPath
  if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Force -Path $configDir | Out-Null
  }

  if ((Test-Path $configPath) -and -not $Force) {
    Write-Host "   Config already exists: $configPath" -ForegroundColor DarkGray
    return $configPath
  }

  $legacyPath = Join-Path $env:USERPROFILE '.config\lspmux\config.toml'
  if ((Test-Path $legacyPath) -and -not (Test-Path $configPath)) {
    Copy-Item $legacyPath $configPath -Force
    Write-Host "   Migrated config from $legacyPath" -ForegroundColor Green
    return $configPath
  }

  $template = Join-Path (Get-LspmuxScriptRoot) 'config.toml.template'
  if (-not (Test-Path $template)) {
    Write-Error "Missing config template: $template"
  }

  Copy-Item $template $configPath -Force
  Write-Host "   Wrote config: $configPath" -ForegroundColor Green
  return $configPath
}

function Invoke-LspmuxStatus {
  param(
    [switch]$Quiet
  )

  $lspmux = Get-LspmuxBinaryPath
  if (-not (Test-Path $lspmux)) {
    if (-not $Quiet) {
      Write-Host "lspmux not installed (expected at $lspmux)" -ForegroundColor Yellow
    }
    return $false
  }

  & $lspmux status 2>&1 | ForEach-Object {
    if (-not $Quiet) { Write-Host $_ }
  }
  return ($LASTEXITCODE -eq 0)
}

function Get-LspmuxEditorSettings {
  return @{
    'rust-analyzer.server.path' = '${env:USERPROFILE}\.cargo\bin\lspmux.exe'
    'rust-analyzer.server.extraEnv' = @{
      'LSPMUX_SERVER' = '${env:USERPROFILE}\.cargo\bin\rust-analyzer.exe'
    }
  }
}
