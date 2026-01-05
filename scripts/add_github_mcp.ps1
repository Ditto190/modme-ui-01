#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$path = "$env:APPDATA\Code\User\mcp.json"
if (-not (Test-Path $path)) {
    Write-Error "File not found: $path"
    exit 1
}

# Read and parse the JSON
$j = Get-Content $path -Raw | ConvertFrom-Json

# Add GitHub MCP server with Docker + dynamic toolsets
$githubServer = @{
    type    = "stdio"
    command = "docker"
    args    = @(
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "-e",
        "GITHUB_DYNAMIC_TOOLSETS=1"
        "ghcr.io/github/github-mcp-server"
    )
    env     = @{
        GITHUB_PERSONAL_ACCESS_TOKEN = "`${input:GITHUB_PERSONAL_ACCESS_TOKEN}"
    }
}

# Add the server to the servers object
$j.servers | Add-Member -MemberType NoteProperty -Name "github" -Value $githubServer -Force

# Add the input for GitHub PAT if not present
$patInputExists = $false
foreach ($input in $j.inputs) {
    if ($input.id -eq "GITHUB_PERSONAL_ACCESS_TOKEN") {
        $patInputExists = $true
        break
    }
}

if (-not $patInputExists) {
    $newInput = @{
        id          = "GITHUB_PERSONAL_ACCESS_TOKEN"
        type        = "promptString"
        description = "GitHub Personal Access Token (PAT) for authentication"
        password    = $true
    }
    $j.inputs += $newInput
}

# Save back to file
$j | ConvertTo-Json -Depth 20 | Set-Content $path -Force
Write-Output "✅ Added GitHub MCP server with Docker + Dynamic Toolsets"
Write-Output "📍 Updated: $path"
Write-Output ""
Write-Output "⚡ Configuration Details:"
Write-Output "  - Mode: Docker (stdio)"
Write-Output "  - Dynamic Toolsets: ENABLED"
Write-Output "  - Image: ghcr.io/github/github-mcp-server"
Write-Output ""
Write-Output "🔑 Next Steps:"
Write-Output "  1. Create a GitHub Personal Access Token at:"
Write-Output "     https://github.com/settings/tokens"
Write-Output "  2. Required scopes: repo, read:org, read:user"
Write-Output "  3. Restart VS Code to pick up the changes"
Write-Output "  4. When prompted, paste your GitHub PAT"
