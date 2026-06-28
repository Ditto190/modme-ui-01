# Ensure lean-ctx is configured for ModMe hybrid workflow (detect + safe auto-apply).
# Project .lean-ctx.toml is NEVER overwritten once it exists (hand-tuned multi-agent config).
# Usage:
#   .\scripts\ensure-lean-ctx-config.ps1              # project-first (default; no global writes)
#   .\scripts\ensure-lean-ctx-config.ps1 -CheckOnly   # read-only report (exit 0 unless binary missing)
#   .\scripts\ensure-lean-ctx-config.ps1 -IncludeGlobal  # also bootstrap minimal ~/.config/lean-ctx/config.toml
#   .\scripts\ensure-lean-ctx-config.ps1 -Force       # overwrite customized GLOBAL keys only (destructive)
#   .\scripts\ensure-lean-ctx-config.ps1 -ProjectOnly # project dirs + .lean-ctx.toml + schema only
#
# Exit codes:
#   0 = ok, or advisory nudge only
#   1 = lean-ctx binary not on PATH (cannot auto-install)

param(
  [switch]$CheckOnly,
  [switch]$Force,
  [switch]$ProjectOnly,
  [switch]$IncludeGlobal
)

$ErrorActionPreference = 'Continue'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$ProjectToml = Join-Path $RepoRoot '.lean-ctx.toml'
$ProjectTomlExample = Join-Path $RepoRoot '.lean-ctx.toml.example'
$LoadEnvScript = Join-Path $ScriptDir 'load-lean-ctx-env.ps1'
$SchemaPath = Join-Path $RepoRoot 'docs/lean-ctx/config-schema.json'
$StateDir = Join-Path $RepoRoot '.cursor/hooks/state'
$MarkersPath = Join-Path $StateDir 'lean-ctx-session-markers.jsonl'

$MinimalGlobalExample = Join-Path $RepoRoot 'docs/lean-ctx/global-config.minimal.toml.example'

# Legacy: only applied with -IncludeGlobal -Force (project .lean-ctx.toml is source of truth)
$ModMeGlobalPreset = [ordered]@{
  compression_level     = 'max'
  memory_profile        = 'balanced'
  tool_profile          = 'power'
  proxy_enabled         = 'true'
  tee_mode              = 'failures'
  max_ram_percent       = '5'
  graph_index_max_files = '15000'
}

# Project config source of truth: .lean-ctx.toml.example (never auto-overwrite .lean-ctx.toml)

function Show-Help {
  @"
ensure-lean-ctx-config - detect + safe auto-apply ModMe lean-ctx defaults

Options:
  -CheckOnly     Report only; no writes (default for vibe-session-finish pre-flight)
  -Force         Overwrite existing global preset keys (destructive; backs up .bak first)
  -ProjectOnly   Explicit project-only mode (default behaviour even without this flag)
  -IncludeGlobal  Bootstrap minimal ~/.config/lean-ctx/config.toml from docs template

Examples:
  yarn lean-ctx:ensure
  yarn lean-ctx:ensure -- -CheckOnly
  yarn lean-ctx:trust
  .\scripts\ensure-lean-ctx-config.ps1 -IncludeGlobal
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
  $candidates = @(
    (Join-Path $env:USERPROFILE '.local/bin/lean-ctx.exe'),
    (Join-Path $env:USERPROFILE '.local/bin/lean-ctx.cmd'),
    (Join-Path $env:APPDATA 'npm/lean-ctx.cmd')
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }
  $cmd = Get-Command lean-ctx -ErrorAction SilentlyContinue
  if (-not $cmd) { return $null }
  return $cmd.Source
}

function Invoke-LeanCtxTrust {
  $leanCtx = Get-LeanCtxCommand
  if (-not $leanCtx) { return $false }

  $status = & $leanCtx trust status 2>&1 | Out-String
  if ($status -match 'Trust:\s+trusted') {
    Write-Ok 'Workspace trust: trusted (security-sensitive overrides active)'
    return $true
  }
  if ($status -notmatch 'lean-ctx trust') {
    Write-Note 'Workspace trust unavailable (lean-ctx < 3.8); LEAN_CTX_TRUST_WORKSPACE=1 via load-lean-ctx-env.ps1'
    return $false
  }
  if ($CheckOnly) {
    Write-Warn 'Workspace untrusted - run: yarn lean-ctx:trust'
    return $false
  }

  $trust = & $leanCtx trust 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0 -and $trust -match 'Trusted workspace') {
    Write-Ok 'Workspace trusted (one-time per .lean-ctx.toml hash)'
    return $true
  }
  Write-Warn "lean-ctx trust failed: $trust"
  return $false
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
  $bin = if ($script:LeanCtxBin) { $script:LeanCtxBin } else { 'lean-ctx' }
  $output = & $bin @LeanArgs 2>&1
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

function Test-ProjectTomlDuplicateKeys([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return @() }
  $section = '@root'
  $sections = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*\[\[.+\]\]\s*$') { continue }
    if ($line -match '^\s*\[(.+)\]\s*$') {
      $section = $Matches[1].Trim()
      continue
    }
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*([A-Za-z0-9_]+)\s*=') {
      $key = $Matches[1]
      if (-not $sections.ContainsKey($section)) { $sections[$section] = @{} }
      $bag = $sections[$section]
      if ($bag.ContainsKey($key)) { $bag[$key]++ } else { $bag[$key] = 1 }
    }
  }
  $dupes = @()
  foreach ($sec in $sections.Keys) {
    foreach ($entry in $sections[$sec].GetEnumerator()) {
      if ($entry.Value -gt 1) {
        if ($sec -eq '@root') { $dupes += $entry.Key } else { $dupes += "$sec.$($entry.Key)" }
      }
    }
  }
  return $dupes
}

function Ensure-ProjectDataDirs {
  if (-not (Test-Path -LiteralPath $LoadEnvScript)) {
    Write-Warn "Missing $LoadEnvScript - skip project data dir setup."
    return $false
  }
  if ($CheckOnly) {
    Write-Note 'Would ensure data/lean-ctx + logs/lean-ctx via load-lean-ctx-env.ps1'
    return $false
  }
  $dirs = & $LoadEnvScript -RepoRoot $RepoRoot
  Write-Ok ("Project data: {0} | state: {1}" -f $dirs.DataDir, $dirs.StateDir)
  return $true
}

function Ensure-ProjectToml {
  if (Test-Path -LiteralPath $ProjectToml) {
    $dupes = Test-ProjectTomlDuplicateKeys -Path $ProjectToml
    if ($dupes.Count -gt 0) {
      Write-Warn ("Duplicate keys in .lean-ctx.toml (last wins): {0}" -f ($dupes -join ', '))
    } else {
      Write-Ok 'Project override exists: .lean-ctx.toml (protected - not overwritten)'
    }
    return $false
  }

  if ($CheckOnly) {
    Write-Warn 'Missing .lean-ctx.toml (would copy from .lean-ctx.toml.example).'
    return $true
  }

  if (-not (Test-Path -LiteralPath $ProjectTomlExample)) {
    Write-Warn 'Missing .lean-ctx.toml.example - cannot bootstrap project config.'
    return $false
  }

  Copy-Item -LiteralPath $ProjectTomlExample -Destination $ProjectToml -Force
  Write-Ok 'Created .lean-ctx.toml from .lean-ctx.toml.example (one-time bootstrap)'
  return $true
}

function Ensure-GlobalConfig([string]$PreferredPath, [string]$LegacyPath) {
  $changed = $false
  $needsInit = -not (Test-Path -LiteralPath $PreferredPath)

  if (Test-Path -LiteralPath $LegacyPath) {
    Write-Warn ("Legacy config at {0} - remove or migrate to XDG ({1})" -f $LegacyPath, $PreferredPath)
  }

  if (-not (Test-Path -LiteralPath $MinimalGlobalExample)) {
    Write-Warn "Missing $MinimalGlobalExample - skip global bootstrap."
    return $false
  }

  if ($needsInit -or $Force) {
    if ($CheckOnly) {
      if ($needsInit) {
        Write-Warn "Global config missing at $PreferredPath (would copy minimal template)."
      } elseif ($Force) {
        Write-Warn "Would overwrite global config with minimal template (-Force)."
      }
      return $needsInit -or $Force
    }

    $xdgParent = Split-Path -Parent $PreferredPath
    New-Item -ItemType Directory -Force -Path $xdgParent | Out-Null
    if (Test-Path -LiteralPath $PreferredPath) { Backup-ConfigFile -Path $PreferredPath }
    Copy-Item -LiteralPath $MinimalGlobalExample -Destination $PreferredPath -Force
    Write-Ok "Global baseline -> $PreferredPath (ModMe overrides stay in .lean-ctx.toml)"
    return $true
  }

  Write-Note 'Global config present (skip; use -IncludeGlobal -Force to reset minimal baseline)'
  return $false
}

function Warn-MissingExtraRoots {
  if (-not (Test-Path -LiteralPath $ProjectToml)) { return }
  $inExtraRoots = $false
  foreach ($line in Get-Content -LiteralPath $ProjectToml) {
    if ($line -match '^\s*extra_roots\s*=') {
      if ($line -match '\]\s*$') { continue }
      $inExtraRoots = $true
      continue
    }
    if ($inExtraRoots -and $line -match '^\s*\]') {
      $inExtraRoots = $false
      continue
    }
    if ($inExtraRoots -and $line -match '^\s*["'']([^"'']+)["'']') {
      $rel = $Matches[1]
      $candidate = Join-Path $RepoRoot $rel
      if (-not (Test-Path -LiteralPath $candidate)) {
        Write-Note "extra_roots path absent (optional, skipped): $rel"
      }
    }
  }
}

# --- Phase 1: Detect ---

if (Test-Path -LiteralPath $LoadEnvScript) {
  . $LoadEnvScript -RepoRoot $RepoRoot | Out-Null
}

$script:LeanCtxBin = Get-LeanCtxCommand
$leanCtxPath = $script:LeanCtxBin
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

Warn-MissingExtraRoots

$sessionId = Get-SessionId
$configChanged = $false

# --- Phase 2: Auto-apply (safe defaults) ---

$dataDirChanged = Ensure-ProjectDataDirs
if ($dataDirChanged) { $configChanged = $true }

$trustChanged = Invoke-LeanCtxTrust

if ($IncludeGlobal) {
  $globalChanged = Ensure-GlobalConfig -PreferredPath $paths.Preferred -LegacyPath $paths.Legacy
  if ($globalChanged) { $configChanged = $true }
} else {
  Write-Note 'Project-first mode - global config untouched (use -IncludeGlobal to bootstrap minimal ~/.config/lean-ctx/config.toml)'
}

$projectChanged = Ensure-ProjectToml
if ($projectChanged) { $configChanged = $true }

if (-not $CheckOnly) {
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

$worktreeDev = Join-Path (Split-Path -Parent $RepoRoot) 'Monorepo_ModMe-dev/dev'
if (-not (Test-Path -LiteralPath $worktreeDev)) {
  Write-Note "extra_roots worktree not present ($worktreeDev) - auto-reroot still indexes primary monorepo"
}

exit 0
