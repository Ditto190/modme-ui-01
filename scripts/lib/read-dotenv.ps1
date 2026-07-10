function Get-DotEnvMap {
    param(
        [Parameter(Mandatory = $true)][string]$Path
    )

    if (-not (Test-Path $Path)) {
        throw "Env file not found: $Path"
    }

    $map = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) { return }
        if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $key = $Matches[1]
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            $map[$key] = $value
        }
    }
    return $map
}

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Key
    )

    $map = Get-DotEnvMap -Path $Path
    if ($map.ContainsKey($Key)) { return $map[$Key] }
    return $null
}

function Set-DotEnvFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][hashtable]$Values,
        [switch]$Merge
    )

    $existing = @{}
    if ($Merge -and (Test-Path $Path)) {
        $existing = Get-DotEnvMap -Path $Path
    }

    foreach ($entry in $Values.GetEnumerator()) {
        if ($entry.Value) { $existing[$entry.Key] = $entry.Value }
    }

    $dir = Split-Path $Path -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $lines = @()
    foreach ($key in ($existing.Keys | Sort-Object)) {
        $lines += "$key=$($existing[$key])"
    }
    Set-Content -Path $Path -Value ($lines -join "`n") -Encoding UTF8
}
function Update-DotEnvKeys {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][hashtable]$Values
    )

    $dir = Split-Path $Path -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $lines = @()
    if (Test-Path $Path) {
        $lines = [System.Collections.Generic.List[string]]@(Get-Content $Path)
    } else {
        $lines = [System.Collections.Generic.List[string]]@()
    }

    foreach ($entry in $Values.GetEnumerator()) {
        if (-not $entry.Value) { continue }
        $key = $entry.Key
        $val = $entry.Value
        $idx = -1
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $trim = $lines[$i].Trim()
            if ($trim.StartsWith('#')) { continue }
            if ($trim -match "^$([regex]::Escape($key))\s*=") {
                $idx = $i
                break
            }
        }
        $newLine = "$key=$val"
        if ($idx -ge 0) {
            $lines[$idx] = $newLine
        } else {
            if ($lines.Count -gt 0 -and $lines[-1].Trim() -ne '') {
                $lines.Add('')
            }
            $lines.Add("# Turbo remote cache (setup-turbo-remote-cache.ps1)")
            $lines.Add($newLine)
        }
    }

    Set-Content -Path $Path -Value ($lines -join "`n") -Encoding UTF8
}

function Remove-DotEnvKeys {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string[]]$Keys
    )

    if (-not (Test-Path $Path)) { return }

    $keySet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($k in $Keys) { [void]$keySet.Add($k) }

    $lines = [System.Collections.Generic.List[string]]@(Get-Content $Path)
    $removed = $false
    for ($i = $lines.Count - 1; $i -ge 0; $i--) {
        $trim = $lines[$i].Trim()
        if ($trim.StartsWith('#')) { continue }
        if ($trim -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=') {
            if ($keySet.Contains($Matches[1])) {
                $lines.RemoveAt($i)
                $removed = $true
            }
        }
    }

    if ($removed) {
        Set-Content -Path $Path -Value ($lines -join "`n") -Encoding UTF8
    }
}
