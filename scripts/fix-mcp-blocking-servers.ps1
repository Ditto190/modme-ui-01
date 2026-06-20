# Fix MCP Blocking Servers
# This script removes or fixes problematic MCP servers that block GitHub Copilot Chats

$mcpConfigPath = "$env:APPDATA\Code\User\mcp.json"

Write-Host "🔧 Fixing MCP server configuration..." -ForegroundColor Cyan

# Backup the current config
$backupPath = "$mcpConfigPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $mcpConfigPath $backupPath -Force
Write-Host "✅ Backed up to: $backupPath" -ForegroundColor Green

# Read the current config
$config = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json

Write-Host "`n🗑️  Removing problematic servers..." -ForegroundColor Yellow

# Remove or comment out problematic servers
$serversToRemove = @(
    'nuxt-ui',  # Often times out
    'io.github.github/github-mcp-server'  # Duplicate GitHub server, use Docker version instead
)

$removed = @()
foreach ($serverName in $serversToRemove) {
    if ($config.servers.PSObject.Properties.Name -contains $serverName) {
        $config.servers.PSObject.Properties.Remove($serverName)
        $removed += $serverName
        Write-Host "  ❌ Removed: $serverName" -ForegroundColor Red
    }
}

# Keep the Docker-based GitHub server and other working servers
Write-Host "`n✅ Keeping these servers:" -ForegroundColor Green
foreach ($server in $config.servers.PSObject.Properties) {
    Write-Host "  ✓ $($server.Name)" -ForegroundColor Green
}

# Save the updated config
$config | ConvertTo-Json -Depth 10 | Set-Content $mcpConfigPath

Write-Host "`n✨ MCP configuration updated!" -ForegroundColor Cyan
Write-Host "`n📋 Summary:" -ForegroundColor White
Write-Host "  • Removed $($removed.Count) problematic server(s): $($removed -join ', ')" -ForegroundColor Yellow
Write-Host "  • Backup saved to: $backupPath" -ForegroundColor Gray
Write-Host "`n⚠️  Please restart VS Code for changes to take effect." -ForegroundColor Yellow
