<#
.SYNOPSIS
    Simple PATH cleanup - works without admin for User PATH
.DESCRIPTION
    Cleans up User PATH (no admin needed) or Machine PATH (requires admin)
#>

param(
    [switch]$Apply,
    [switch]$UserOnly,
    [switch]$MachineOnly
)

function Clear-PathVariable {
    param(
        [string]$Scope,
        [bool]$Apply
    )
    
    $target = if ($Scope -eq "User") { 
        [EnvironmentVariableTarget]::User 
    }
    else { 
        [EnvironmentVariableTarget]::Machine 
    }
    
    Write-Host "`n=== Cleaning $Scope PATH ===" -ForegroundColor Cyan
    
    try {
        $currentPath = [Environment]::GetEnvironmentVariable("Path", $target)
        
        if (-not $currentPath) {
            Write-Host "No PATH variable found for $Scope" -ForegroundColor Yellow
            return
        }
        
        # Split and analyze
        $entries = $currentPath -split ';' | Where-Object { $_.Trim() }
        
        Write-Host "`nBefore cleanup:"
        Write-Host "  Total entries: $($entries.Count)"
        Write-Host "  Total length: $($currentPath.Length) characters" -ForegroundColor $(if ($currentPath.Length -gt 2047) { "Red" } else { "Green" })
        
        # Find duplicates and invalid paths
        $validEntries = @()
        $seen = @{}
        $removed = @{
            Duplicates = @()
            Invalid    = @()
        }
        
        foreach ($entry in $entries) {
            $normalized = $entry.Trim().TrimEnd('\')
            
            # Skip empty
            if (-not $normalized) { continue }
            
            # Check for duplicates
            if ($seen.ContainsKey($normalized.ToLower())) {
                $removed.Duplicates += $entry
                continue
            }
            
            # Check if path exists
            if (-not (Test-Path $normalized)) {
                $removed.Invalid += $entry
                Write-Host "  ❌ Invalid: $entry" -ForegroundColor Red
                continue
            }
            
            $seen[$normalized.ToLower()] = $true
            $validEntries += $normalized
        }
        
        # Show what will be removed
        if ($removed.Duplicates.Count -gt 0) {
            Write-Host "`nDuplicates to remove: $($removed.Duplicates.Count)" -ForegroundColor Yellow
            $removed.Duplicates | ForEach-Object { Write-Host "  - $_" }
        }
        
        if ($removed.Invalid.Count -gt 0) {
            Write-Host "`nInvalid paths to remove: $($removed.Invalid.Count)" -ForegroundColor Red
        }
        
        # Build new PATH
        $newPath = $validEntries -join ';'
        
        Write-Host "`nAfter cleanup:"
        Write-Host "  Total entries: $($validEntries.Count)"
        Write-Host "  Total length: $($newPath.Length) characters" -ForegroundColor Green
        Write-Host "  Savings: $($currentPath.Length - $newPath.Length) characters" -ForegroundColor Cyan
        
        if ($Apply) {
            # Backup first
            $backupDir = Join-Path $PSScriptRoot "path-backups"
            if (-not (Test-Path $backupDir)) {
                New-Item -ItemType Directory -Path $backupDir | Out-Null
            }
            
            $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
            $backupFile = Join-Path $backupDir "${Scope}_PATH_backup_$timestamp.txt"
            $currentPath | Out-File $backupFile -Encoding UTF8
            
            Write-Host "`n📝 Backup saved: $backupFile" -ForegroundColor Green
            
            # Apply changes
            [Environment]::SetEnvironmentVariable("Path", $newPath, $target)
            
            Write-Host "✅ $Scope PATH updated!" -ForegroundColor Green
            Write-Host "⚠️  Close and reopen terminals for changes to take effect" -ForegroundColor Yellow
        }
        else {
            Write-Host "`n⚠️  DRY RUN - No changes made. Add -Apply to actually clean PATH" -ForegroundColor Yellow
        }
        
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        if ($Scope -eq "Machine") {
            Write-Host "💡 Tip: Run as Administrator to modify Machine PATH" -ForegroundColor Yellow
        }
    }
}

# Main execution
Write-Host "PATH Cleanup Tool (Simple)" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

if ($MachineOnly) {
    Clear-PathVariable -Scope "Machine" -Apply $Apply
}
elseif ($UserOnly) {
    Clear-PathVariable -Scope "User" -Apply $Apply
}
else {
    Clear-PathVariable -Scope "User" -Apply $Apply
    
    # Try Machine PATH (will fail gracefully if not admin)
    try {
        Clear-PathVariable -Scope "Machine" -Apply $Apply
    }
    catch {
        Write-Host "`n⚠️  Skipping Machine PATH (requires Administrator)" -ForegroundColor Yellow
    }
}

Write-Host "`n" 
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  .\cleanup-path-simple.ps1                # Analyze only"
Write-Host "  .\cleanup-path-simple.ps1 -Apply         # Clean User PATH (no admin needed)"
Write-Host "  .\cleanup-path-simple.ps1 -UserOnly      # User PATH only"
Write-Host "`nFor Machine PATH, run PowerShell as Administrator:"
Write-Host '  Start-Process pwsh -Verb RunAs -ArgumentList "-NoExit", "-Command", "cd $PWD; .\scripts\cleanup-path-simple.ps1 -Apply"' -ForegroundColor Yellow
