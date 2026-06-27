# Ensure lean-ctx is configured for ModMe hybrid workflow (detect + safe auto-apply).
# Usage:
#   .\scripts\ensure-lean-ctx-config.ps1              # detect + auto-apply safe defaults
#   .\scripts\ensure-lean-ctx-config.ps1 -CheckOnly   # read-only report (exit 0 unless binary missing)
#   .\scripts\ensure-lean-ctx-config.ps1 -Force       # overwrite customized global keys (destructive)
#   .\scripts\ensure-lean-ctx-config.ps1 -ProjectOnly   # project .lean-ctx.toml + schema only
#
# Exit codes:
#   0 = ok, or advisory nudge only
#   1 = lean-ctx binary not on PATH (cannot auto-install)

param(
  [switch]$CheckOnly,
  [switch]$Force,
  [switch]$ProjectOnly
)

$ErrorActionPreference = 'Continue'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$ProjectToml = Join-Path $RepoRoot '.lean-ctx.toml'
$SchemaPath = Join-Path $RepoRoot 'docs/lean-ctx/config-schema.json'
$StateDir = Join-Path $RepoRoot '.cursor/hooks/state'
$MarkersPath = Join-Path $StateDir 'lean-ctx-session-markers.jsonl'

$ModMeGlobalPreset = [ordered]@{
  compression_level     = 'max'
  memory_profile        = 'balanced'
  tool_profile          = 'power'
  proxy_enabled         = 'true'
  max_ram_percent       = '5'
  graph_index_max_files = '15000'
}

$ModMeProjectPreset = @'
# ModMe project overrides (merged with global ~/.config/lean-ctx/config.toml)
graph_index_max_files = 15000
'@

function Show-Help {
  @"
ensure-lean-ctx-config - detect + safe auto-apply ModMe lean-ctx defaults

Options:
  -CheckOnly     Report only; no writes (default for vibe-session-finish pre-flight)
  -Force         Overwrite existing global preset keys (destructive; backs up .bak first)
  -ProjectOnly   Skip global config; ensure .lean-ctx.toml + schema sync only

Examples:
  yarn lean-ctx:ensure
  yarn lean-ctx:ensure -- -CheckOnly
  .\scripts\ensure-lean-ctx-config.ps1 -ProjectOnly
"@
}

if ($args -contains '-Help' -or $args -contains '--help' -or $args -contains '-h') {
  Show-Help
  exit 0
}

function Write-Info([string]$Message) {
  Write-Host $Message -ForegroundColor Cyan
}

function Write-Warn([string]$Message) {
  Write-Host "[lean-ctx ensure] $Message" -ForegroundColor Yellow
}

function Write-Ok([string]$Message) {
  Write-Host "[lean-ctx ensure] $Message" -ForegroundColor Green
}

function Write-Note([string]$Message) {
  Write-Host "[lean-ctx ensure] $Message" -ForegroundColor DarkGray
}

function Get-LeanCtxCommand {
  $cmd = Get-Command lean-ctx -ErrorAction SilentlyContinue
  if (-not $cmd) { return $null }
  return $cmd.Source
}

function Get-ConfigPaths {
  $userHome = if ($env:USERPROFILE) { $env:USERPROFILE } else { $env:HOME }
  $xdgDir = if ($env:LEAN_CTX_CONFIG_DIR) {
    $env:LEAN_CTX_CONFIG_DIR
  } else {
    Join-Path $userHome '.config/lean-ctx'
  }
  $xdgConfig = Join-Path $xdgDir 'config.toml'
  $legacyConfig = Join-Path $userHome '.lean-ctx/config.toml'
  [pscustomobject]@{
    Preferred = $xdgConfig
    Legacy    = $legacyConfig
    XdgDir    = $xdgDir
  }
}

function Test-TomlKeyExists([string]$Path, [string]$Key) {
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $pattern = "(?m)^\s*$([regex]::Escape($Key))\s*="
  return [bool](Select-String -Path $Path -Pattern $pattern -Quiet)
}

function Backup-ConfigFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $bak = "$Path.bak"
  Copy-Item -LiteralPath $Path -Destination $bak -Force
  Write-Note "Backup: $bak"
}

function Format-TomlValue([string]$Key, [string]$Value) {
  if ($Value -in @('true', 'false') -or $Value -match '^\d+$') { return $Value }
  return "`"$Value`""
}

function Set-TomlKey([string]$Path, [string]$Key, [string]$Value) {
  $formatted = Format-TomlValue -Key $Key -Value $Value
  $line = "$Key = $formatted"
  if (-not (Test-Path -LiteralPath $Path)) {
    $parent = Split-Path -Parent $Path
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    Set-Content -LiteralPath $Path -Value "# lean-ctx config`n$line`n" -Encoding utf8
    return
  }

  $content = Get-Content -LiteralPath $Path -Raw
  $pattern = "(?m)^\s*$([regex]::Escape($Key))\s*=.*$"
  if ($content -match $pattern) {
    $content = [regex]::Replace($content, $pattern, $line)
  } else {
    $content = $content.TrimEnd() + "`n$line`n"
  }
  Set-Content -LiteralPath $Path -Value $content -Encoding utf8 -NoNewline
  Add-Content -LiteralPath $Path -Value '' -Encoding utf8
}

function Apply-PresetKey([string]$Path, [string]$Key, [string]$Value, [bool]$ForceApply) {
  $exists = Test-TomlKeyExists -Path $Path -Key $Key
  if ($exists -and -not $ForceApply) { return $false }

  if ($CheckOnly) {
    if (-not $exists) { Write-Warn "Missing preset key: $Key (= $Value)" }
    elseif ($ForceApply) { Write-Warn "Would overwrite preset key: $Key" }
    return -not $exists -or $ForceApply
  }

  if ($exists) { Backup-ConfigFile -Path $Path }
  Set-TomlKey -Path $Path -Key $Key -Value $Value
  Write-Ok "Set $Key = $Value ($Path)"
  return $true
}

function Invoke-LeanCtx([string[]]$LeanArgs) {
  $output = & lean-ctx @LeanArgs 2>&1
  $code = $LASTEXITCODE
  return [pscustomobject]@{
    Output = ($output | Out-String).Trim()
    ExitCode = if ($null -eq $code -or $code -eq 0) { 0 } else { $code }
  }
}

function Get-SessionId {
  if (-not [string]::IsNullOrWhiteSpace($env:CURSOR_SESSION_ID)) {
    return ($env:CURSOR_SESSION_ID -replace '[^\w\-]', '_').Substring(0, [Math]::Min(64, $env:CURSOR_SESSION_ID.Length))
  }
  $date = (Get-Date).ToUniversalTime().ToString('yyyyMMdd')
  return "local-$date-$PID"
}

function Test-SessionAlreadyNudged([string]$SessionId) {
  $flag = Join-Path $StateDir "lean-ctx-adopted-$SessionId.json"
  return Test-Path -LiteralPath $flag
}

function Write-SessionAdoptedFlag([string]$SessionId) {
  New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
  $flag = Join-Path $StateDir "lean-ctx-adopted-$SessionId.json"
  $payload = @{
    at      = (Get-Date).ToUniversalTime().ToString('o')
    session = $SessionId
    source  = 'ensure-lean-ctx-config.ps1'
  } | ConvertTo-Json -Compress
  Set-Content -LiteralPath $flag -Value $payload -Encoding utf8
}

function Test-LeanCtxUsedInSession {
  if (-not (Test-Path -LiteralPath $MarkersPath)) { return $false }

  $ctxPattern = 'ctx_read|ctx_search|ctx_shell|ctx_overview|ctx_semantic_search|lean-ctx MCP'
  $nativePattern = '\b(Read|Grep|Shell)\b.*tool'

  $recent = Get-Content -LiteralPath $MarkersPath -Tail 50 -ErrorAction SilentlyContinue
  foreach ($line in $recent) {
    if ($line -match $ctxPattern) { return $true }
  }

  $discover = Invoke-LeanCtx @('discover')
  if ($discover.Output -match 'uncaptured|bypass') {
    return $false
  }

  return $false
}

function Show-AdoptionNudge([string]$SessionId) {
  if (Test-SessionAlreadyNudged -SessionId $SessionId) {
    Write-Note "Adoption checklist already shown this session ($SessionId)."
    return
  }

  Write-Warn 'lean-ctx configured but underused this session. Adoption checklist:'
  Write-Host '  1. ctx_session load + ctx_knowledge wakeup (MCP)'
  Write-Host '  2. Read -> ctx_read, Grep -> ctx_search, Shell -> lean-ctx -c / ctx_shell'
  Write-Host '  3. lean-ctx gain at session end'
  Write-Host '  Docs: docs/lean-ctx-guide.md | yarn lean-ctx:doctor'

  Write-SessionAdoptedFlag -SessionId $SessionId
}

function Sync-ConfigSchema {
  $schemaDir = Split-Path -Parent $SchemaPath
  if (-not (Test-Path -LiteralPath $schemaDir)) {
    New-Item -ItemType Directory -Force -Path $schemaDir | Out-Null
  }

  $result = Invoke-LeanCtx @('config', 'schema')
  if ($result.ExitCode -ne 0) {
    Write-Warn "Schema sync failed: $($result.Output)"
    return $false
  }

  Backup-ConfigFile -Path $SchemaPath
  Set-Content -LiteralPath $SchemaPath -Value $result.Output -Encoding utf8
  Write-Ok "Synced schema -> docs/lean-ctx/config-schema.json"
  return $true
}

function Ensure-ProjectToml {
  if (Test-Path -LiteralPath $ProjectToml) {
    Write-Ok "Project override exists: .lean-ctx.toml"
    return $false
  }

  if ($CheckOnly) {
    Write-Warn 'Missing .lean-ctx.toml (would create with graph_index_max_files=15000).'
    return $true
  }

  Set-Content -LiteralPath $ProjectToml -Value ($ModMeProjectPreset.TrimEnd() + "`n") -Encoding utf8
  Write-Ok 'Created .lean-ctx.toml with graph_index_max_files=15000'
  return $true
}

function Ensure-GlobalConfig([string]$PreferredPath, [string]$LegacyPath) {
  $changed = $false
  $needsInit = -not (Test-Path -LiteralPath $PreferredPath)

  if (Test-Path -LiteralPath $LegacyPath) {
    if (Test-Path -LiteralPath $PreferredPath) {
      Write-Warn "Legacy config exists ($LegacyPath). Prefer XDG: $PreferredPath"
    } else {
      Write-Warn ("Legacy config at {0} - ModMe uses XDG ({1})." -f $LegacyPath, $PreferredPath)
    }
  }

  if ($needsInit) {
    if ($CheckOnly) {
      Write-Warn "Global config missing at $PreferredPath (would run: lean-ctx config init --full)."
      return $true
    }

    $xdgParent = Split-Path -Parent $PreferredPath
    New-Item -ItemType Directory -Force -Path $xdgParent | Out-Null

    $init = Invoke-LeanCtx @('config', 'init', '--full')
    if ($init.ExitCode -ne 0) {
      Write-Warn "config init --full failed: $($init.Output)"
    } else {
      Write-Ok 'Initialized global config (lean-ctx config init --full)'
      $changed = $true
    }

    if (-not (Test-Path -LiteralPath $PreferredPath) -and (Test-Path -LiteralPath $LegacyPath)) {
      Backup-ConfigFile -Path $PreferredPath
      Copy-Item -LiteralPath $LegacyPath -Destination $PreferredPath -Force
      Write-Note "Copied legacy config -> XDG path."
      $changed = $true
    }
  }

  $targetPath = if (Test-Path -LiteralPath $PreferredPath) { $PreferredPath } else { $LegacyPath }

  foreach ($entry in $ModMeGlobalPreset.GetEnumerator()) {
    $key = $entry.Key
    $value = $entry.Value
    if (Test-TomlKeyExists -Path $targetPath -Key $key -and -not $Force) {
      Write-Note "Preset key present (skip): $key"
      continue
    }
    if (Apply-PresetKey -Path $targetPath -Key $key -Value $value -ForceApply:$Force) {
      $changed = $true
    }
  }

  return $changed
}

# --- Phase 1: Detect ---

$leanCtxPath = Get-LeanCtxCommand
if (-not $leanCtxPath) {
  Write-Host '[lean-ctx ensure] FAIL: lean-ctx not on PATH.' -ForegroundColor Red
  Write-Host '  Install: https://github.com/yvgude/lean-ctx | then: lean-ctx onboard'
  exit 1
}

Write-Info "lean-ctx: $leanCtxPath"
$paths = Get-ConfigPaths
Write-Note "Preferred config (XDG): $($paths.Preferred)"
if (Test-Path -LiteralPath $paths.Legacy) {
  Write-Warn ("Legacy config detected: {0} (deprecation path; use XDG)" -f $paths.Legacy)
}

$validate = Invoke-LeanCtx @('config', 'validate')
if ($validate.ExitCode -eq 0) {
  Write-Ok 'config validate: pass'
} else {
  Write-Warn ("config validate: fail - {0}" -f $validate.Output)
}

$doctor = Invoke-LeanCtx @('doctor')
if ($doctor.Output -match 'Summary:\s+\d+/\d+') {
  Write-Note ($doctor.Output -split "`n" | Select-Object -Last 3 | Out-String).Trim()
} else {
  Write-Note 'lean-ctx doctor completed (see yarn lean-ctx:doctor for full output)'
}

$sessionId = Get-SessionId
$configChanged = $false

# --- Phase 2: Auto-apply (safe defaults) ---

if (-not $ProjectOnly) {
  $globalChanged = Ensure-GlobalConfig -PreferredPath $paths.Preferred -LegacyPath $paths.Legacy
  if ($globalChanged) { $configChanged = $true }
}

$projectChanged = Ensure-ProjectToml
if ($projectChanged) { $configChanged = $true }

if (-not $CheckOnly -and -not $ProjectOnly) {
  $schemaChanged = Sync-ConfigSchema
  if ($schemaChanged) { $configChanged = $true }
} elseif (-not (Test-Path -LiteralPath $SchemaPath)) {
  Write-Warn 'Schema snapshot missing at docs/lean-ctx/config-schema.json (run yarn lean-ctx:schema:sync).'
}

if ($configChanged -and -not $CheckOnly) {
  $restart = Invoke-LeanCtx @('restart')
  if ($restart.ExitCode -eq 0) {
    Write-Ok 'lean-ctx restart (config changes applied)'
  } else {
    Write-Note "lean-ctx restart: $($restart.Output)"
  }
}

# --- Phase 3: Adoption nudge (configured but unused) ---

$validateOk = ($validate.ExitCode -eq 0)
$configPresent = (Test-Path -LiteralPath $paths.Preferred) -or (Test-Path -LiteralPath $paths.Legacy)

if ($validateOk -and $configPresent -and -not (Test-LeanCtxUsedInSession)) {
  Show-AdoptionNudge -SessionId $sessionId
}

if ($CheckOnly) {
  Write-Note 'CheckOnly mode - no writes performed.'
}

exit 0
