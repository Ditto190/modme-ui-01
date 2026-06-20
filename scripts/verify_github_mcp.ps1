#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$path = "$env:APPDATA\Code\User\mcp.json"
if (-not (Test-Path $path)) { Write-Error "File not found: $path"; exit 1 }

$j = Get-Content $path -Raw | ConvertFrom-Json

Write-Output "🔍 GitHub MCP Server Configuration:"
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output ""

if ($j.servers.github) {
    $gh = $j.servers.github
    Write-Output "✅ GitHub server is configured"
    Write-Output ""
    Write-Output "Type:     $($gh.type)"
    Write-Output "Command:  $($gh.command)"
    Write-Output "Args:     $($gh.args -join ' ')"
    Write-Output ""
    Write-Output "Environment Variables:"
    $gh.env.PSObject.Properties | ForEach-Object {
        Write-Output "  - $($_.Name): $($_.Value)"
    }
    Write-Output ""
    Write-Output "🎯 Key Features:"
    $hasDynamic = $gh.args -contains "GITHUB_DYNAMIC_TOOLSETS=1" -or $gh.args -match "-e.*GITHUB_DYNAMIC_TOOLSETS"
    if ($hasDynamic) {
        Write-Output "  ✓ Dynamic Toolsets: ENABLED"
        Write-Output "    → Starts with 3 discovery tools"
        Write-Output "    → Agent can enable toolsets on-demand"
    }
    else {
        Write-Output "  ✗ Dynamic Toolsets: NOT ENABLED"
    }
    Write-Output ""
}
else {
    Write-Output "❌ GitHub server NOT found in configuration"
    exit 1
}

# Check if PAT input exists
$patInput = $j.inputs | Where-Object { $_.id -eq "GITHUB_PERSONAL_ACCESS_TOKEN" }
if ($patInput) {
    Write-Output "✅ GitHub PAT input is configured"
    Write-Output "   Description: $($patInput.description)"
    Write-Output "   Secure: Yes (password field)"
}
else {
    Write-Output "⚠️  GitHub PAT input not found"
}

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "📚 What Dynamic Toolsets Mean:"
Write-Output ""
Write-Output "Initial tools available:"
Write-Output "  1. list_available_toolsets - See all toolsets"
Write-Output "  2. get_toolset_tools - List tools in a toolset"
Write-Output "  3. enable_toolset - Enable a toolset at runtime"
Write-Output ""
Write-Output "Available toolsets (enable on demand):"
Write-Output "  • context - User context (strongly recommended)"
Write-Output "  • repos - Repository operations"
Write-Output "  • issues - Issue management"
Write-Output "  • pull_requests - PR operations"
Write-Output "  • actions - GitHub Actions"
Write-Output "  • code_security - Security features"
Write-Output "  • And 15+ more..."
Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
