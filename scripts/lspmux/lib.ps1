# Shared helpers for lspmux install/start/status scripts.

$script:LspmuxLibDir = $PSScriptRoot
if (-not $script:LspmuxLibDir) {
  $script:LspmuxLibDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}

function Get-LspmuxScriptRoot {
  return $script:LspmuxLibDir
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

function Get-RustAnalyzerBinaryPath {
  $binDir = Get-LspmuxCargoBinDir
  $exe = Join-Path $binDir 'rust-analyzer.exe'
  if (Test-Path $exe) { return $exe }
  $noExt = Join-Path $binDir 'rust-analyzer'
  if (Test-Path $noExt) { return $noExt }
  return $exe
}

function Get-LspmuxConfigPath {
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

function Get-LspmuxSettingKeys {
  return @(
    'rust-analyzer.server.path',
    'rust-analyzer.server.extraEnv'
  )
}

function Get-LspmuxEditorSettings {
  return @{
    'rust-analyzer.server.path' = '${env:USERPROFILE}\.cargo\bin\lspmux.exe'
    'rust-analyzer.server.extraEnv' = @{
      'LSPMUX_SERVER' = '${env:USERPROFILE}\.cargo\bin\rust-analyzer.exe'
    }
  }
}

function Read-VscodeSettingsHashtable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SettingsPath
  )

  if (-not (Test-Path $SettingsPath)) {
    return @{}
  }

  return Get-Content -Raw $SettingsPath | ConvertFrom-Json -AsHashtable
}

function Test-SettingsValueEqual {
  param(
    $Left,
    $Right
  )

  if ($null -eq $Left -and $null -eq $Right) { return $true }
  if ($null -eq $Left -or $null -eq $Right) { return $false }

  $leftJson = $Left | ConvertTo-Json -Depth 20 -Compress
  $rightJson = $Right | ConvertTo-Json -Depth 20 -Compress
  return $leftJson -eq $rightJson
}

function Ensure-LspmuxEditorSettings {
  param(
    [string]$SourceRoot,

    [Parameter(Mandatory = $true)]
    [string]$TargetRoot
  )

  $settingsPath = Join-Path $TargetRoot '.vscode\settings.json'
  $settingsDir = Split-Path -Parent $settingsPath
  if (-not (Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
  }

  $defaults = Get-LspmuxEditorSettings
  $sourceSettings = @{}
  if ($SourceRoot) {
    $sourcePath = Join-Path $SourceRoot '.vscode\settings.json'
    if (Test-Path $sourcePath) {
      try {
        $sourceSettings = Read-VscodeSettingsHashtable -SettingsPath $sourcePath
      }
      catch {
        Write-Warning "Could not parse $sourcePath - using lspmux defaults for missing keys"
      }
    }
  }

  $settings = @{}
  if (Test-Path $settingsPath) {
    try {
      $settings = Read-VscodeSettingsHashtable -SettingsPath $settingsPath
    }
    catch {
      Write-Warning "Could not parse $settingsPath - skipping LSP settings merge"
      return
    }
  }

  $changed = $false
  foreach ($key in Get-LspmuxSettingKeys) {
    $nextValue = $null
    if ($sourceSettings.ContainsKey($key)) {
      $nextValue = $sourceSettings[$key]
    }
    elseif ($settings.ContainsKey($key)) {
      continue
    }
    elseif ($defaults.ContainsKey($key)) {
      $nextValue = $defaults[$key]
    }

    if ($null -eq $nextValue) { continue }

    if (-not $settings.ContainsKey($key) -or -not (Test-SettingsValueEqual $settings[$key] $nextValue)) {
      $settings[$key] = $nextValue
      $changed = $true
    }
  }

  if ($changed -or -not (Test-Path $settingsPath)) {
    ($settings | ConvertTo-Json -Depth 10) + [Environment]::NewLine | Set-Content -Path $settingsPath -Encoding utf8NoBOM
    Write-Host "   Ensured lspmux rust-analyzer settings in .vscode/settings.json" -ForegroundColor Green
  }
}
