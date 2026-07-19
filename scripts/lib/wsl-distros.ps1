# WSL distro name helpers (UTF-16 safe on Windows).

function Get-WslDistroNames {
    $raw = (wsl -l -q 2>&1 | Out-String) -replace "`0", ''
    return @($raw -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Get-WslUbuntuDistro {
    $names = Get-WslDistroNames
    $match = @($names | Where-Object { $_ -match '^Ubuntu' } | Select-Object -First 1)
    if ($match.Count -eq 0) { return @() }
    return @($match[0])
}
