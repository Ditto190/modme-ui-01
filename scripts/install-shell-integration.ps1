<#
PowerShell helper to append VS Code shell integration snippet to the user's profile.
Creates a timestamped backup and avoids duplicate insertion.
#>

# Require PowerShell 7+ recommended but works in 5.x for basic file ops

$codeCmd = Get-Command code -ErrorAction SilentlyContinue
if (-not $codeCmd) {
    Write-Error "The 'code' CLI isn't available in PATH. Install VS Code's 'code' command and try again."
    exit 1
}

$profilePath = $Profile.CurrentUserCurrentHost
if (-not (Test-Path -Path $profilePath)) {
    New-Item -ItemType File -Force -Path $profilePath | Out-Null
}

$snippet = 'if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }'

# Read current content (safely)
$existing = Get-Content -Raw -ErrorAction SilentlyContinue -Path $profilePath
if ($existing -and ($existing -match [regex]::Escape('$(code --locate-shell-integration-path pwsh)'))) {
    Write-Output "Shell integration snippet already present in: $profilePath"
    exit 0
}

# Backup
$timestamp = Get-Date -Format yyyyMMddHHmmss
$backup = "${profilePath}.bak.${timestamp}"
Copy-Item -Path $profilePath -Destination $backup -Force

# Append snippet with a comment marker
Add-Content -Path $profilePath -Value "`n# VS Code shell integration (added by modme-ui helper)`n$snippet`n"

Write-Output "Added shell integration snippet to: $profilePath"
Write-Output "Backup created at: $backup"
Write-Output "Restart VS Code or open a new integrated terminal to activate shell integration."