<#
.SYNOPSIS
Download GitHub attestation files using the GitHub CLI (`gh`).

.DESCRIPTION
This helper wraps `gh attestation download` and provides:
- owner/repo inference from `git remote origin` if not provided
- output directory resolution
- dry-run mode

.EXAMPLE
# Download to ./attestations for current repo (inferred from git remote)
./scripts/gh-attestation-download.ps1 -OutDir .\attestations

# Specify owner and repo and run
./scripts/gh-attestation-download.ps1 -OutDir C:\temp\att -Owner Ditto190 -Repo modme-ui-01

# Dry run
./scripts/gh-attestation-download.ps1 -OutDir C:\temp\att -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(Position=0, HelpMessage="Output directory to write attestations.")]
    [string]$OutDir = ".",

    [Parameter(Position=1, HelpMessage="Repository owner (e.g. Ditto190)")]
    [string]$Owner = "",

    [Parameter(Position=2, HelpMessage="Repository name (e.g. modme-ui-01)")]
    [string]$Repo = "",

    [switch]$DryRun
)

function Get-RepoFromGit {
    try {
        $url = git config --get remote.origin.url 2>$null
        if (-not $url) { return $null }
        # match both SSH and HTTPS urls: git@github.com:owner/repo.git or https://github.com/owner/repo.git
        if ($url -match ":([^/]+)/([^/]+?)(?:\.git)?$" -or $url -match "/([^/]+)/([^/]+?)(?:\.git)?$") {
            return @{ owner = $Matches[1]; repo = $Matches[2] }
        }
        return $null
    } catch {
        return $null
    }
}

# Ensure gh exists
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "gh CLI not found. Install GitHub CLI (https://cli.github.com/) and authenticate (gh auth login)."
    exit 2
}

# Infer owner/repo if missing
if (-not $Owner -or -not $Repo) {
    $info = Get-RepoFromGit
    if ($info) {
        if (-not $Owner) { $Owner = $info.owner }
        if (-not $Repo)  { $Repo  = $info.repo }
    }
}

if (-not $Owner -or -not $Repo) {
    Write-Error "Missing repository information. Provide -Owner and -Repo or run inside a git repo with a remote 'origin'."
    exit 3
}

# Resolve output path
try {
    $resolved = Resolve-Path -LiteralPath $OutDir -ErrorAction SilentlyContinue
    if ($resolved) { $OutDirFull = $resolved.Path } else { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null; $OutDirFull = (Resolve-Path -LiteralPath $OutDir).Path }
} catch {
    Write-Error "Failed to resolve or create output directory: $OutDir -- $_"
    exit 4
}

# Build command
$argList = @('attestation','download',$OutDirFull,'--owner',$Owner,'--repo',$Repo)
$cmdText = "gh $($argList -join ' ')"

if ($DryRun) {
    Write-Output "Dry run: $cmdText"
    exit 0
}

Write-Output "Running: $cmdText"

$proc = Start-Process -FilePath gh -ArgumentList $argList -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) {
    Write-Error "gh exited with code $($proc.ExitCode)"
    exit $proc.ExitCode
}

Write-Output "Attestations downloaded to: $OutDirFull"
exit 0
