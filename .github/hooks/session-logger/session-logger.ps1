Param(
  [Parameter(Mandatory=$true)][ValidateSet('start','end','prompt')][string]$Action,
  [string]$SessionId,
  [string]$Message
)

$HookDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $HookDir "..\..\..").Path
$ConfigPath = Join-Path $HookDir 'config.json'
$Config = @{}
if (Test-Path $ConfigPath) { $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json }
$LogsDir = Join-Path $RepoRoot $Config.logsDir
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null }
$SessionLog = Join-Path $LogsDir 'session.log'
$PromptsLog = Join-Path $LogsDir 'prompts.log'

function Write-JsonLine($path, $obj) {
  $json = $obj | ConvertTo-Json -Depth 5 -Compress
  Add-Content -Path $path -Value $json
}

$timestamp = (Get-Date).ToString('o')

switch ($Action) {
  'start' {
    $id = if ($SessionId) { $SessionId } else { [guid]::NewGuid().ToString() }
    $cwd = (Get-Location).Path
    $tracked = $Config.trackedFiles | ForEach-Object { Join-Path $RepoRoot $_ }
    $entry = @{ event = 'sessionStart'; id = $id; timestamp = $timestamp; cwd = $cwd; trackedFiles = $tracked }
    Write-JsonLine -path $SessionLog -obj $entry
    Write-Output "Started session $id"
  }
  'end' {
    $id = if ($SessionId) { $SessionId } else { '' }
    $cwd = (Get-Location).Path
    $entry = @{ event = 'sessionEnd'; id = $id; timestamp = $timestamp; cwd = $cwd }
    Write-JsonLine -path $SessionLog -obj $entry
    Write-Output "Ended session $id"
  }
  'prompt' {
    if (-not $Message) { Write-Error 'Message required for prompt action'; exit 1 }
    $entry = @{ event = 'prompt'; sessionId = $SessionId; timestamp = $timestamp; message = $Message }
    Write-JsonLine -path $PromptsLog -obj $entry
    Write-Output "Logged prompt"
  }
}
