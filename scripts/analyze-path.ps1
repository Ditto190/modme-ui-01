
<#
.SYNOPSIS
    Analyze PATH and suggest removals to get under 2047 characters
#>

param(
    [switch]$RemoveSuggested,
    [switch]$Interactive
)

Write-Host "PATH Analysis - Getting under 2047 characters" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

$userPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
$entries = $userPath -split ';' | Where-Object { $_.Trim() }

Write-Host "`nCurrent User PATH: $($userPath.Length) characters" -ForegroundColor $(if ($userPath.Length -gt 2047) { "Red" } else { "Green" })
Write-Host "Total entries: $($entries.Count)"
Write-Host "Need to remove: $([Math]::Max(0, $userPath.Length - 2047)) characters`n" -ForegroundColor Red

# Categorize entries
$categories = @{
    Python          = @()
    NodeJS          = @()
    Cloud           = @()
    DevTools        = @()
    PackageManagers = @()
    Optional        = @()
    Keep            = @()
}

foreach ($entry in $entries) {
    $lower = $entry.ToLower()
    
    if ($lower -match 'python3|miniconda|conda|text-generation') {
        $categories.Python += $entry
    }
    elseif ($lower -match 'node|npm|pnpm|nvm') {
        $categories.NodeJS += $entry
    }
    elseif ($lower -match 'azure|google|cloud|aws') {
        $categories.Cloud += $entry
    }
    elseif ($lower -match 'pycharm|vscode|git(?!hub)|terraform|vagrant|docker') {
        $categories.DevTools += $entry
    }
    elseif ($lower -match 'chocolatey|scoop|packer') {
        $categories.PackageManagers += $entry
    }
    elseif ($lower -match 'oculus|razer|chroma|elastic|dapr|fly|maven|tesseract|gtk3|ffmpeg') {
        $categories.Optional += $entry
    }
    else {
        $categories.Keep += $entry
    }
}

# Show categories
Write-Host "ANALYSIS:" -ForegroundColor Yellow
Write-Host "---------"

Write-Host "`n✅ KEEP (Essential - $($categories.Keep.Count) entries):" -ForegroundColor Green
$categories.Keep | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }

Write-Host "`n🐍 PYTHON ($($categories.Python.Count) entries) - Consider keeping only Python 3.12:" -ForegroundColor Yellow
$categories.Python | ForEach-Object { Write-Host "  $_" }

Write-Host "`n📦 NODE/NPM ($($categories.NodeJS.Count) entries):" -ForegroundColor Cyan
$categories.NodeJS | ForEach-Object { Write-Host "  $_" }

Write-Host "`n☁️  CLOUD TOOLS ($($categories.Cloud.Count) entries):" -ForegroundColor Cyan
$categories.Cloud | ForEach-Object { Write-Host "  $_" }

Write-Host "`n🛠️  DEV TOOLS ($($categories.DevTools.Count) entries):" -ForegroundColor Cyan
$categories.DevTools | ForEach-Object { Write-Host "  $_" }

Write-Host "`n📦 PACKAGE MANAGERS ($($categories.PackageManagers.Count) entries):" -ForegroundColor Cyan
$categories.PackageManagers | ForEach-Object { Write-Host "  $_" }

Write-Host "`n⚠️  OPTIONAL/REMOVABLE ($($categories.Optional.Count) entries):" -ForegroundColor Red
$categories.Optional | ForEach-Object { Write-Host "  $_" }

# Suggestions
Write-Host "`n" 
Write-Host "RECOMMENDATIONS TO GET UNDER 2047 CHARACTERS:" -ForegroundColor Yellow
Write-Host "=" * 50

$toRemove = @()

# Suggest Python cleanup
$pythonVersions = $categories.Python | Where-Object { $_ -match 'Python3(10|11|12)\\?$' }
if ($pythonVersions.Count -gt 1) {
    Write-Host "`n1. Keep only Python 3.12 (remove Python 3.10 and 3.11):" -ForegroundColor Yellow
    $pythonVersions | Where-Object { $_ -notmatch 'Python312' } | ForEach-Object {
        Write-Host "   REMOVE: $_" -ForegroundColor Red
        $toRemove += $_
    }
}

# Old text-generation-webui
$textGen = $categories.Python | Where-Object { $_ -match 'text-generation' }
if ($textGen) {
    Write-Host "`n2. Remove old text-generation-webui entries:" -ForegroundColor Yellow
    $textGen | ForEach-Object {
        Write-Host "   REMOVE: $_" -ForegroundColor Red
        $toRemove += $_
    }
}

# Optional tools
if ($categories.Optional.Count -gt 0) {
    Write-Host "`n3. Remove optional tools you don't use regularly:" -ForegroundColor Yellow
    $categories.Optional | ForEach-Object {
        Write-Host "   REMOVE: $_" -ForegroundColor Red
        $toRemove += $_
    }
}

# Calculate savings
$removeString = ($toRemove -join ';').Length + $toRemove.Count
Write-Host "`n" 
Write-Host "ESTIMATED SAVINGS: $removeString characters" -ForegroundColor Green

$newLength = $userPath.Length - $removeString
Write-Host "New PATH length would be: $newLength characters" -ForegroundColor $(if ($newLength -le 2047) { "Green" } else { "Yellow" })

if ($newLength -gt 2047) {
    $stillNeed = $newLength - 2047
    Write-Host "⚠️  Still need to remove $stillNeed more characters" -ForegroundColor Red
}

# Apply changes if requested
if ($RemoveSuggested) {
    Write-Host "`n" 
    $confirm = Read-Host "Remove suggested entries? This will backup your current PATH. (yes/no)"
    
    if ($confirm -eq 'yes') {
        # Backup
        $backupDir = Join-Path $PSScriptRoot "path-backups"
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir | Out-Null
        }
        
        $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
        $backupFile = Join-Path $backupDir "User_PATH_before_removal_$timestamp.txt"
        $userPath | Out-File $backupFile -Encoding UTF8
        Write-Host "✅ Backup saved: $backupFile" -ForegroundColor Green
        
        # Remove entries
        $newEntries = $entries | Where-Object { $_ -notin $toRemove }
        $newPath = $newEntries -join ';'
        
        [Environment]::SetEnvironmentVariable("Path", $newPath, [EnvironmentVariableTarget]::User)
        
        Write-Host "✅ User PATH updated!" -ForegroundColor Green
        Write-Host "New length: $($newPath.Length) characters" -ForegroundColor Green
        Write-Host "⚠️  Restart terminals for changes to take effect" -ForegroundColor Yellow
    }
    else {
        Write-Host "Cancelled." -ForegroundColor Yellow
    }
}
else {
    Write-Host "`n" 
    Write-Host "To apply these removals, run:" -ForegroundColor Cyan
    Write-Host "  .\scripts\analyze-path.ps1 -RemoveSuggested" -ForegroundColor Yellow
}
