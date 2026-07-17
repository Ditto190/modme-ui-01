<#
.SYNOPSIS
Watches the Obsidian inbox funnel and triggers the intake orchestrator
when a qualifying note lands. Dry-run by default; pass -Live for real upserts.

Decision record: next-forge/docs/adr/0013-obsidian-intake-trigger-and-session-gates.md
Promotion rule mirrors next-forge/packages/schemas/intake-gates.ts (shouldPromoteNote);
if the rule changes, change both.

.EXAMPLE
pwsh scripts/obsidian-intake-trigger.ps1              # watch, dry-run orchestrator
pwsh scripts/obsidian-intake-trigger.ps1 -Once        # single scan pass, then exit
pwsh scripts/obsidian-intake-trigger.ps1 -Live        # real Supabase upserts
#>
[CmdletBinding()]
param(
    [string]$InboxPath = (Join-Path $PSScriptRoot "..\GenerativeUI_monorepo\docs\inbox"),
    [ValidateSet("session", "ci")]
    [string]$Mode = "session",
    [switch]$Live,
    [switch]$Once,
    [int]$DebounceSeconds = 15
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$StateDir = Join-Path $RepoRoot "logs\obsidian-intake-trigger"
$LockFile = Join-Path $StateDir "watcher.lock"
$LastRunFile = Join-Path $StateDir "last-run.json"
$PromotionTag = "intake/ready"

if (-not (Test-Path $InboxPath)) {
    throw "Inbox funnel not found at '$InboxPath'. Is the ModMe-Vault junction healthy? See docs/obsidian-sidecar-setup.md"
}
$InboxPath = (Resolve-Path $InboxPath).Path
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

function Test-StaleLock {
    if (-not (Test-Path $LockFile)) { return $false }
    $lockPid = Get-Content $LockFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($lockPid -and (Get-Process -Id $lockPid -ErrorAction SilentlyContinue)) {
        return $true
    }
    Write-Host "Reclaiming stale lock (pid $lockPid no longer running)"
    Remove-Item $LockFile -Force
    return $false
}

if (Test-StaleLock) {
    Write-Host "Another watcher instance is alive; exiting."
    exit 0
}
Set-Content -Path $LockFile -Value $PID

function Get-Frontmatter {
    param([string]$Path)
    $raw = Get-Content $Path -Raw -ErrorAction SilentlyContinue
    if (-not $raw -or -not $raw.StartsWith("---")) { return $null }
    $end = $raw.IndexOf("`n---", 3)
    if ($end -lt 0) { return $null }
    $block = $raw.Substring(3, $end - 3)
    $fm = @{ tags = @(); severity = "medium"; pipeline_ready = $false }
    foreach ($line in $block -split "`n") {
        if ($line -match '^\s*severity:\s*(\S+)') { $fm.severity = $Matches[1].Trim() }
        elseif ($line -match '^\s*pipeline_ready:\s*true') { $fm.pipeline_ready = $true }
        elseif ($line -match '^\s*tags:\s*\[(.*)\]') {
            $fm.tags = $Matches[1] -split "," | ForEach-Object { $_.Trim().Trim('"', "'", "#") }
        }
    }
    return $fm
}

function Test-Promotion {
    param($Frontmatter)
    if ($null -eq $Frontmatter) { return $false }
    if ($Frontmatter.pipeline_ready) { return $true }
    if ($Frontmatter.severity -in @("high", "critical")) { return $true }
    return $Frontmatter.tags -contains $PromotionTag
}

function Get-QualifyingHashes {
    $hashes = @()
    foreach ($file in Get-ChildItem $InboxPath -Filter *.md -File) {
        if (Test-Promotion (Get-Frontmatter $file.FullName)) {
            $hashes += (Get-FileHash $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }
    return $hashes
}

function Get-TriggerSetHash {
    param([string[]]$Hashes)
    $canonical = ($Hashes | Sort-Object -Unique) -join "`n"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($canonical)
    $digest = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    return ([System.BitConverter]::ToString($digest) -replace "-").ToLowerInvariant()
}

function Invoke-IntakeRun {
    $hashes = Get-QualifyingHashes
    if ($hashes.Count -eq 0) {
        Write-Host "No qualifying notes; skipping."
        return
    }
    $triggerKey = Get-TriggerSetHash $hashes
    if (Test-Path $LastRunFile) {
        $last = Get-Content $LastRunFile -Raw | ConvertFrom-Json
        if ($last.trigger_key -eq $triggerKey -and $last.status -eq "completed") {
            Write-Host "Trigger set unchanged since last completed run; converged, skipping."
            return
        }
    }

    $orchestratorArgs = @((Join-Path $RepoRoot "scripts\intake-orchestrator.mjs"), "--mode=$Mode")
    if (-not $Live) { $orchestratorArgs += "--dry-run" }

    @{ trigger_key = $triggerKey; status = "started"; pid = $PID; started_at = (Get-Date -Format o) } |
        ConvertTo-Json | Set-Content $LastRunFile

    Write-Host "Invoking orchestrator (mode=$Mode live=$($Live.IsPresent), $($hashes.Count) qualifying notes)"
    & node @orchestratorArgs
    $exit = $LASTEXITCODE

    @{ trigger_key = $triggerKey; status = ($exit -eq 0 ? "completed" : "failed"); pid = $PID; finished_at = (Get-Date -Format o); exit_code = $exit } |
        ConvertTo-Json | Set-Content $LastRunFile
    if ($exit -ne 0) { Write-Warning "Orchestrator exited $exit" }
}

try {
    if ($Once) {
        Invoke-IntakeRun
        exit 0
    }

    Write-Host "Watching $InboxPath (debounce ${DebounceSeconds}s, live=$($Live.IsPresent)). Ctrl+C to stop."
    $watcher = [System.IO.FileSystemWatcher]::new($InboxPath, "*.md")
    $watcher.IncludeSubdirectories = $false
    $watcher.EnableRaisingEvents = $true

    while ($true) {
        $changed = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 5000)
        if ($changed.TimedOut) { continue }
        Write-Host "Change detected ($($changed.Name)); debouncing ${DebounceSeconds}s..."
        Start-Sleep -Seconds $DebounceSeconds
        # Drain the burst: the trigger-set hash absorbs everything that landed meanwhile.
        Invoke-IntakeRun
    }
}
finally {
    if ((Test-Path $LockFile) -and ((Get-Content $LockFile | Select-Object -First 1) -eq "$PID")) {
        Remove-Item $LockFile -Force
    }
}
