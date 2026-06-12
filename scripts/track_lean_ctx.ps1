<#
.SYNOPSIS
Tracks and logs lean-ctx savings metrics.

.DESCRIPTION
This script executes 'lean-ctx gain --wrapped', extracts the metrics, and appends them
to a CSV ledger file. This enables historical tracking of token and cost savings.

.EXAMPLE
.\track_lean_ctx.ps1
#>

$MetricsDir = "$PSScriptRoot\..\metrics"
$LogFile = "$MetricsDir\lean_ctx_savings.csv"

# Ensure metrics directory exists
if (-not (Test-Path $MetricsDir)) {
    New-Item -ItemType Directory -Path $MetricsDir | Out-Null
}

# Initialize CSV headers if file does not exist
if (-not (Test-Path $LogFile)) {
    "Timestamp,TokensSaved,CostAvoided,Commands,CompressionRatio" | Out-File -FilePath $LogFile -Encoding utf8
}

Write-Host "Fetching lean-ctx gain metrics..."
$GainOutput = lean-ctx gain --wrapped 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed to execute lean-ctx gain. Is lean-ctx installed and on the PATH?"
    exit $LASTEXITCODE
}

# The wrapped output looks roughly like this:
#   8.0K            $0.02           24
#   tokens saved    cost avoided    commands
#
#   2               63.1%           1 Wh
#   sessions        compression     energy saved

$TokensSaved = "0"
$CostAvoided = "$0"
$Commands = "0"
$Compression = "0%"

# Very basic regex parsing of the wrapped text output
# We join all lines into a single block to make pattern matching easier
$FullText = $GainOutput -join "`n"

if ($FullText -match "(?s)│\s+([\d\.]+K?)\s+(`$[\d\.]+)\s+(\d+)\s+│\s+│\s+tokens saved\s+cost avoided\s+commands") {
    $TokensSaved = $matches[1]
    $CostAvoided = $matches[2]
    $Commands = $matches[3]
}

if ($FullText -match "(?s)│\s+(\d+)\s+([\d\.]+[%])\s+([\d\.]+ Wh)\s+│\s+│\s+sessions\s+compression\s+energy saved") {
    $Compression = $matches[2]
}

$Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$CsvLine = "$Timestamp,$TokensSaved,$CostAvoided,$Commands,$Compression"

Write-Host "Recorded Metric: $CsvLine"
$CsvLine | Out-File -FilePath $LogFile -Append -Encoding utf8

Write-Host "Metrics successfully appended to $LogFile"
