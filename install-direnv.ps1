# install-direnv.ps1 - PowerShell script to install direnv on Windows

$ErrorActionPreference = "Stop"

$direnvUrl = "https://github.com/direnv/direnv/releases/download/v2.37.1/direnv.windows-amd64"
$binDir = "$Home\bin"
$direnvPath = "$binDir\direnv.exe"

Write-Output "Checking if direnv is already installed..."
if (Get-Command direnv -ErrorAction SilentlyContinue) {
    Write-Output "direnv is already installed and available in your PATH."
    Write-Output "Location: $((Get-Command direnv).Source)"
    exit 0
}

# Method 1: Scoop
$scoopPath = "$Home\scoop\shims\scoop.cmd"
if (Test-Path $scoopPath) {
    Write-Output "Found Scoop installation at $Home\scoop. Attempting to install direnv via Scoop..."
    try {
        Start-Process -FilePath $scoopPath -ArgumentList "install direnv" -NoNewWindow -Wait
        if (Get-Command direnv -ErrorAction SilentlyContinue) {
            Write-Output "Successfully installed direnv using Scoop!"
            exit 0
        }
    } catch {
        Write-Warning "Scoop installation failed: $_"
    }
}

# Method 2: Manual download
Write-Output "Installing manually by downloading direnv binary..."
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir | Out-Null
    Write-Output "Created directory: $binDir"
}

Write-Output "Downloading direnv v2.37.1..."
try {
    # Using basic parsing to avoid IE dependency issues
    Invoke-WebRequest -Uri $direnvUrl -OutFile $direnvPath -UseBasicParsing
    Write-Output "Download complete: $direnvPath"
} catch {
    Write-Error "Failed to download direnv: $_"
    exit 1
}

# Add to user PATH
Write-Output "Ensuring $binDir is in User PATH..."
$userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$binDir*") {
    $newUserPath = $userPath + ";" + $binDir
    [System.Environment]::SetEnvironmentVariable("PATH", $newUserPath, "User")
    Write-Output "Added $binDir to User PATH."
    Write-Output "NOTE: You may need to restart your terminal or VS Code for the PATH change to take effect."
} else {
    Write-Output "$binDir is already in User PATH."
}

Write-Output "direnv manual installation completed successfully!"
Write-Output "Executable path: $direnvPath"
