#!/usr/bin/env pwsh
param()

Set-StrictMode -Version Latest

# Root of repo (one level up from scripts)
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptRoot "..")

$LogDir = Join-Path $Root '.logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$McpDir = Join-Path $Root '.copilot\mcp-servers'
if (-not (Test-Path $McpDir)) {
    Write-Host "No MCP servers directory found at: $McpDir`nCreate scripts there (e.g. start-agent.ps1) and re-run this script." -ForegroundColor Yellow
    exit 0
}

$started = 0

Write-Host "Scanning $McpDir for server start scripts..."

Get-ChildItem -Path $McpDir -File | ForEach-Object {
    $file = $_
    $name = $file.BaseName
    $ext = $file.Extension.ToLower()
    $full = $file.FullName
    $logFile = Join-Path $LogDir "mcp-$name.log"

    function Is-RunningByCmdline($path) {
        try {
            $escaped = [Regex]::Escape($path)
            $procs = Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.CommandLine -and ($_.CommandLine -match $escaped) }
            return ($procs | Measure-Object).Count -gt 0
        }
        catch {
            return $false
        }
    }

    if ($ext -eq '.ps1') {
        if (Is-RunningByCmdline $full) {
            Write-Host "Already running: $name"
        }
        else {
            Write-Host "Starting PowerShell script: $name"
            Start-Process -FilePath (Get-Command pwsh).Source -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$full" -RedirectStandardOutput $logFile -RedirectStandardError $logFile -WindowStyle Hidden | Out-Null
            $started++
        }
        return
    }

    if ($ext -in @('.bat', '.cmd')) {
        if (Is-RunningByCmdline $full) {
            Write-Host "Already running: $name"
        }
        else {
            Write-Host "Starting batch script: $name"
            Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "`"$full`"" -RedirectStandardOutput $logFile -RedirectStandardError $logFile -WindowStyle Hidden | Out-Null
            $started++
        }
        return
    }

    if ($ext -eq '.psm1') {
        # Module file: start via pwsh
        if (Is-RunningByCmdline $full) {
            Write-Host "Already running: $name"
        }
        else {
            Write-Host "Starting module file via pwsh: $name"
            Start-Process -FilePath (Get-Command pwsh).Source -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "& { Start-Job -ScriptBlock { . '$full' } | Out-Null }" -RedirectStandardOutput $logFile -RedirectStandardError $logFile -WindowStyle Hidden | Out-Null
            $started++
        }
        return
    }

    # Executable files (including .exe)
    if ($file.Mode -match 'x' -or $ext -eq '.exe') {
        if (Is-RunningByCmdline $full) {
            Write-Host "Already running: $name"
        }
        else {
            Write-Host "Starting executable: $name"
            Start-Process -FilePath $full -RedirectStandardOutput $logFile -RedirectStandardError $logFile -WindowStyle Hidden | Out-Null
            $started++
        }
        return
    }

    # Shell scripts (.sh) — try using bash if available
    if ($ext -eq '.sh') {
        $bash = Get-Command bash -ErrorAction SilentlyContinue
        if ($bash) {
            if (Is-RunningByCmdline $full) {
                Write-Host "Already running: $name"
            }
            else {
                Write-Host "Starting shell script with bash: $name"
                Start-Process -FilePath $bash.Source -ArgumentList "`"$full`"" -RedirectStandardOutput $logFile -RedirectStandardError $logFile -WindowStyle Hidden | Out-Null
                $started++
            }
        }
        else {
            Write-Host "Skipping .sh (no bash found): $name" -ForegroundColor DarkYellow
        }
        return
    }

    Write-Host "Skipping unknown file type: $($file.Name)" -ForegroundColor DarkGray
}

Write-Host "Done. Started $started MCP server(s). Logs are in: $LogDir"
