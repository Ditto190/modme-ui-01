#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Unified MCP Server Manager - Starts all available MCP servers
.DESCRIPTION
    Discovers and starts:
    - Scripts in .copilot/mcp-servers/
    - Python MCP servers in agent/
    - ChromaDB server
    - Configured servers from mcp_config.json
.PARAMETER Force
    Force restart even if already running
.PARAMETER Parallel
    Start servers in parallel (experimental)
.PARAMETER WaitForReady
    Wait for health checks on servers with ports
.PARAMETER Verbose
    Show detailed output
.EXAMPLE
    .\start-all-mcp-servers.ps1
.EXAMPLE
    .\start-all-mcp-servers.ps1 -Force -WaitForReady
#>

param(
    [switch]$Force,
    [switch]$Parallel,
    [switch]$WaitForReady,
    [switch]$Verbose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

# Root of repo (one level up from scripts)
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptRoot "..")
$LogDir = Join-Path $Root '.logs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

# Color output helpers
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Fail { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Detail { param($Message) if ($Verbose) { Write-Host "   $Message" -ForegroundColor DarkGray } }

# Server registry
$Servers = @()

Write-Host ""
Write-Host "🚀 MCP Server Manager" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 1. Discover .copilot/mcp-servers/ scripts
# ============================================================================
Write-Info "Scanning .copilot/mcp-servers/ for startup scripts..."
$McpDir = Join-Path $Root '.copilot\mcp-servers'
if (Test-Path $McpDir) {
    Get-ChildItem -Path $McpDir -File | Where-Object {
        $_.Extension -in @('.ps1', '.sh', '.bat', '.cmd', '.exe')
    } | ForEach-Object {
        $Servers += @{
            Name = "$($_.BaseName) (script)"
            Type = 'Script'
            Path = $_.FullName
            Extension = $_.Extension
            LogFile = Join-Path $LogDir "mcp-$($_.BaseName).log"
            Port = $null
        }
        Write-Detail "Found script: $($_.Name)"
    }
    Write-Success "Found $($Servers.Count) MCP startup scripts"
}
else {
    Write-Warning "Directory not found: $McpDir"
}

# ============================================================================
# 2. Discover Python MCP servers in agent/
# ============================================================================
Write-Info "Scanning agent/ for Python MCP servers..."
$AgentDir = Join-Path $Root 'agent'
if (Test-Path $AgentDir) {
    $pythonServersFound = 0
    Get-ChildItem -Path $AgentDir -Filter "*_mcp_server.py" -File | ForEach-Object {
        $serverName = $_.BaseName -replace '_mcp_server$', ''
        # Assign ports for known servers
        $port = switch ($_.Name) {
            'journal_mcp_server.py' { 8002 }
            default { $null }
        }

        $Servers += @{
            Name = "$serverName (Python MCP)"
            Type = 'PythonMCP'
            Path = $_.FullName
            LogFile = Join-Path $LogDir "mcp-$($_.BaseName).log"
            Port = $port
        }
        $pythonServersFound++
        Write-Detail "Found Python MCP: $($_.Name)$(if ($port) { " (port $port)" })"
    }
    if ($pythonServersFound -gt 0) {
        Write-Success "Found $pythonServersFound Python MCP servers"
    }
}
else {
    Write-Warning "Directory not found: $AgentDir"
}

# ============================================================================
# 3. ChromaDB Server
# ============================================================================
Write-Info "Checking for ChromaDB server..."
$ChromaScript = Join-Path $Root 'scripts\start_chroma_server.py'
if (Test-Path $ChromaScript) {
    $Servers += @{
        Name = 'chroma-db (HTTP)'
        Type = 'ChromaDB'
        Path = $ChromaScript
        LogFile = Join-Path $LogDir "mcp-chroma-db.log"
        Port = 8001
    }
    Write-Success "Found ChromaDB server (port 8001)"
}
else {
    Write-Detail "ChromaDB server script not found at: $ChromaScript"
}

# ============================================================================
# 4. Load mcp_config.json servers
# ============================================================================
Write-Info "Scanning for mcp_config.json files..."
$ConfigFiles = Get-ChildItem -Path $Root -Filter "mcp_config.json" -Recurse -File -ErrorAction SilentlyContinue
$configServersFound = 0
foreach ($ConfigFile in $ConfigFiles) {
    try {
        $Config = Get-Content $ConfigFile.FullName -Raw | ConvertFrom-Json
        if ($Config.mcpServers) {
            foreach ($ServerName in $Config.mcpServers.PSObject.Properties.Name) {
                $ServerConfig = $Config.mcpServers.$ServerName
                $Servers += @{
                    Name = "$ServerName (configured)"
                    Type = 'Configured'
                    Command = $ServerConfig.command
                    Args = $ServerConfig.args
                    LogFile = Join-Path $LogDir "mcp-$ServerName.log"
                    Port = $null
                }
                $configServersFound++
                Write-Detail "Found configured server: $ServerName from $($ConfigFile.FullName)"
            }
        }
    }
    catch {
        Write-Warning "Failed to parse $($ConfigFile.FullName): $_"
    }
}
if ($configServersFound -gt 0) {
    Write-Success "Found $configServersFound configured servers"
}

# ============================================================================
# 5. Load VS Code MCP servers (mcp.json in user directory)
# ============================================================================
Write-Info "Checking for VS Code MCP configuration..."
$VSCodeMcpPaths = @(
    "$env:APPDATA\Code\User\mcp.json",
    "$env:HOME/.config/Code/User/mcp.json",
    "$env:HOME/Library/Application Support/Code/User/mcp.json"
)

$vscodeServersFound = 0
foreach ($VSCodeMcpPath in $VSCodeMcpPaths) {
    if (Test-Path $VSCodeMcpPath) {
        Write-Detail "Found VS Code MCP config: $VSCodeMcpPath"
        try {
            $VSCodeConfig = Get-Content $VSCodeMcpPath -Raw | ConvertFrom-Json
            if ($VSCodeConfig.servers) {
                foreach ($ServerName in $VSCodeConfig.servers.PSObject.Properties.Name) {
                    $ServerConfig = $VSCodeConfig.servers.$ServerName

                    # Skip servers that require Docker (they're often already running)
                    $cmd = $null
                    if ($ServerConfig.PSObject.Properties['command']) {
                        $cmd = $ServerConfig.command
                    }

                    if ($cmd -eq 'docker') {
                        Write-Detail "Skipping Docker-based server: $ServerName (likely managed separately)"
                        continue
                    }

                    # Safely extract properties
                    $serverType = if ($ServerConfig.PSObject.Properties['type']) { $ServerConfig.type } else { 'unknown' }
                    $serverUrl = if ($ServerConfig.PSObject.Properties['url']) { $ServerConfig.url } else { $null }
                    $serverArgs = if ($ServerConfig.PSObject.Properties['args']) { $ServerConfig.args } else { @() }
                    $serverEnv = if ($ServerConfig.PSObject.Properties['env']) { $ServerConfig.env } else { $null }

                    # Skip HTTP-only servers (they can't be started locally)
                    if ($serverType -eq 'http' -and -not $cmd) {
                        Write-Detail "Skipping HTTP-only server: $ServerName (remote endpoint)"
                        continue
                    }

                    $Servers += @{
                        Name = "$ServerName (VS Code)"
                        Type = 'VSCodeMCP'
                        ServerType = $serverType
                        Command = $cmd
                        Args = $serverArgs
                        Url = $serverUrl
                        Env = $serverEnv
                        LogFile = Join-Path $LogDir "mcp-vscode-$ServerName.log"
                        Port = $null
                    }
                    $vscodeServersFound++
                    Write-Detail "Found VS Code MCP server: $ServerName ($serverType)"
                }
            }
        }
        catch {
            Write-Warning "Failed to parse $VSCodeMcpPath : $_"
        }
        break  # Only use first found config
    }
}

if ($vscodeServersFound -gt 0) {
    Write-Success "Found $vscodeServersFound VS Code MCP servers"
}
else {
    Write-Detail "No VS Code MCP configuration found"
}

Write-Host ""
Write-Host "📊 Total servers discovered: $($Servers.Count)" -ForegroundColor Cyan
Write-Host ""

if ($Servers.Count -eq 0) {
    Write-Warning "No MCP servers found. Nothing to start."
    exit 0
}

# ============================================================================
# Helper Functions
# ============================================================================

function Test-ServerRunning {
    param($Server)

    # Check by port if available
    if ($Server.Port) {
        try {
            $conn = Test-NetConnection -ComputerName localhost -Port $Server.Port -WarningAction SilentlyContinue -InformationLevel Quiet
            return $conn.TcpTestSucceeded
        }
        catch {
            return $false
        }
    }

    # Check by command line
    if ($Server.Path) {
        try {
            $escaped = [Regex]::Escape($Server.Path)
            $processes = Get-Process -ErrorAction SilentlyContinue | Where-Object {
                $_.ProcessName -in @('pwsh', 'powershell', 'python', 'pythonw', 'node', 'cmd')
            }

            foreach ($p in $processes) {
                try {
                    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" -ErrorAction Stop
                    if ($proc.CommandLine -and ($proc.CommandLine -match $escaped)) {
                        return $true
                    }
                }
                catch {
                    # Continue on per-process errors
                }
            }
        }
        catch {
            return $false
        }
    }

    return $false
}

function Start-ScriptServer {
    param($Server)

    $ext = $Server.Extension
    switch ($ext) {
        '.ps1' {
            Start-Process pwsh -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $Server.Path `
                -RedirectStandardOutput $Server.LogFile -RedirectStandardError $Server.LogFile -WindowStyle Hidden
        }
        '.sh' {
            if (Get-Command bash -ErrorAction SilentlyContinue) {
                Start-Process bash -ArgumentList $Server.Path `
                    -RedirectStandardOutput $Server.LogFile -RedirectStandardError $Server.LogFile -WindowStyle Hidden
            }
            elseif (Get-Command wsl -ErrorAction SilentlyContinue) {
                Start-Process wsl -ArgumentList "bash", $Server.Path `
                    -RedirectStandardOutput $Server.LogFile -RedirectStandardError $Server.LogFile -WindowStyle Hidden
            }
            else {
                throw "Bash not found. Install WSL or Git Bash."
            }
        }
        { $_ -in @('.bat', '.cmd') } {
            Start-Process cmd.exe -ArgumentList "/c", "`"$($Server.Path)`"" `
                -RedirectStandardOutput $Server.LogFile -RedirectStandardError $Server.LogFile -WindowStyle Hidden
        }
        '.exe' {
            Start-Process -FilePath $Server.Path `
                -RedirectStandardOutput $Server.LogFile -RedirectStandardError $Server.LogFile -WindowStyle Hidden
        }
        default {
            throw "Unsupported script extension: $ext"
        }
    }
}

function Start-PythonMCPServer {
    param($Server)

    $pythonCmd = if (Get-Command python -ErrorAction SilentlyContinue) { 'python' } else { 'python3' }

    # Check if we should use venv
    $venvPython = Join-Path $Root 'agent\.venv\Scripts\python.exe'
    if (Test-Path $venvPython) {
        $pythonCmd = $venvPython
        Write-Detail "Using venv Python: $venvPython"
    }

    $serverArgs = @($Server.Path)
    if ($Server.Port) {
        $serverArgs += @("--port", $Server.Port)
    }

    Start-Process $pythonCmd -ArgumentList $serverArgs `
        -RedirectStandardOutput $Server.LogFile -RedirectStandardError $Server.LogFile -WindowStyle Hidden
}

function Start-ChromaDBServer {
    param($Server)

    $pythonCmd = if (Get-Command python -ErrorAction SilentlyContinue) { 'python' } else { 'python3' }

    # Check if we should use venv
    $venvPython = Join-Path $Root 'agent\.venv\Scripts\python.exe'
    if (Test-Path $venvPython) {
        $pythonCmd = $venvPython
    }

    Start-Process $pythonCmd -ArgumentList $Server.Path, "--port", "8001" `
        -RedirectStandardOutput $Server.LogFile -RedirectStandardError $Server.LogFile -WindowStyle Hidden
}

function Start-ConfiguredServer {
    param($Server)

    $allArgs = $Server.Args -join ' '
    Start-Process $Server.Command -ArgumentList $allArgs `
        -RedirectStandardOutput $Server.LogFile -RedirectStandardError $Server.LogFile -WindowStyle Hidden
}

function Start-VSCodeMCPServer {
    param($Server)

    # Handle different VS Code MCP server types
    switch ($Server.ServerType) {
        'stdio' {
            # STDIO servers run as child processes
            if ($Server.Command -and $Server.Args) {
                # Simple approach: use Start-Process with output redirection
                $argString = if ($Server.Args -is [array]) {
                    $Server.Args -join ' '
                } else {
                    $Server.Args
                }

                Start-Process -FilePath $Server.Command `
                    -ArgumentList $argString `
                    -RedirectStandardOutput $Server.LogFile `
                    -RedirectStandardError $Server.LogFile `
                    -WindowStyle Hidden

                Write-Detail "Started STDIO server"
            }
            else {
                throw "No command specified for STDIO server"
            }
        }
        'http' {
            # HTTP servers are usually already running remotely
            Write-Info "HTTP server - URL: $($Server.Url)"
            throw "HTTP servers cannot be started locally (remote endpoint)"
        }
        default {
            throw "Unsupported VS Code MCP server type: $($Server.ServerType)"
        }
    }
}

# ============================================================================
# Main startup loop
# ============================================================================

$Started = 0
$Skipped = 0
$Failed = 0

foreach ($Server in $Servers) {
    Write-Host ""
    Write-Host "🔧 $($Server.Name)" -ForegroundColor Cyan

    # Check if already running
    if (-not $Force -and (Test-ServerRunning $Server)) {
        Write-Success "Already running"
        $Skipped++
        continue
    }

    try {
        $ErrorActionPreference = 'Stop'  # Force errors to be catchable
        
        switch ($Server.Type) {
            'Script' { 
                if (-not $Server.Extension) {
                    throw "Server missing Extension property"
                }
                Start-ScriptServer $Server 
            }
            'PythonMCP' { Start-PythonMCPServer $Server }
            'ChromaDB' { Start-ChromaDBServer $Server }
            'Configured' { Start-ConfiguredServer $Server }
            'VSCodeMCP' { Start-VSCodeMCPServer $Server }
            default { throw "Unknown server type: $($Server.Type)" }
        }

        Write-Success "Started successfully"
        Write-Detail "Logs: $($Server.LogFile)"
        $Started++

        # Optional: Wait for health check
        if ($WaitForReady -and $Server.Port) {
            Write-Info "Waiting for port $($Server.Port) to be ready..."
            $maxRetries = 30
            $retryCount = 0
            $ready = $false

            while ($retryCount -lt $maxRetries) {
                Start-Sleep -Seconds 1
                if (Test-ServerRunning $Server) {
                    Write-Success "Server is ready on port $($Server.Port)!"
                    $ready = $true
                    break
                }
                $retryCount++
                Write-Host "." -NoNewline
            }

            if (-not $ready) {
                Write-Warning "Server did not become ready within 30 seconds"
            }
            Write-Host ""
        }
    }
    catch {
        Write-Fail "Failed to start: $_"
        Write-Detail "Error details: $($_.Exception.Message)"
        Write-Detail "Check logs: $($Server.LogFile)"
        $Failed++
    }
    finally {
        $ErrorActionPreference = 'Continue'
    }
}

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📊 MCP Server Startup Summary" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Success "Started: $Started"
Write-Info "Already running: $Skipped"
if ($Failed -gt 0) { Write-Fail "Failed: $Failed" }
Write-Host ""
Write-Info "📁 Logs directory: $LogDir"
Write-Host ""

if ($Started -gt 0 -or $Skipped -gt 0) {
    Write-Success "MCP servers are ready!"
}

exit $(if ($Failed -gt 0) { 1 } else { 0 })
