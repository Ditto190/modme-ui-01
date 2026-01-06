#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Audit and clean Windows PATH environment variable
.DESCRIPTION
    Analyzes PATH entries, identifies duplicates and invalid paths, 
    and optionally removes them to stay under the 2047 character limit.
#>

param(
    [switch]$DryRun = $true,
    [switch]$RemoveInvalid,
    [switch]$RemoveDuplicates,
    [ValidateSet("User", "Machine", "Both")]
    [string]$Scope = "Both"
)

function Get-PathEntries {
    param([string]$Scope)
    
    $paths = @()
    
    if ($Scope -in @("User", "Both")) {
        $userPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
        if ($userPath) {
            $paths += $userPath -split ';' | Where-Object { $_ } | ForEach-Object {
                [PSCustomObject]@{
                    Path   = $_
                    Scope  = "User"
                    Exists = Test-Path $_
                    Length = $_.Length
                }
            }
        }
    }
    
    if ($Scope -in @("Machine", "Both")) {
        $machinePath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
        if ($machinePath) {
            $paths += $machinePath -split ';' | Where-Object { $_ } | ForEach-Object {
                [PSCustomObject]@{
                    Path   = $_
                    Scope  = "Machine"
                    Exists = Test-Path $_
                    Length = $_.Length
                }
            }
        }
    }
    
    return $paths
}

function Show-PathAnalysis {
    param($Entries)
    
    Write-Host "`n=== PATH ANALYSIS ===" -ForegroundColor Cyan
    
    $userEntries = $Entries | Where-Object { $_.Scope -eq "User" }
    $machineEntries = $Entries | Where-Object { $_.Scope -eq "Machine" }
    
    $userLength = ($userEntries.Path -join ';').Length
    $machineLength = ($machineEntries.Path -join ';').Length
    
    Write-Host "`nUser PATH:" -ForegroundColor Yellow
    Write-Host "  Total entries: $($userEntries.Count)"
    Write-Host "  Total length: $userLength characters" -ForegroundColor $(if ($userLength -gt 2047) { "Red" } else { "Green" })
    Write-Host "  Invalid paths: $($userEntries | Where-Object { -not $_.Exists } | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Red
    
    Write-Host "`nMachine PATH:" -ForegroundColor Yellow
    Write-Host "  Total entries: $($machineEntries.Count)"
    Write-Host "  Total length: $machineLength characters" -ForegroundColor $(if ($machineLength -gt 2047) { "Red" } else { "Green" })
    Write-Host "  Invalid paths: $($machineEntries | Where-Object { -not $_.Exists } | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Red
    
    # Find duplicates
    $duplicates = $Entries | Group-Object Path | Where-Object { $_.Count -gt 1 }
    if ($duplicates) {
        Write-Host "`nDuplicate entries found: $($duplicates.Count)" -ForegroundColor Red
        $duplicates | ForEach-Object {
            Write-Host "  - $($_.Name) (appears $($_.Count) times)"
        }
    }
    
    # Show invalid paths
    $invalid = $Entries | Where-Object { -not $_.Exists }
    if ($invalid) {
        Write-Host "`nInvalid paths (don't exist):" -ForegroundColor Red
        $invalid | ForEach-Object {
            Write-Host "  [$($_.Scope)] $($_.Path)"
        }
    }
}

function Remove-PathEntry {
    param(
        [string]$PathToRemove,
        [string]$Scope
    )
    
    $target = if ($Scope -eq "User") { 
        [EnvironmentVariableTarget]::User 
    }
    else { 
        [EnvironmentVariableTarget]::Machine 
    }
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", $target)
    $paths = $currentPath -split ';' | Where-Object { $_ -and $_ -ne $PathToRemove }
    $newPath = $paths -join ';'
    
    [Environment]::SetEnvironmentVariable("Path", $newPath, $target)
}

# Main execution
Write-Host "PATH Cleanup Utility" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

$entries = Get-PathEntries -Scope $Scope
Show-PathAnalysis -Entries $entries

if ($DryRun) {
    Write-Host "`n⚠️  DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host "Run with -DryRun:`$false to apply changes`n"
    
    if ($RemoveInvalid) {
        Write-Host "Would remove invalid paths:" -ForegroundColor Yellow
        $entries | Where-Object { -not $_.Exists } | ForEach-Object {
            Write-Host "  [$($_.Scope)] $($_.Path)"
        }
    }
    
    if ($RemoveDuplicates) {
        Write-Host "`nWould remove duplicate entries:" -ForegroundColor Yellow
        $entries | Group-Object Path | Where-Object { $_.Count -gt 1 } | ForEach-Object {
            Write-Host "  Keep 1, remove $($_.Count - 1): $($_.Name)"
        }
    }
}
else {
    Write-Host "`n⚠️  MAKING CHANGES - Creating backup..." -ForegroundColor Red
    
    # Backup current PATH
    $backupFile = "PATH_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
    $entries | ForEach-Object { "$($_.Scope)|$($_.Path)" } | Out-File $backupFile
    Write-Host "Backup saved to: $backupFile" -ForegroundColor Green
    
    if ($RemoveInvalid) {
        $invalid = $entries | Where-Object { -not $_.Exists }
        Write-Host "`nRemoving invalid paths..." -ForegroundColor Yellow
        foreach ($entry in $invalid) {
            Write-Host "  Removing: $($entry.Path)"
            Remove-PathEntry -PathToRemove $entry.Path -Scope $entry.Scope
        }
    }
    
    if ($RemoveDuplicates) {
        Write-Host "`nRemoving duplicates..." -ForegroundColor Yellow
        $duplicates = $entries | Group-Object Path | Where-Object { $_.Count -gt 1 }
        foreach ($dup in $duplicates) {
            $toRemove = $dup.Group | Select-Object -Skip 1
            foreach ($entry in $toRemove) {
                Write-Host "  Removing duplicate: $($entry.Path)"
                Remove-PathEntry -PathToRemove $entry.Path -Scope $entry.Scope
            }
        }
    }
    
    Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
    Write-Host "⚠️  You may need to restart applications for changes to take effect.`n"
}

Write-Host "`nUsage examples:" -ForegroundColor Cyan
Write-Host "  .\cleanup-path.ps1                                    # Analyze only (dry run)"
Write-Host "  .\cleanup-path.ps1 -RemoveInvalid                     # Preview invalid path removal"
Write-Host "  .\cleanup-path.ps1 -RemoveInvalid -DryRun:`$false     # Actually remove invalid paths"
Write-Host "  .\cleanup-path.ps1 -RemoveDuplicates -DryRun:`$false  # Remove duplicate entries"
Write-Host "  .\cleanup-path.ps1 -RemoveInvalid -RemoveDuplicates -DryRun:`$false  # Clean everything`n"
