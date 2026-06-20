$BinPath = Join-Path $PSScriptRoot ".tools\agenttrace.exe"

if (-not (Test-Path $BinPath)) {
    Write-Host "agenttrace.exe not found at $BinPath. Please run scripts\install-agenttrace.ps1" -ForegroundColor Red
    exit 1
}

& $BinPath @args
