#!/usr/bin/env pwsh
# Alignment check with github/github-mcp-server documentation

$ErrorActionPreference = 'Stop'

Write-Output "🔍 GitHub MCP Configuration Alignment Check"
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output ""

$path = "$env:APPDATA\Code\User\mcp.json"
$j = Get-Content $path -Raw | ConvertFrom-Json
$gh = $j.servers.github

$checks = @()

# Check 1: Docker command
if ($gh.command -eq "docker") {
    $checks += @{ Name = "Using Docker"; Status = "✅ PASS"; Detail = "Matches recommended approach" }
}
else {
    $checks += @{ Name = "Using Docker"; Status = "❌ FAIL"; Detail = "Should use 'docker' command" }
}

# Check 2: Stdio type
if ($gh.type -eq "stdio") {
    $checks += @{ Name = "Connection type"; Status = "✅ PASS"; Detail = "Using stdio (correct)" }
}
else {
    $checks += @{ Name = "Connection type"; Status = "❌ FAIL"; Detail = "Should be 'stdio'" }
}

# Check 3: Docker image
if ($gh.args -contains "ghcr.io/github/github-mcp-server") {
    $checks += @{ Name = "Docker image"; Status = "✅ PASS"; Detail = "Official image: ghcr.io/github/github-mcp-server" }
}
else {
    $checks += @{ Name = "Docker image"; Status = "❌ FAIL"; Detail = "Should use ghcr.io/github/github-mcp-server" }
}

# Check 4: Dynamic toolsets flag
$hasDynamic = $false
foreach ($arg in $gh.args) {
    if ($arg -match "GITHUB_DYNAMIC_TOOLSETS") {
        $hasDynamic = $true
        break
    }
}
if ($hasDynamic) {
    $checks += @{ Name = "Dynamic toolsets"; Status = "✅ PASS"; Detail = "GITHUB_DYNAMIC_TOOLSETS=1 is set" }
}
else {
    $checks += @{ Name = "Dynamic toolsets"; Status = "❌ FAIL"; Detail = "Missing GITHUB_DYNAMIC_TOOLSETS env var" }
}

# Check 5: PAT environment variable
if ($gh.args -contains "GITHUB_PERSONAL_ACCESS_TOKEN" -or ($gh.args -match "GITHUB_PERSONAL_ACCESS_TOKEN")) {
    $checks += @{ Name = "PAT env var"; Status = "✅ PASS"; Detail = "GITHUB_PERSONAL_ACCESS_TOKEN is passed" }
}
else {
    $checks += @{ Name = "PAT env var"; Status = "❌ FAIL"; Detail = "Missing GITHUB_PERSONAL_ACCESS_TOKEN" }
}

# Check 6: Docker flags
$requiredFlags = @("run", "-i", "--rm")
$missingFlags = @()
foreach ($flag in $requiredFlags) {
    if ($gh.args -notcontains $flag) {
        $missingFlags += $flag
    }
}
if ($missingFlags.Count -eq 0) {
    $checks += @{ Name = "Docker flags"; Status = "✅ PASS"; Detail = "run, -i, --rm all present" }
}
else {
    $checks += @{ Name = "Docker flags"; Status = "⚠️ WARN"; Detail = "Missing: $($missingFlags -join ', ')" }
}

# Check 7: PAT input configuration
$patInput = $j.inputs | Where-Object { $_.id -eq "GITHUB_PERSONAL_ACCESS_TOKEN" }
if ($patInput -and $patInput.password -eq $true) {
    $checks += @{ Name = "PAT input secure"; Status = "✅ PASS"; Detail = "Configured as password field" }
}
else {
    $checks += @{ Name = "PAT input secure"; Status = "⚠️ WARN"; Detail = "PAT input not secure or missing" }
}

# Display results
Write-Output "📋 Alignment Checklist:"
Write-Output ""
foreach ($check in $checks) {
    Write-Output "$($check.Status) $($check.Name)"
    Write-Output "   └─ $($check.Detail)"
    Write-Output ""
}

# Summary
$passCount = ($checks | Where-Object { $_.Status -eq "✅ PASS" }).Count
$warnCount = ($checks | Where-Object { $_.Status -eq "⚠️ WARN" }).Count
$failCount = ($checks | Where-Object { $_.Status -eq "❌ FAIL" }).Count

Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📊 Summary: $passCount passed, $warnCount warnings, $failCount failed"
Write-Output ""

if ($failCount -eq 0 -and $warnCount -eq 0) {
    Write-Output "🎉 Perfect! Configuration fully aligns with GitHub MCP documentation."
    Write-Output ""
    Write-Output "✅ Your setup matches:"
    Write-Output "   • Docker-based installation (recommended)"
    Write-Output "   • Dynamic toolsets enabled"
    Write-Output "   • Official image and proper flags"
    Write-Output "   • Secure PAT handling"
}
elseif ($failCount -eq 0) {
    Write-Output "✅ Good! Configuration aligns with minor warnings."
}
else {
    Write-Output "⚠️ Issues found. Review failed checks above."
}

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📖 Documentation Reference:"
Write-Output "   https://github.com/github/github-mcp-server#dynamic-tool-discovery"
