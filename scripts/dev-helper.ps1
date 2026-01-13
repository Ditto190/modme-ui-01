<#
Dev helper for PowerShell terminals.
- Enables PSReadLine suggestions
- Adds a friendly prompt with git branch
- Provides searchable helpers and fuzzy command lookup
- Adds a few useful aliases
#>

# --- PSReadLine / suggestions ---
if (Get-Module -ListAvailable -Name PSReadLine) {
    Import-Module PSReadLine -ErrorAction SilentlyContinue
    try {
        Set-PSReadLineOption -PredictionSource HistoryAndPlugin -PredictionViewStyle ListView -MaximumHistoryCount 4096 -EditMode Windows
    }
    catch {
        Set-PSReadLineOption -PredictionSource History -PredictionViewStyle Inline -MaximumHistoryCount 4096
    }
    try { Set-PSReadLineKeyHandler -Key Tab -Function Complete } catch { }
}

# --- Helpful aliases (non-destructive) ---
Set-Alias ll Get-ChildItem
function la { Get-ChildItem -Force }
Set-Alias gs Get-Service
Set-Alias gp Get-Process
Set-Alias c Clear-Host
Set-Alias h Get-History
Set-Alias vscode code

# --- Find / explain commands for learners ---
function Find-Command {
    param([string]$Term)
    if (-not $Term) { Get-Command | Select-Object -First 50 Name, CommandType, Module | Format-Table -AutoSize; return }
    Get-Command -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match $Term -or ($_.Module -and $_.Module -match $Term) } |
    Select-Object Name, CommandType, Module |
    Sort-Object Name |
    Format-Table -AutoSize
}

function Explain {
    param([Parameter(Mandatory = $true)][string]$Command)
    try {
        Get-Help $Command -Full -ErrorAction Stop
    }
    catch {
        Write-Host "Local help not found. Opening online help (if available)..." -ForegroundColor Yellow
        try { Get-Help $Command -Online } catch { Write-Host "No online help available." -ForegroundColor Red }
    }
}

# --- Quick code / text search (like ripgrep but pure PS) ---
function Search-Files {
    param(
        [Parameter(Mandatory = $true)][string]$Pattern,
        [string]$Path = '.'
    )
    Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
    Select-String -Pattern $Pattern -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object Path, LineNumber, Line
}

Set-Alias sf Search-Files

# --- Nice prompt showing cwd and git branch (if present) ---
function Get-GitBranch {
    try {
        $b = git rev-parse --abbrev-ref HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and $b) { $b.Trim() } else { $null }
    }
    catch { $null }
}

function prompt {
    $cwd = Split-Path -Leaf -Path (Get-Location)
    $branch = Get-GitBranch
    if ($branch) { "$cwd [$branch]> " } else { "$cwd> " }
}

# --- Open a file in the preferred editor (EDITOR env, then code, then notepad) ---
function Open-File {
    param([Parameter(Mandatory = $true, ValueFromPipeline = $true)][string]$Path)

    if (-not (Test-Path $Path)) { Write-Host "Not found: $Path" -ForegroundColor Red; return }

    if ($env:EDITOR) {
        & $env:EDITOR $Path
        return
    }

    # Prefer VS Code if available
    try {
        $codePath = (Get-Command code -ErrorAction SilentlyContinue).Source
        if ($codePath) { code $Path; return }
    }
    catch { }

    # Fallback to notepad
    notepad $Path
}

# --- Argument completer for Open-File (file paths) ---
Register-ArgumentCompleter -Native -CommandName Open-File -ParameterName Path -ScriptBlock {
    param($commandName, $parameterName, $wordToComplete, $commandAst, $fakeBoundParameter)
    Get-ChildItem -Path "$wordToComplete*" -File -Name -ErrorAction SilentlyContinue |
    ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
}

# --- Friendly tips shown on first load (only once per session) ---
if (-not (Get-Variable -Name _DevHelperSeen -Scope Global -ErrorAction SilentlyContinue)) {
    $global:_DevHelperSeen = $true
    Write-Host "Dev helper loaded: use 'Find-Command', 'Explain <cmd>', 'sf <pattern>'" -ForegroundColor Cyan
    Write-Host "PSReadLine suggestions enabled (Tab to complete, suggestions shown automatically)." -ForegroundColor DarkCyan
}
