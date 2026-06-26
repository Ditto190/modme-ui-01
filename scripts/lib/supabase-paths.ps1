# Shared paths for Supabase CLI (workdir = next-forge/, run bunx from packages/database/)

function Get-ModMeRepoRoot {
  param([string]$StartDir = (Get-Location).Path)
  $dir = $StartDir
  while ($dir) {
    if (Test-Path (Join-Path $dir 'package.json')) {
      $pkg = Get-Content (Join-Path $dir 'package.json') -Raw | ConvertFrom-Json
      if ($pkg.name -eq 'monorepo_modme-root') { return $dir }
    }
    $parent = Split-Path $dir -Parent
    if ($parent -eq $dir) { break }
    $dir = $parent
  }
  throw "Could not find Monorepo_ModMe root (monorepo_modme-root package.json) from $StartDir"
}

function Get-ForgePaths {
  param([string]$RepoRoot = (Get-ModMeRepoRoot))
  @{
    RepoRoot    = $RepoRoot
    ForgeRoot   = Join-Path $RepoRoot 'next-forge'
    DatabasePkg = Join-Path $RepoRoot 'next-forge\packages\database'
    SupabaseDir = Join-Path $RepoRoot 'next-forge'
    RootEnv     = Join-Path $RepoRoot '.env'
    DatabaseEnv = Join-Path $RepoRoot 'next-forge\packages\database\.env'
    AppEnvLocal = Join-Path $RepoRoot 'next-forge\apps\app\.env.local'
  }
}

function Invoke-SupabaseCli {
  param(
    [string[]]$CliArgs,
    [hashtable]$Paths = (Get-ForgePaths),
    [switch]$AllowFailure
  )
  Push-Location $Paths.DatabasePkg
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & bunx supabase @CliArgs --workdir $Paths.SupabaseDir 2>&1 | Out-Host
    if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
      throw "supabase $($CliArgs -join ' ') failed (exit $LASTEXITCODE)"
    }
    return $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $prevEap
    Pop-Location
  }
}

function Get-SupabaseLocalStatus {
  param([hashtable]$Paths = (Get-ForgePaths))
  Push-Location $Paths.DatabasePkg
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & bunx supabase status --workdir $Paths.SupabaseDir -o json 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw 'Local Supabase is not running. Run: yarn supabase:local:setup'
    }
    $text = ($output | Out-String).Trim()
    $start = $text.IndexOf('{')
    $end = $text.LastIndexOf('}')
    if ($start -lt 0 -or $end -le $start) {
      throw "Could not parse supabase status JSON. Output: $text"
    }
    return ($text.Substring($start, $end - $start + 1) | ConvertFrom-Json)
  }
  finally {
    $ErrorActionPreference = $prevEap
    Pop-Location
  }
}

function Set-DotEnvFile {
  param(
    [string]$Path,
    [hashtable]$Values
  )
  $lines = @()
  if (Test-Path $Path) {
    $lines = Get-Content $Path
  }
  $keys = @{}
  foreach ($line in $lines) {
    if ($line -match '^([A-Z_][A-Z0-9_]*)=') {
      $keys[$Matches[1]] = $true
    }
  }
  $updated = New-Object System.Collections.Generic.List[string]
  foreach ($line in $lines) {
    if ($line -match '^([A-Z_][A-Z0-9_]*)=') {
      $key = $Matches[1]
      if ($Values.ContainsKey($key)) {
        $updated.Add("$key=$($Values[$key])")
        $Values.Remove($key) | Out-Null
        continue
      }
    }
    $updated.Add($line)
  }
  foreach ($entry in $Values.GetEnumerator()) {
    $updated.Add("$($entry.Key)=$($entry.Value)")
  }
  $dir = Split-Path $Path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Set-Content -Path $Path -Value ($updated -join "`n") -Encoding utf8
}

function Import-DotEnvFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^([A-Z_][A-Z0-9_]*)=(.*)$') {
      $key = $Matches[1]
      $value = $Matches[2].Trim().Trim('"').Trim("'")
      Set-Item -Path "env:$key" -Value $value
    }
  }
}
