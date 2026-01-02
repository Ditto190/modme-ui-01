<#
Sync `.env` values into the user's Claude settings file (~/.claude/settings.json).
This merges keys in the `.env` into the `env` object inside settings.json.

Usage: pwsh ./scripts/sync-env-to-claude-settings.ps1
#>

param(
    [string]$EnvPath = "./.env",
    [string]$SettingsPath = "$env:USERPROFILE\.claude\settings.json"
)

if (-not (Test-Path $EnvPath)) {
    Write-Error ".env not found at $EnvPath. Create one from .env.example first."
    exit 1
}

# map holds key/value pairs from .env
$map = @{}
Get-Content $EnvPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^#' -or $line -eq '') { return }
    $i = $line.IndexOf('=')
    if ($i -lt 0) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    # allow values with = in them
    $map[$k] = $v
}

if (-not (Test-Path $SettingsPath)) {
    Write-Output "settings.json not found at $SettingsPath. Creating a new template."
    $template = @{
        env         = @{}
        permissions = @{}
        hooks       = @{
            PreToolUse = @()
        }
    }
    $template | ConvertTo-Json -Depth 10 | Out-File -FilePath $SettingsPath -Encoding utf8
}

# get existing settings
$raw = Get-Content -Raw -Path $SettingsPath
$json = $raw | ConvertFrom-Json

if (-not $json.env) { $json | Add-Member -NotePropertyName env -NotePropertyValue @{} }

# Convert env to a hashtable so we can add arbitrary keys without property assignment errors
$envHash = @{}
if ($json.env -is [System.Collections.Hashtable]) {
    $envHash = $json.env
}
else {
    foreach ($p in $json.env.PSObject.Properties) {
        $envHash[$p.Name] = $p.Value
    }
}

foreach ($k in $map.Keys) {
    $envHash[$k] = $map[$k]
}

$json.env = $envHash

$json | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $SettingsPath -Encoding utf8
Write-Output "Updated $SettingsPath with values from $EnvPath"
